import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, Suspense, useLayoutEffect, useCallback, useMemo } from 'react';
// --- 合并点：添加了 useFrame ---
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// --- 合并点：添加了 Text3D, FontLoader, TextGeometry ---
import { Text3D } from '@react-three/drei';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { extend } from '@react-three/fiber';

// --- 合并点：扩展 TextGeometry ---
extend({ TextGeometry });

// --- 辅助函数： Flood Fill (保持不变) ---
const floodFill = (context, canvas, originalImageData, canvasTexture, startX, startY, newColor) => {
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const originalData = originalImageData.data;

  const getPixelIndex = (x, y) => (y * width + x) * 4;

  const isPixelLine = (idx) => {
    return originalData[idx] < 100 &&
      originalData[idx + 1] < 100 &&
      originalData[idx + 2] < 100 &&
      originalData[idx + 3] > 10;
  };

  const startIdx = getPixelIndex(startX, startY);

  if (isPixelLine(startIdx)) {
    return;
  }

  if (data[startIdx] === newColor[0] &&
    data[startIdx + 1] === newColor[1] &&
    data[startIdx + 2] === newColor[2] &&
    data[startIdx + 3] === 255) {
    return;
  }

  const queue = [[startX, startY]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = getPixelIndex(x, y);

    if (isPixelLine(idx)) {
      continue;
    }

    if (data[idx] === newColor[0] &&
      data[idx + 1] === newColor[1] &&
      data[idx + 2] === newColor[2] &&
      data[idx + 3] === 255) {
      continue;
    }

    data[idx] = newColor[0];
    data[idx + 1] = newColor[1];
    data[idx + 2] = newColor[2];
    data[idx + 3] = 255;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  context.putImageData(imageData, 0, 0);
  canvasTexture.needsUpdate = true;
};

const Loader = () => (
  <Html center>
    <div>Loading 3D Model...</div>
  </Html>
);

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
  isDraggable = false
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

  const getColorValue = useCallback((color) => {
    const colorMap = {
      'Black': 0x333333,
      'Red': 0x8B0000,
      'Grey': 0x808080,
      'Blue': 0x0000CD,
      'Green': 0x006400
    };
    return colorMap[color] || 0x333333;
  }, []);




  // --- 4. 新增：加载底座所需的三种贴图 ---
  useEffect(() => {
    // 【修改】: 此逻辑现在由 isMultiTextureBase 触发，碑体和底座都使用
    if (!isMultiTextureBase) return;

    // 根据 'color' prop 映射到你的贴图文件夹名称
    // 我假设 'Black' 颜色对应 'Rustic' 文件夹
    const colorFolderMap = {
      'Black': 'Black',
      'Grey': 'Rustic',
      'Red': 'Red',
      'Blue': 'Blue',
      // ... 为 'Green' 和 'White' 添加映射 (如果它们也有文件夹)
      'Green': 'Rustic', // 假设回退
      'White': 'Grey'  // 假设回退
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
  }, [modelPath, color, texturePath, scene, getColorValue]); // 移除position和onDimensionsChange等，避免不必要的重新加载



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


// -----------------------------------------------------
//  InteractiveArtPlane 组件
// -----------------------------------------------------
const InteractiveArtPlane = forwardRef(({
  art,
  isSelected,
  onSelect,
  onTransformEnd,
  transformMode,
  fillColor,
  isFillModeActive
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [canvasTexture, setCanvasTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const lastScaleRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const artCanvasRef = useRef({
    canvas: null,
    context: null,
    originalData: null
  });

  // 【关键修改：新增】: 使用 useImperativeHandle 暴露一个方法来获取画布的 dataURL
  useImperativeHandle(ref, () => ({
    getCanvasDataURL: () => {
      const { canvas } = artCanvasRef.current;
      if (canvas) {
        return canvas.toDataURL('image/png'); // 转换为 base64 字符串
      }
      return null;
    }
    // 依赖于画布是否已创建
  }), [artCanvasRef.current?.canvas]);


  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [art.id, art.imagePath]);


  // 1. 【关键修改】: 加载纹理
  useEffect(() => {
    isInitialLoadRef.current = true;

    // --- 【新增逻辑】: 检查是否存在已保存的修改后图像 ---
    if (art.modifiedImageData) {
      const img = new Image();
      img.src = art.modifiedImageData; // 加载 base64 数据
      img.onload = () => {
        if (!img || img.naturalHeight === 0) return;
        const aspect = img.naturalWidth / img.naturalHeight;
        setAspectRatio(aspect);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0); // 绘制已保存的图像

        // 关键：我们仍需加载“原始”图像数据，以便 FloodFill 知道线条在哪里
        const loader = new THREE.TextureLoader();
        loader.load(art.imagePath, (originalTexture) => {
          const originalImg = originalTexture.image;
          const originalCanvas = document.createElement('canvas');
          const originalContext = originalCanvas.getContext('2d', { willReadFrequently: true });
          originalCanvas.width = originalImg.naturalWidth;
          originalCanvas.height = originalImg.naturalHeight;
          originalContext.drawImage(originalImg, 0, 0);
          const originalData = originalContext.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

          // 设置 ref：使用“修改后”的 canvas，但使用“原始”的 originalData
          artCanvasRef.current = { canvas, context, originalData };
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          setCanvasTexture(texture);
        });
      };
      return; // 停止执行，因为我们已经从 dataURL 加载了
    }
    // --- 【结束新增逻辑】 ---

    // 这是原始逻辑，用于处理没有 modifiedImageData 的情况
    if (!art.imagePath) {
      setCanvasTexture(null);
      artCanvasRef.current = { canvas: null, context: null, originalData: null };
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(art.imagePath, (loadedTexture) => {
      const img = loadedTexture.image;
      if (!img || img.naturalHeight === 0) return;
      const aspect = img.naturalWidth / img.naturalHeight;
      setAspectRatio(aspect);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      context.drawImage(img, 0, 0);
      const originalData = context.getImageData(0, 0, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      artCanvasRef.current = { canvas, context, originalData };
      setCanvasTexture(texture);
    }, undefined, (error) => {
      console.error('Failed to load art texture:', art.imagePath, error);
      setCanvasTexture(null);
    });
    return () => {
      setCanvasTexture((currentTexture) => {
        currentTexture?.dispose();
        return null;
      });
      artCanvasRef.current = { canvas: null, context: null, originalData: null };
    };
    // --- 【关键修改】: 添加 art.modifiedImageData 作为依赖 ---
  }, [art.imagePath, art.modifiedImageData]);


  // 2. 监听属性变化重绘画布
  useEffect(() => {
    const { lineColor, lineAlpha } = art.properties || {};
    const safeLineAlpha = lineAlpha ?? 1.0;
    const { context, originalData, canvas } = artCanvasRef.current;
    if (!context || !originalData || !canvasTexture) return;

    const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const newImageData = new ImageData(canvas.width, canvas.height);
    const newData = newImageData.data;
    const oldData = originalData.data;
    const currentData = currentImageData.data;

    let rgbColor = null;
    if (lineColor) {
      rgbColor = new THREE.Color(lineColor).toArray().map(c => Math.round(c * 255));
    }

    for (let i = 0; i < oldData.length; i += 4) {
      const isLine = oldData[i] < 100 &&
        oldData[i + 1] < 100 &&
        oldData[i + 2] < 100
        && oldData[i + 3] > 10;
      if (isLine) {
        if (rgbColor) {
          newData[i] = rgbColor[0];
          newData[i + 1] = rgbColor[1];
          newData[i + 2] = rgbColor[2];
        } else {
          newData[i] = oldData[i];
          newData[i + 1] = oldData[i + 1];
          newData[i + 2] = oldData[i + 2];
        }
        newData[i + 3] = oldData[i + 3] * safeLineAlpha;
      } else {
        newData[i] = currentData[i];
        newData[i + 1] = currentData[i + 1];
        newData[i + 2] = currentData[i + 2];
        newData[i + 3] = currentData[i + 3];
      }
    }
    context.putImageData(newImageData, 0, 0);
    canvasTexture.needsUpdate = true;
  }, [
    art.properties?.lineColor,
    art.properties?.lineAlpha,
    canvasTexture
  ]);


  // 3. 初始位置、缩放和旋转设置
  useLayoutEffect(() => {
    if (meshRef.current) {
      const position = art.position || [0, 0, 0];
      const scale = art.scale || [0.2, 0.2, 1];
      const rotation = art.rotation || [0, 0, 0];

      meshRef.current.position.set(position[0], position[1], position[2]);
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        if (aspectRatio > 0 && aspectRatio !== 1) {
          const baseSize = Math.abs(scale[0]);
          const newScaleY = baseSize / aspectRatio;
          const signX = Math.sign(scale[0]);
          meshRef.current.scale.set(
            baseSize * signX,
            newScaleY * signX,
            scale[2] || 1
          );
          onTransformEnd(art.id, {
            position: meshRef.current.position.toArray(),
            scale: meshRef.current.scale.toArray(),
            rotation: meshRef.current.rotation.toArray().slice(0, 3)
          });
        } else {
          meshRef.current.scale.set(scale[0], scale[1], scale[2] || 1);
        }
      } else {
        meshRef.current.scale.set(scale[0], scale[1], scale[2] || 1);
      }
    }
  }, [art.id, art.position, art.scale, art.rotation, aspectRatio, onTransformEnd]);


  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.mode = transformMode;
      controlRef.current.enabled = isSelected;
      if (transformMode === 'rotate') {
        controlRef.current.showX = false;
        controlRef.current.showY = false;
        controlRef.current.showZ = true;
      } else if (transformMode === 'scale') {
        controlRef.current.showX = true;
        controlRef.current.showY = true;
        controlRef.current.showZ = false;
      } else if (transformMode === 'translate') {
        controlRef.current.showX = true;
        controlRef.current.showY = true;
        controlRef.current.showZ = false;
      }
    }
  }, [isSelected, transformMode]);


  // 5. 变换事件处理器
  const onTransformEndHandler = () => {
    lastScaleRef.current = null;
    if (meshRef.current) {
      const newTransform = {
        position: meshRef.current.position.toArray(),
        scale: meshRef.current.scale.toArray(),
        rotation: meshRef.current.rotation.toArray().slice(0, 3)
      };
      onTransformEnd(art.id, newTransform);
    }
  };
  const onTransformStartHandler = () => {
    if (meshRef.current) {
      lastScaleRef.current = [...meshRef.current.scale.toArray()];
    }
  };
  const onTransformChangeHandler = () => {
    if (meshRef.current && controlRef.current.mode === 'scale') {
      const scale = meshRef.current.scale;
      const lastScale = lastScaleRef.current;
      if (!lastScale) {
        lastScaleRef.current = [...scale.toArray()];
        return;
      }
      scale.z = lastScale[2] || 1;
    }
  };


  // 6. 返回 JSX (您的 onPointerDown 逻辑)
  return (
    <group ref={ref}>
      {isSelected && (
        <TransformControls
          ref={controlRef}
          object={meshRef}
          onMouseDown={onTransformStartHandler}
          onMouseUp={onTransformEndHandler}
          onChange={onTransformChangeHandler}
          mode={transformMode}
        />
      )}
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected && isFillModeActive) {
            if (e.uv) {
              const { canvas, context, originalData } = artCanvasRef.current;
              if (canvas && context && originalData && canvasTexture) {
                const pixelX = Math.floor(e.uv.x * canvas.width);
                const pixelY = Math.floor((1 - e.uv.y) * canvas.height);
                const rgbColor = new THREE.Color(fillColor || '#4285F4')
                  .toArray()
                  .map(c => Math.round(c * 255));
                floodFill(
                  context,
                  canvas,
                  originalData,
                  canvasTexture,
                  pixelX,
                  pixelY,
                  rgbColor
                );

                // --- 【修复 Bug 关键点】: 实时保存修改后的图像 ---
                // 填色操作修改了 Canvas 像素，必须立即保存为 DataURL 并更新到全局状态 (designState)，
                // 否则当组件因 Suspense (如加载字体) 被卸载后，所有未保存的像素修改都会丢失。
                const newDataUrl = canvas.toDataURL('image/png');
                onTransformEnd(art.id, { modifiedImageData: newDataUrl });
              }
            }
            return;
          }
          if (!isSelected) {
            onSelect(art.id);
            return;
          }
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={canvasTexture}
          transparent={true}
          opacity={canvasTexture ? 1.0 : 0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});


// EnhancedTextElement
const EnhancedTextElement = ({
  text,
  monument,
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  isSelected,
  isTextEditing,
  getFontPath, // 接收字体路径
  modelRefs // 接收模型引用
}) => {
  const textRef = useRef();
  const transformControlsRef = useRef();
  const groupRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const { scene, controls } = useThree();
  const [monumentMaterial, setMonumentMaterial] = useState(null);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [hasInitPosition, setHasInitPosition] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const lineRefs = useRef([]);
  const [lineOffsets, setLineOffsets] = useState([]);
  const rafWriteRef = useRef(null);

  const localGetFontPath = useCallback((nameOrPath) => {
    if (getFontPath) {
      return getFontPath(nameOrPath);
    }
    return nameOrPath || '/fonts/helvetiker_regular.typeface.json';
  }, [getFontPath]);

  // 计算文字应贴附的表面 Z（局部坐标，正面与图片同面）
  const computeSurfaceZ = useCallback((sizeZ, engraveType) => {
    // 目标平面：局部 z = -sizeZ / 2 (模型正面)，再根据雕刻方式作正向偏移
    const surfaceZ = -sizeZ / 2; // 假设模型原点在中心
    if (engraveType === 'vcut' || engraveType === 'frost') return surfaceZ + 0.021;
    if (engraveType === 'polish') return surfaceZ + 0.01;
    return surfaceZ + 0.002; // 默认轻微偏移
  }, []);



  const writeBackPoseToState = useCallback(() => {
    if (!groupRef.current || !monument) return;
    const monumentMesh = modelRefs.current[monument.id]?.getMesh();
    if (!monumentMesh) return;
    monumentMesh.updateWorldMatrix(true, false);

    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const groupWorldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
    const localPos = groupWorldPos.clone().sub(worldPosition);
    localPos.divide(worldScale);
    localPos.applyQuaternion(worldQuaternion.clone().invert());

    const groupWorldQuat = groupRef.current.getWorldQuaternion(new THREE.Quaternion());
    const relativeQuat = worldQuaternion.clone().invert().multiply(groupWorldQuat);
    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const localQuat = flipQuat.clone().invert().multiply(relativeQuat);
    const euler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');

    const doWrite = () => {
      // 保留 z（局部坐标），避免被强制写 0
      onTextPositionChange && onTextPositionChange(text.id, [localPos.x, localPos.y, localPos.z]);
      onTextRotationChange && onTextRotationChange(text.id, [euler.x, euler.y, euler.z]);
      rafWriteRef.current = null;
    };
    if (!rafWriteRef.current) rafWriteRef.current = requestAnimationFrame(doWrite);
  }, [monument, text.id, onTextPositionChange, onTextRotationChange, modelRefs]);

  // 将 text.position/rotation 应用到 group（根据碑体世界变换转换为世界位姿）
  useEffect(() => {
    if (!groupRef.current || !monument) return;
    const monumentMesh = modelRefs.current[monument.id]?.getMesh();
    if (!monumentMesh) return;

    monumentMesh.updateWorldMatrix(true, false);
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const xLocal = Array.isArray(text.position) ? (text.position[0] || 0) : 0;
    const yLocal = Array.isArray(text.position) ? (text.position[1] || 0.3) : 0.3;
    const zLocal = Array.isArray(text.position) ? (text.position[2] || 0) : 0;

    const localPoint = new THREE.Vector3(xLocal, yLocal, zLocal);
    const worldPoint = localPoint.clone()
      .multiply(worldScale)
      .applyQuaternion(worldQuaternion)
      .add(worldPosition);

    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const localEuler = new THREE.Euler(...(text.rotation || [0, 0, 0]), 'XYZ');
    const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
    const worldQuat = worldQuaternion.clone().multiply(flipQuat).multiply(localQuat);

    if (!isDragging) {
      groupRef.current.position.copy(worldPoint);
      groupRef.current.quaternion.copy(worldQuat);
    }
  }, [monument, text.position, text.rotation, modelRefs, isDragging]);

  // 首次创建：将文字放到“正面”平面（与图片同面）：局部 z = 基准(-size.z) + offset
  useEffect(() => {
    const isDefault = Array.isArray(text.position)
      ? (text.position[0] === 0 && text.position[1] === 0 && text.position[2] === 0)
      : true;
    if (!monument || !isDefault || hasInitPosition) return;

    let rafId;
    const tryInit = () => {
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) { rafId = requestAnimationFrame(tryInit); return; }
      monumentMesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.z <= 0) { rafId = requestAnimationFrame(tryInit); return; }
      const surfaceZ = computeSurfaceZ(size.z, text.engraveType);
      const xLocal = 0;
      const yLocal = 0.3;
      if (onTextPositionChange) {
        onTextPositionChange(text.id, [xLocal, yLocal, surfaceZ]);
        setHasInitPosition(true);
      }
    };
    tryInit();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.id, text.position, text.engraveType, onTextPositionChange, modelRefs, computeSurfaceZ, hasInitPosition]);

  // 当雕刻方式变化时，更新贴附 Z（保留当前 X/Y）
  useEffect(() => {
    if (!monument) return;
    let rafId;
    const applyZ = () => {
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) { rafId = requestAnimationFrame(applyZ); return; }
      monumentMesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.z <= 0) { rafId = requestAnimationFrame(applyZ); return; }
      const targetZ = computeSurfaceZ(size.z, text.engraveType);
      const current = Array.isArray(text.position) ? text.position : [0, 0, 0];
      // 仅当当前 z 与目标 z 显著不同时才更新，避免无限循环
      const currZ = Number(current[2] || 0);
      if (Math.abs(currZ - targetZ) > 1e-6 && onTextPositionChange) {
        onTextPositionChange(text.id, [current[0] || 0, current[1] || 0, targetZ]);
      }
    };
    applyZ();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.id, text.position, text.engraveType, onTextPositionChange, modelRefs, computeSurfaceZ]);

  useEffect(() => {
    let rafId;
    const trySetMaterial = () => {
      if (!monument || text.engraveType !== 'polish') {
        setMonumentMaterial(null);
        return;
      }
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) {
        rafId = requestAnimationFrame(trySetMaterial);
        return;
      }
      let found = false;
      monumentMesh.traverse((child) => {
        if (found) return;
        if (child.isMesh && child.material) {
          const baseMat = child.material;
          const cloned = baseMat.clone();
          cloned.map = baseMat.map || cloned.map;
          if (cloned.map) cloned.map.needsUpdate = true;
          cloned.roughness = 0.1 + ((text.polishBlend || 0.5) * 0.4);
          cloned.metalness = 0.5 - ((text.polishBlend || 0.5) * 0.2);
          if (cloned.clearcoat !== undefined) {
            cloned.clearcoat = 0.5;
            cloned.clearcoatRoughness = 0.1 + ((text.polishBlend || 0.5) * 0.3);
          }
          cloned.transparent = true;
          cloned.side = THREE.DoubleSide;
          cloned.needsUpdate = true;
          setMonumentMaterial(cloned);
          found = true;
        }
      });
      if (!found) rafId = requestAnimationFrame(trySetMaterial);
    };
    trySetMaterial();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.engraveType, text.polishBlend, modelRefs]);

  useEffect(() => {
    if (!isSelected || !isTextEditing) {
      controls && (controls.enabled = true);
      setIsDragging(false);
      return;
    }
    const onKey = (e) => {
      if (e.key === 't' || e.key === 'T') setTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSelected, isTextEditing, controls]);

  const textMaterial = useMemo(() => {

    if (text.engraveType === 'polish' && monumentMaterial) {
      return monumentMaterial;
    }
    try {
      const materialProps = { transparent: true, side: THREE.DoubleSide };
      switch (text.engraveType) {
        case 'vcut':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: text.vcutColor || '#5D4037', roughness: 0.9, metalness: 0.05, clearcoat: 0.1, clearcoatRoughness: 0.2, opacity: 0.95 });
        case 'frost':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xF8F8F8, roughness: Math.max(0.6, text.frostIntensity || 0.8), metalness: 0.02, transmission: 0.1, thickness: 0.01, opacity: 0.85 - ((text.frostIntensity || 0.8) * 0.2) });
        case 'polish':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0x7A7A7A, roughness: 0.1 + ((text.polishBlend || 0.5) * 0.4), metalness: 0.5 - ((text.polishBlend || 0.5) * 0.2), clearcoat: 0.5, clearcoatRoughness: 0.1 + ((text.polishBlend || 0.5) * 0.3), opacity: 0.98 });
        default:
          return new THREE.MeshStandardMaterial({ ...materialProps, color: 0x333333, roughness: 0.7, metalness: 0.3 });
      }
    } catch (error) {
      console.error('Error creating material, using fallback:', error);
      return new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    }
  }, [monumentMaterial, text.engraveType, text.vcutColor, text.frostIntensity, text.polishBlend]);

  useEffect(() => {
    const refs = lineRefs.current;
    if (!refs || refs.length === 0) return;
    const metrics = refs.map((mesh) => {
      if (!mesh || !mesh.geometry) return { width: 0, centerX: 0 };
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (!bb) return { width: 0, centerX: 0 };
      return { width: bb.max.x - bb.min.x, centerX: (bb.max.x + bb.min.x) / 2 };
    });
    const maxWidth = metrics.reduce((m, v) => Math.max(m, v.width), 0);
    const newOffsets = metrics.map((m) => {
      let desiredCenter = 0;
      if (text.alignment === 'left') desiredCenter = -maxWidth / 2 + m.width / 2;
      else if (text.alignment === 'right') desiredCenter = maxWidth / 2 - m.width / 2;
      else desiredCenter = 0; // center
      const x = desiredCenter - m.centerX;
      return { x };
    });
    setLineOffsets(newOffsets);
  }, [text.content, text.size, text.kerning, text.lineSpacing, text.alignment]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    // 始终允许切换选中字，即使面板已打开
    if (onTextSelect) {
      onTextSelect(text.id);
    }
  }, [text.id, onTextSelect]);

  const renderCurvedText = () => {
    if (!text.content) return null;

    const characters = text.content.split('');
    const fontSize = text.size * 0.01;
    const kerningUnit = (text.kerning || 0) * 0.001;

    // 获取弯曲方向和强度
    const curveAmount = text.curveAmount || 0;
    const curveDirection = curveAmount >= 0 ? 1 : -1; // 正数向上，负数向下
    const curveIntensity = Math.min(Math.abs(curveAmount) / 100, 0.8);

    // 计算字符的实际宽度（更精确的测量）
    const calculateCharacterWidth = (char) => {
      const widthMap = {
        'i': 0.3, 'l': 0.3, 'I': 0.4, '1': 0.4, '!': 0.3, '.': 0.2, ',': 0.2,
        't': 0.4, 'f': 0.4, 'r': 0.5, 'j': 0.3,
        'm': 0.9, 'w': 0.9, 'M': 1.0, 'W': 1.0,
        ' ': 0.4
      };
      return widthMap[char] || 0.7;
    };

    // 计算字符的底部偏移（确保所有字母底部对齐）
    const calculateCharacterBottomOffset = (char) => {
      // 对于有小写下伸部分的字符（g, j, p, q, y），需要额外调整
      const descenderMap = {
        'g': 0.15, 'j': 0.2, 'p': 0.15, 'q': 0.15, 'y': 0.15
      };
      return descenderMap[char] || 0;
    };

    // 计算总弧长
    let totalArcLength = 0;
    const charWidths = characters.map(char => {
      const width = calculateCharacterWidth(char) * fontSize;
      totalArcLength += width;
      return width;
    });

    totalArcLength += Math.max(0, characters.length - 1) * fontSize * kerningUnit;

    // 计算弯曲参数
    const minArcAngle = Math.PI * 0.2;
    const maxArcAngle = Math.PI * 1.2;
    const arcAngle = curveIntensity > 0 ?
      (minArcAngle + (maxArcAngle - minArcAngle) * curveIntensity) : 0;

    const radius = arcAngle > 1e-6 ?
      Math.max(totalArcLength / arcAngle, totalArcLength * 0.5) :
      1e6;

    // 渲染每个字符
    let currentAngle = -arcAngle / 2;
    const baseOffsetY = -fontSize * 0.5; // 基础偏移，让所有字母底部对齐

    return characters.map((char, index) => {
      if (char === ' ') {
        const charWidth = charWidths[index];
        const charAngleIncrement = (charWidth + fontSize * kerningUnit) / radius;
        currentAngle += charAngleIncrement;
        return null;
      }

      // 计算字符在弧上的位置
      const charRadius = radius;
      const baseX = Math.sin(currentAngle) * charRadius;
      const baseY = (Math.cos(currentAngle) - 1) * charRadius * curveDirection;

      // 关键修改：所有字母使用相同的Y位置计算，确保底部对齐
      const x = baseX;
      const y = baseY + baseOffsetY; // 统一应用基础偏移

      // 计算字符旋转（使其始终朝向圆心）
      const rotationZ = -currentAngle * curveDirection;

      // 计算下伸字符的额外偏移
      const descenderOffset = calculateCharacterBottomOffset(char) * fontSize;
      const finalY = y - descenderOffset; // 下伸字符需要额外向下偏移

      // 推进到下一个字符的角度位置
      const charWidth = charWidths[index];
      const charAngleIncrement = (charWidth + fontSize * kerningUnit) / radius;
      currentAngle += charAngleIncrement;

      return (
        <group
          key={index}
          position={[x, finalY, 0]}
          rotation={[0, 0, rotationZ]}
        >
          <Text3D
            font={localGetFontPath(text.font)}
            size={fontSize}
            height={text.thickness || 0.02}
            letterSpacing={0}
            curveSegments={16} // 进一步增加曲线段数使更平滑
            bevelEnabled={true}
            bevelThickness={0.002}
            bevelSize={0.002}
            bevelOffset={0}
            bevelSegments={5}
            material={textMaterial}
          >
            {char}
          </Text3D>
        </group>
      );
    });
  };

  const renderNormalText = () => {
    const content = text.content || 'Text';
    const lines = content.split('\n');
    const fontSize = text.size * 0.01;
    const lineGap = fontSize * (text.lineSpacing || 1.2);
    return (
      <group>
        {lines.map((ln, idx) => (
          <Text3D
            key={idx}
            ref={(el) => (lineRefs.current[idx] = el)}
            font={localGetFontPath(text.font)}
            size={fontSize}
            letterSpacing={text.kerning * 0.001}
            height={text.thickness || 0.02}
            curveSegments={8}
            bevelEnabled={true}
            bevelThickness={0.002}
            bevelSize={0.002}
            bevelOffset={0}
            bevelSegments={3}
            material={textMaterial}
            position={[
              lineOffsets[idx]?.x || 0,
              -idx * lineGap + ((lines.length - 1) * lineGap) / 2,
              0
            ]}
          >
            {ln || ' '}
          </Text3D>
        ))}
      </group>
    );
  };

  const renderTextContent = () => {
    if (text.curveAmount && text.curveAmount > 0) {
      return renderCurvedText();
    } else {
      return renderNormalText();
    }
  };

  return (
    <>
      <group
        ref={groupRef}
        onPointerDown={handleClick}
        userData={{ isTextElement: true, textId: text.id }}
      >
        {renderTextContent()}
      </group>

      {isSelected && isTextEditing && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          space="local"
          showX={transformMode === 'translate'}
          showY={transformMode === 'translate'}
          showZ={transformMode === 'rotate'}
          onMouseDown={() => { controls && (controls.enabled = false); setIsDragging(true); }}
          onObjectChange={writeBackPoseToState}
          onMouseUp={() => { writeBackPoseToState(); controls && (controls.enabled = true); setIsDragging(false); }}
        />
      )}
    </>
  );
};
// ---------------- 结束 EnhancedTextElement ----------------


