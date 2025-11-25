import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

// 您的 Model 组件 (已合并同事的 `isDraggable` 和您自己的 `isFillModeActive` 逻辑)
const Model = forwardRef(({
  modelPath,
  texturePath,
  position = [0, 0, 0],
  dimensions = { length: 1, width: 1, height: 1 },
  color = 'Black',
  polish, // <-- 1. 添加 polish prop
  isMultiTextureBase = false, // <-- 2. 添加新 prop 以激活新逻辑
  onLoad,
  onDimensionsChange,
  isFillModeActive,
  onFillClick,
  isDraggable = false,
  onSelect, // 新增：选择回调
  isSelected = false, // 新增：选中状态
}, ref) => {
  const meshRef = useRef();
  const sceneObjectRef = useRef(null);
  const { scene } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

  // --- 3. 为9-mesh底座添加的状态 ---
  const [multiTextureParts, setMultiTextureParts] = useState({
    surfaceA: null,
    surfaceB_meshes: [],
    surfaceC_meshes: []
  });
  const [baseTextures, setBaseTextures] = useState({
    polished: null,
    sandblasted: null,
    natural: null
  });
  // 使用 ref 避免在每次渲染时都创建新的 Loader
  const textureLoaderRef = useRef(new THREE.TextureLoader());

  useImperativeHandle(ref, () => ({
    getMesh: () => meshRef.current,
    getDimensions: () => originalDimensions
  }));

  // --- 4. 新增：加载底座所需的三种贴图 ---
  useEffect(() => {
    // 【修改】: 此逻辑现在由 isMultiTextureBase 触发，碑体和底座都使用
    if (!isMultiTextureBase) return;

    // 根据 'color' prop 映射到你的贴图文件夹名称
    // 我假设 'Black' 颜色对应 'Rustic' 文件夹
    const colorFolderMap = {
      'Bahama Blue': 'Bahama Blue',
      'Black': 'Black',
      'Blue Pearl': 'Blue Pearl',
      'Charcoal': 'Charcoal',
      'Grey': 'Grey',
      'Ocean Green': 'Ocean Green',
      'Paradiso': 'Paradiso',
      'PG red': 'PG red',
      'Pink': 'Pink',
      'Rustic Mahgoany': 'Rustic Mahgoany'
    };
    const colorFolder = colorFolderMap[color] || 'Rustic'; // 默认回退到 Rustic

    const loadTexture = (name) => {
      const tex = textureLoaderRef.current.load(
        `/textures/Bases/${colorFolder}/${name}.jpg`,
        (t) => {
          t.flipY = false;
          // t.encoding = THREE.sRGBEncoding; // 在较新r3f版本中，让r3f自动处理
          t.wrapS = THREE.RepeatWrapping; // 关键：允许重复
          t.wrapT = THREE.RepeatWrapping; // 关键：允许重复
        }
      );
      return tex;
    };

    // 加载你提到的三种贴图文件
    setBaseTextures({
      polished: loadTexture('磨光'),
      sandblasted: loadTexture('扫砂'),
      natural: loadTexture('自然')
    });

    // 清理函数：当 color 改变时，释放旧的贴图
    return () => {
      setBaseTextures(prev => {
        Object.values(prev).forEach(t => t?.dispose());
        return { polished: null, sandblasted: null, natural: null };
      });
    };
  }, [isMultiTextureBase, color]); // 当 color 改变时重新加载


  // --- 5. 修改：模型加载与部件分离 ---
  useEffect(() => {
    let isMounted = true;
    let currentSceneObject = null;
    setHasReportedDimensions(false);

    const loadModel = async () => {
      try {
        // ... (清理旧模型 ... 保持不变)
        if (sceneObjectRef.current && scene) {
          scene.remove(sceneObjectRef.current);
          sceneObjectRef.current.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                  });
                } else {
                  if (child.material.map) child.material.map.dispose();
                  child.material.dispose();
                }
              }
            }
          });
          sceneObjectRef.current = null;
        }

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        if (!isMounted) return;

        const clonedScene = gltf.scene.clone();
        clonedScene.position.set(position[0], position[1], position[2]);

        scene.add(clonedScene);
        sceneObjectRef.current = clonedScene;
        currentSceneObject = clonedScene;

        if (meshRef.current !== clonedScene) {
          meshRef.current = clonedScene;
        }

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const originalDims = { length: size.x, width: size.y, height: size.z };
        if (!isMounted) return;
        setOriginalDimensions(originalDims);

        if (onDimensionsChange && !hasReportedDimensions &&
          (dimensions.length === 0 || dimensions.width === 0 || dimensions.height === 0)) {
          onDimensionsChange(originalDims);
          setHasReportedDimensions(true);
        }

        // --- 关键修改：应用贴图的逻辑 ---
        if (isMultiTextureBase) {
          // **新逻辑：分离部件**
          const parts = { surfaceA: null, surfaceB_meshes: [], surfaceC_meshes: [] };
          clonedScene.traverse((child) => {
            if (child.isMesh) {
              // 必须克隆材质，否则所有部件都会共享同一个材质实例
              child.material = child.material.clone();
              child.material.roughness = 0.1;
              child.material.metalness = 0.0;
              child.material.needsUpdate = true;

              const name = child.name;
              // 【V_MODIFICATION】: 修改匹配逻辑以包含 'surfaceB' 和 'surfaceC'
              if (name === 'surfaceA') {
                parts.surfaceA = child;
              } else if (name.startsWith('surfaceB')) { // 匹配 'surfaceB' (碑) 和 'surfaceB_' (底座)
                parts.surfaceB_meshes.push(child);
              } else if (name.startsWith('surfaceC')) { // 匹配 'surfaceC' (碑) 和 'surfaceC_' (底座)
                parts.surfaceC_meshes.push(child);
              }
            }
          });
          if (isMounted) setMultiTextureParts(parts);
        } else {
          // **旧逻辑：应用单个贴图** (用于花瓶等)
          const textureLoader = new THREE.TextureLoader();
          clonedScene.traverse((child) => {
            if (child.isMesh) {
              textureLoader.load(texturePath, (texture) => {
                if (!isMounted) return;
                texture.colorSpace = THREE.SRGBColorSpace;
                child.material = new THREE.MeshStandardMaterial({
                  map: texture,
                  roughness: 0.7,
                  metalness: 0.1
                });
              }, undefined, () => {
                if (!isMounted) return;
                child.material = new THREE.MeshStandardMaterial({
                  color: getColorValue(color),
                  roughness: 0.7,
                  metalness: 0.1
                });
              });
            }
          });
        }
        // --- 结束修改 ---

        if (!isMounted) return;
        setModel(clonedScene);
        if (onLoad) onLoad(clonedScene);
      } catch (err) {
        console.error(`Failed to load model: ${modelPath}`, err);
        if (isMounted) setError(true);
      }
    };

    loadModel();

    // Cleanup函数
    return () => {
      isMounted = false;
      if (currentSceneObject && scene) {
        scene.remove(currentSceneObject);
        currentSceneObject.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat.map) mat.map.dispose();
                  mat.dispose();
                });
              } else {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
              }
            }
          }
        });
      }
      if (sceneObjectRef.current && scene) {
        scene.remove(sceneObjectRef.current);
        sceneObjectRef.current = null;
      }
    };
  }, [modelPath, color, texturePath, scene]); // 移除position和onDimensionsChange等，避免不必要的重新加载



  // --- 6. 新增：应用动态贴图 ---
  useEffect(() => {
    // 仅当是底座、加工方式已定义、贴图已加载、部件已分离时运行
    if (!isMultiTextureBase || !polish || !baseTextures.polished || !multiTextureParts.surfaceA) {
      return;
    }

    const { surfaceA, surfaceB_meshes, surfaceC_meshes } = multiTextureParts;
    const { polished, sandblasted, natural } = baseTextures;

    // 【V_MODIFICATION】: 引入基于 modelPath 的逻辑分支
    let texA, texB_group, texC_group;

    const isBaseModel = modelPath === "/models/Bases/Base.glb";

    if (isBaseModel) {
      // --- 1. 现有的底座 (Base) 逻辑 ---
      // 映射逻辑：'PT' 用 扫砂，其他 ('P5', 'PM2' 等) 用 磨光
      // 顶面 (A) 总是 磨光 (pg)
      texA = polished;
      // 上侧面 (B) 根据加工方式变化
      texB_group = (polish === 'PT') ? natural : polished;
      // 下侧面 (C) 总是 自然 (zr)
      texC_group = (polish === 'P5') ? polished : natural;
    } else {
      // --- 2. 新的碑体 (Monument) 逻辑 ---
      // P2：surfaceA(正/背) = 磨光, surfaceB(侧) = 自然, surfaceC(顶) = 自然
      // P3：surfaceA(正/背) = 磨光, surfaceB(侧) = 自然, surfaceC(顶) = 磨光
      // P5：surfaceA(正/背) = 磨光, surfaceB(侧) = 磨光, surfaceC(顶) = 磨光
      switch (polish) {
        case 'P2':
          texA = polished;
          texB_group = natural;
          texC_group = natural;
          break;
        case 'P3':
          texA = polished;
          texB_group = natural;
          texC_group = polished;
          break;
        case 'P5':
          texA = polished;
          texB_group = polished;
          texC_group = polished;
          break;
        default:
          // 默认回退到 P2
          texA = polished;
          texB_group = natural;
          texC_group = natural;
          break;
      }
    }
    // --- 结束逻辑分支 ---


    // 应用贴图 (必须克隆，防止共享)
    if (surfaceA) {
      surfaceA.material.map = texA.clone();
      surfaceA.material.map.needsUpdate = true;
      surfaceA.material.needsUpdate = true;
    }
    surfaceB_meshes.forEach(mesh => {
      mesh.material.map = texB_group.clone();
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    });
    surfaceC_meshes.forEach(mesh => {
      mesh.material.map = texC_group.clone();
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    });

  }, [isMultiTextureBase, polish, baseTextures, multiTextureParts, modelPath]); // 【V_MODIFICATION】: 添加 modelPath 到依赖



  // --- 7. 修改：应用缩放 (Dimensions) ---
  useLayoutEffect(() => {
    // ... (此函数保持不变)
    const currentModel = sceneObjectRef.current || model;
    if (currentModel && position) {
      currentModel.position.set(position[0], position[1], position[2]);
      if (meshRef.current !== currentModel) {
        meshRef.current = currentModel;
      }
    }
  }, [position, model]);

  useEffect(() => {
    if (meshRef.current && originalDimensions) {
      // 检查0以避免NaN
      const scaleX = originalDimensions.length === 0 ? 1 : dimensions.length / originalDimensions.length;
      const scaleY = originalDimensions.height === 0 ? 1 : dimensions.height / originalDimensions.height;
      const scaleZ = originalDimensions.width === 0 ? 1 : dimensions.width / originalDimensions.width;
      meshRef.current.scale.set(scaleX, scaleY, scaleZ);
    }
  }, [dimensions, originalDimensions]);




  // --- 8. 新增：防拉伸 (Anti-Stretch) 逻辑 ---
  useFrame(() => {
    // 仅为底座执行此逻辑
    if (!isMultiTextureBase || !meshRef.current || !multiTextureParts.surfaceA) {
      return;
    }

    const { surfaceA, surfaceB_meshes, surfaceC_meshes } = multiTextureParts;
    const scale = meshRef.current.scale;
    const sx = scale.x; // 对应 4.html 的 sx (length)
    const sy = scale.y; // 对应 4.html 的 sy (height)
    const sz = scale.z; // 对应 4.html 的 sz (width)

    // 【V_MODIFICATION】: 引入基于 modelPath 的逻辑分支
    const isBaseModel = modelPath === "/models/Bases/Base.glb";

    if (isBaseModel) {
      // --- 1. 现有的底座 (Base) 逻辑 ---
      // 辅助函数，来自 4.html
      const applyScale = (mesh) => {
        if (!mesh || !mesh.material.map) return;
        const map = mesh.material.map;
        const name = mesh.name;

        // (Three.js Y-up 坐标系)
        // 名字包含 'front' 或 'back' 的面 (X-Y 平面) -> 贴图重复 sx, sy
        if (name.includes('_front') || name.includes('_back')) {
          map.repeat.set(sx, sy);
          map.offset.set((1 - sx) / 2, (1 - sy) / 2);
        }
        // 名字包含 'left' 或 'right' 的面 (Y-Z 平面) -> 贴图重复 sz, sy
        else if (name.includes('_left') || name.includes('_right')) {
          map.repeat.set(sz, sy);
          map.offset.set((1 - sz) / 2, (1 - sy) / 2);
        }
      };

      // --- A (顶面) ---
      if (surfaceA && surfaceA.material.map) {
        const mapA = surfaceA.material.map;
        // 顶面 (X-Z 平面) -> 贴图重复 sx, sz
        mapA.repeat.set(sx, sz);
        mapA.offset.set((1 - sx) / 2, (1 - sz) / 2);
      }
      // --- B (上侧面) 组 ---
      surfaceB_meshes.forEach(applyScale);
      // --- C (下侧面) 组 ---
      surfaceC_meshes.forEach(applyScale);

    } else {
      // --- 2. 新的碑体 (Monument) 逻辑 ---
      // 碑体: A = 正/背面, B = 侧面, C = 顶面
      // A (正/背面) -> (X-Y 平面) -> 贴图重复 sx, sy
      if (surfaceA && surfaceA.material.map) {
        surfaceA.material.map.repeat.set(sx, sy);
        surfaceA.material.map.offset.set((1 - sx) / 2, (1 - sy) / 2);
      }
      // B (侧面) -> (Y-Z 平面) -> 贴图重复 sz, sy
      surfaceB_meshes.forEach(mesh => {
        if (mesh && mesh.material.map) {
          mesh.material.map.repeat.set(sz, sy);
          mesh.material.map.offset.set((1 - sz) / 2, (1 - sy) / 2);
        }
      });
      // C (顶面) -> (X-Z 平面) -> 贴图重复 sx, sz
      surfaceC_meshes.forEach(mesh => {
        if (mesh && mesh.material.map) {
          mesh.material.map.repeat.set(sx, sz);
          mesh.material.map.offset.set((1 - sx) / 2, (1 - sz) / 2);
        }
      });
    }
  });


  if (error) {
    return (
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}>
          <div>Model Error</div>
        </Html>
      </mesh>
    );
  }

  if (!model) {
    return (
      <mesh position={position} scale={[0.5, 0.5, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" transparent opacity={0.3} />
      </mesh>
    );
  }

  const ModelComponent = (
    <primitive
      ref={meshRef}
      object={model}
      // --- 您的填充逻辑 (保持不变) ---
      onPointerDown={(e) => {
        if (isFillModeActive) {
          e.stopPropagation();
          if (onFillClick) {
            onFillClick();
          }
        } else if (onSelect) {
          onSelect(); // 新增：触发选择回调
        }
      }}
    />
  );

  // --- 合并：同时支持 isDraggable (来自同事) 和 ModelComponent (来自您) ---
  return isDraggable ? (
    <TransformControls object={meshRef} mode="translate">
      {ModelComponent}
    </TransformControls>
  ) : ModelComponent;
});

export default Model;