// 主场景组件
const MonumentScene = forwardRef(({
  // Art props
  designState,
  onDimensionsChange,
  onDuplicateElement,
  onDeleteElement,
  onFlipElement,
  background = null,
  onUpdateArtElementState,
  selectedElementId,
  transformMode,
  onArtElementSelect,
  isFillModeActive,
  fillColor,
  onModelFillClick,

  // --- 合并点：添加同事的 Text props ---
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  currentTextId,
  isTextEditing,
  getFontPath,
  onSceneDrop // <-- 在这里添加 onSceneDrop
}, ref) => {
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const artPlaneRefs = useRef({}); // <-- 【关键修改：新增】用于存储 Art-Plane 的 Ref

  // 您的点击场景逻辑
  const handleSceneClick = (e) => {
    if (e.event.target.tagName === 'CANVAS' && !isFillModeActive) {
      onArtElementSelect(null);
      // --- 合并点：添加文字取消选中 ---
      if (isTextEditing && onTextSelect) {
        onTextSelect(null);
      }
    }
  };

  // 处理拖拽到场景的逻辑
  const handleSceneDrop = useCallback((e) => {
    e.preventDefault();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));

      if (dragData.type === 'saved-art-element' && dragData.data && onSceneDrop) {
        onSceneDrop(e);
      }
    } catch (error) {
      console.error('Scene drop failed:', error);
    }
  }, [onSceneDrop]);

  const handleSceneDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // 您的 art plane 选中逻辑
  const handleSelectArtPlane = useCallback((artId) => {
    onArtElementSelect(artId);
    // --- 合并点：取消选中文字 ---
    // if (artId && isTextEditing && onTextSelect) {
    // onTextSelect(null);
    //}
  }, [onArtElementSelect, isTextEditing, onTextSelect]);

  // 您的背景逻辑
  useEffect(() => {
    if (background) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(background, (texture) => {
        scene.background = texture;
        texture.mapping = THREE.EquirectangularReflectionMapping;
      }, undefined, (error) => {
        console.error('Failed to load background texture:', error);
        scene.background = null;
      });
    } else {
      scene.background = null;
    }
  }, [background, scene]);

  // 【关键修改】：MonumentScene 的 useImperativeHandle
  useImperativeHandle(ref, () => ({
    captureThumbnail: () => {
      return new Promise((resolve) => {
        const canvas = gl.domElement;
        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob));
        }, 'image/png', 1.0);
      });
    },
    captureProof: () => {
      return new Promise((resolve) => {
        const canvas = gl.domElement;
        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob));
        }, 'image/png', 1.0);
      });
    },
    // --- 【新增方法】 ---
    getArtCanvasData: () => {
      const artData = {};
      for (const artId in artPlaneRefs.current) {
        const artRef = artPlaneRefs.current[artId];
        // 调用我们之前在 InteractiveArtPlane 上暴露的方法
        if (artRef && typeof artRef.getCanvasDataURL === 'function') {
          const dataURL = artRef.getCanvasDataURL();
          if (dataURL) {
            artData[artId] = dataURL;
          }
        }
      }
      return artData;
    }
  }));

  // 您的 calculateModelPositions (使用useMemo优化)
  const positions = useMemo(() => {
    const positions = {};

    // --- 【关键修改：开始】 ---
    // 删除了所有 `modelRefs.current` 的测量逻辑。
    // 唯一的“事实来源”现在是 `designState`。
    const getModelLength = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.x;
      }
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      // 回退到 0 而不是 1
      return model ? (model.dimensions.length || 0) : 0;
    };
    const getModelHeight = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.y;
      }
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      // 回退到 0 而不是 1
      return model ? (model.dimensions.height || 0) : 0;
    };
    // --- 【关键修改：结束】 ---


    let currentY_subBase = -0.5;
    let currentY_base = -0.3;
    let currentY_Tablet = -0.1;
    let currentY_Top = -0.1;
    let currentX_subBase = -0.381;
    let currentX_base = -0.381;
    let currentX_Tablet = -0.304;

    if (designState.subBases.length > 0) {
      const totalSubBaseLength = designState.subBases.reduce((sum, subBase) => sum + getModelLength(subBase.id), 0) + (designState.subBases.length - 1) * 0.2;
      if (totalSubBaseLength > 0) currentX_subBase = -totalSubBaseLength / 2;
      designState.subBases.forEach((subBase, index) => {
        const height = getModelHeight(subBase.id);
        const length = getModelLength(subBase.id);
        positions[subBase.id] = [currentX_subBase, currentY_subBase, 0];
        currentX_subBase += length + 0.2;
        if (index === 0 && height > 0) {
          currentY_Top = currentY_subBase;
          currentY_Top += height;
          currentY_base = currentY_Top;
        }
      });
    }

    if (designState.bases.length > 0) {
      if (designState.subBases.length === 0) {
        currentY_base = -0.5;
        currentY_Tablet = -0.3;
        currentY_Top = -0.3;
      }
      // 计算所有bases的最大长度用于居中
      const maxBaseLength = Math.max(...designState.bases.map(base => getModelLength(base.id)));
      if (maxBaseLength > 0) currentX_base = -maxBaseLength / 2;

      // Bases垂直堆叠，而不是水平排列
      let baseYPosition = currentY_base;
      designState.bases.forEach((base, index) => {
        const height = getModelHeight(base.id);
        const length = getModelLength(base.id);
        // 所有bases使用相同的X位置（居中），但在Y方向堆叠
        positions[base.id] = [0, baseYPosition, -0.183];

        // 下一个base放在当前base的顶部
        if (height > 0) {
          baseYPosition += height;
        }

        // 更新monuments应该放置的位置（所有bases的顶部）
        if (index === designState.bases.length - 1 && height > 0) {
          currentY_Top = baseYPosition;
          currentY_Tablet = baseYPosition;
        }
      });
    }

    if (designState.monuments.length > 0) {
      if (designState.subBases.length === 0 && designState.bases.length === 0) {
        currentY_Tablet = -0.5;
        currentY_Top = -0.5;
      }
      const totalMonumentLength = designState.monuments.reduce((sum, monument) => sum + getModelLength(monument.id), 0) + (designState.monuments.length - 1) * 0.2;
      if (totalMonumentLength > 0) currentX_Tablet = -totalMonumentLength / 2;
      designState.monuments.forEach((monument, index) => {
        const height = getModelHeight(monument.id);
        const length = getModelLength(monument.id);
        positions[monument.id] = [0, currentY_Tablet - 0.01, -0.103];
        currentX_Tablet += length + 0.2;
        if (index === 0) currentY_Top += height;
      });
    }
    return positions;
  }, [designState.subBases, designState.bases, designState.monuments]);

  const handleModelLoad = (elementId, elementType, dimensions) => {
    if (onDimensionsChange) {
      onDimensionsChange(elementId, dimensions, elementType);
    }
  };

  // 在重新渲染时清除旧的 ref，防止内存泄漏
  //artPlaneRefs.current = {};

  return (
    <group ref={sceneRef} onClick={handleSceneClick}>

      {/* --- 合并点：更新 OrbitControls enabled 逻辑 --- */}
      <OrbitControls
        enabled={selectedElementId === null && currentTextId === null && !isFillModeActive}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />

      {/* --- 9. 关键修改：渲染 SubBases --- */}
      {designState.subBases.map(subBase => (
        <Model
          key={subBase.id}
          ref={el => modelRefs.current[subBase.id] = el}

          // --- 开始修改 ---
          modelPath="/models/Bases/Base.glb"      // 1. 使用你指定的统一模型
          isMultiTextureBase={true}                // 2. 激活9-mesh逻辑
          polish={subBase.polish}                  // 3. 传递 polish 决定B面贴图
          // texturePath={subBase.texturePath}    // 4. (不再需要)
          // --- 结束修改 ---

          position={positions[subBase.id] || [0, 0, 0]}
          dimensions={subBase.dimensions}
          color={subBase.color} // color 决定使用哪个贴图文件夹 (Blue, Red, Rustic...)
          onDimensionsChange={(dims) => handleModelLoad(subBase.id, 'subBase', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(subBase.id, 'subBase')}
        />
      ))}

      {/* --- 10. 关键修改：渲染 Bases --- */}
      {designState.bases.map(base => (
        <Model
          key={base.id}
          ref={el => modelRefs.current[base.id] = el}

          // --- 开始修改 ---
          modelPath="/models/Bases/Base.glb"      // 1. 使用你指定的统一模型
          isMultiTextureBase={true}                // 2. 激活9-mesh逻辑
          polish={base.polish}                     // 3. 传递 polish 决定B面贴图
          // texturePath={base.texturePath}       // 4. (不再需要)
          // --- 结束修改 ---

          position={positions[base.id] || [0, 0, 0]}
          dimensions={base.dimensions}
          color={base.color} // color 决定使用哪个贴图文件夹
          onDimensionsChange={(dims) => handleModelLoad(base.id, 'base', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(base.id, 'base')}
        />
      ))}

      {/* --- 合并点：修改 Monuments 渲染以包含文本 --- */}
      {designState.monuments.map(monument => {
        // (来自同事的代码)
        const monumentTexts = designState.textElements.filter(text => text.monumentId === monument.id);

        return (
          <React.Fragment key={`monument-${monument.id}`}>
            {/* 【V_MODIFICATION】: 您的 Monument Model 渲染 */}
            <Model
              key={monument.id}
              ref={el => modelRefs.current[monument.id] = el}
              modelPath={monument.modelPath}
              // texturePath={monument.texturePath} // <-- 移除
              isMultiTextureBase={true}            // <-- 添加
              polish={monument.polish}             // <-- 添加
              position={positions[monument.id] || [0, 0, 0]}
              dimensions={monument.dimensions}
              color={monument.color} // 保留
              onDimensionsChange={(dims) => handleModelLoad(monument.id, 'monument', dims)}
              isFillModeActive={isFillModeActive}
              onFillClick={() => onModelFillClick(monument.id, 'monument')}
            />

            {/* 合并点：添加 EnhancedTextElement 渲染 (来自同事的代码) */}
            {monumentTexts.map(text => (
              <EnhancedTextElement
                key={text.id}
                text={text}
                monument={monument}
                isSelected={currentTextId === text.id}
                isTextEditing={isTextEditing}
                onTextSelect={onTextSelect}
                onDeleteText={onDeleteText}
                onTextPositionChange={onTextPositionChange}
                onTextRotationChange={onTextRotationChange}
                getFontPath={getFontPath} // 传递 getFontPath
                modelRefs={modelRefs} // 传递 modelRefs
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* 您的 Vases 渲染 (isDraggable 已合并) */}
      {designState.vases.map(vase => (
        <Model
          key={vase.id}
          ref={el => modelRefs.current[vase.id] = el}
          modelPath={vase.modelPath}
          texturePath={vase.texturePath}
          position={vase.position}
          dimensions={vase.dimensions}
          color={vase.color}
          isDraggable={true} // <-- 合并点：来自同事
          onDimensionsChange={(dims) => handleModelLoad(vase.id, 'vase', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(vase.id, 'vase')}
        />
      ))}

      {/* 【关键修改】：InteractiveArtPlane 渲染 */}
      {designState.artElements.map(art => (
        <InteractiveArtPlane
          key={art.id}
          // 【新增】: 将 ref 存储在 artPlaneRefs.current 中
          ref={el => artPlaneRefs.current[art.id] = el}
          art={{ ...art, imagePath: art.imagePath }}
          isSelected={selectedElementId === art.id}
          onSelect={handleSelectArtPlane}
          onTransformEnd={onUpdateArtElementState}
          transformMode={transformMode}
          fillColor={fillColor}
          isFillModeActive={isFillModeActive}
        />
      ))}

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[5]} />

    </group>
  );
});

// 主场景包装器 (保持不变)
const Scene3D = forwardRef(({
  background,
  onUpdateArtElementState,
  onArtElementSelect,
  selectedElementId,
  transformMode,
  isFillModeActive,
  fillColor,
  onModelFillClick,
  // --- 合并点：添加文本 props ---
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  currentTextId,
  isTextEditing,
  getFontPath,
  ...props
}, ref) => {
  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onDrop={props.onSceneDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
    >
      <Canvas
        camera={{
          // --- 合并点：使用同事的相机位置 ---
          position: [0, 3, 1], //
          fov: 25, //
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f0f2f5');
        }}
      >
        <Suspense fallback={<Loader />}>
          <MonumentScene
            ref={ref}
            background={background}
            onUpdateArtElementState={onUpdateArtElementState}
            onArtElementSelect={onArtElementSelect}
            selectedElementId={selectedElementId}
            transformMode={transformMode}
            isFillModeActive={isFillModeActive}
            fillColor={fillColor}
            onModelFillClick={onModelFillClick}
            // --- 合并点：传递文本 props ---
            onTextPositionChange={onTextPositionChange}
            onTextRotationChange={onTextRotationChange}
            onTextSelect={onTextSelect}
            onDeleteText={onDeleteText}
            currentTextId={currentTextId}
            isTextEditing={isTextEditing}
            getFontPath={getFontPath}
            {...props}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Scene3D;