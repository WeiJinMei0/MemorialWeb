import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, Suspense, useLayoutEffect, useCallback, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Text3D, DragControls } from '@react-three/drei';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { extend } from '@react-three/fiber';

// 扩展 TextGeometry 以便在 react-three-fiber 中使用
extend({ TextGeometry });
const Loader = () => (
  <Html center>
    <div>Loading 3D Model...</div>
  </Html>
);


const Model = forwardRef(({
  modelPath,
  texturePath,
  position = [0, 0, 0],
  dimensions = { length: 1, width: 1, height: 1 },
  color = 'Black',
  onLoad,
  onDimensionsChange,
  isDraggable = false
}, ref) => {
  const meshRef = useRef();
  const { gl, scene } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

  useImperativeHandle(ref, () => ({
    getMesh: () => meshRef.current,
    getDimensions: () => originalDimensions
  }));


  useEffect(() => {
    const loadModel = async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        const clonedScene = gltf.scene;
        // 设置位置
        clonedScene.position.set(position[0], position[1], position[2]);
        // const clonedScene = gltf.scene;
        scene.add(clonedScene);

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const originalDims = {
          length: size.x,
          width: size.y,
          height: size.z
        };

        setOriginalDimensions(originalDims);

        if (onDimensionsChange && !hasReportedDimensions &&
          (dimensions.length === 0 || dimensions.width === 0 || dimensions.height === 0)) {
          onDimensionsChange(originalDims);
          setHasReportedDimensions(true);
        }

        const textureLoader = new THREE.TextureLoader();
        clonedScene.traverse((child) => {

          if (child.isMesh) {
            // console.log(`Texture loaded: ${texturePath}`);
            textureLoader.load(texturePath, (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;

              console.log(`Texture loaded: ${texturePath}`);
              child.material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.1
              });
            }, undefined, () => {
              child.material = new THREE.MeshStandardMaterial({
                color: getColorValue(color),
                roughness: 0.7,
                metalness: 0.1
              });
            });
          }
        });

        setModel(clonedScene);
        if (onLoad) onLoad(clonedScene);
      } catch (err) {
        console.error(`Failed to load model: ${modelPath}`, err);
        setError(true);
      }
    };

    const getColorValue = (color) => {
      const colorMap = {
        'Black': 0x333333,
        'Red': 0x8B0000,
        'Grey': 0x808080,
        'Blue': 0x0000CD,
        'Green': 0x006400
      };
      return colorMap[color] || 0x333333;
    };

    loadModel();
  }, [modelPath, color]);

  useLayoutEffect(() => {
    if (meshRef.current && position) {
      // console.log(`i: ${i}`);
      // i+=1;
      meshRef.current.position.set(position[0], position[1], position[2]);
    }
  });

  useEffect(() => {
    if (meshRef.current && originalDimensions) {
      const scaleX = dimensions.length / originalDimensions.length;
      const scaleY = dimensions.height / originalDimensions.height;
      const scaleZ = dimensions.width / originalDimensions.width;
      meshRef.current.scale.set(scaleX, scaleY, scaleZ);
    }
  }, [dimensions, originalDimensions]);

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
    />
  );

  return isDraggable ? (
    <TransformControls object={meshRef} mode="translate">
      {ModelComponent}
    </TransformControls>
  ) : ModelComponent;
});



// 主场景组件
const MonumentScene = forwardRef(({
  designState,
  onDimensionsChange,
  onDuplicateElement,
  onDeleteElement,
  onFlipElement,
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  currentTextId,
  isTextEditing,
  background = null,
  getFontPath, // 接收字体路径查找函数
  //...props,
}, ref) => {
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const selectedTextId = currentTextId;
  const isEditingText = isTextEditing;

  // 处理背景图片
  useEffect(() => {
    if (background) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(background, (texture) => {
        // 设置场景背景
        scene.background = texture;
        // 可选：设置背景纹理的映射方式
        texture.mapping = THREE.EquirectangularReflectionMapping;
      }, undefined, (error) => {
        console.error('Failed to load background texture:', error);
        scene.background = null; // 加载失败时清除背景
      });
    } else {
      // 如果没有背景或背景为透明，清除背景
      scene.background = null;
    }
  }, [background, scene]);

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

  }));

  const calculateModelPositions = () => {
    const positions = {};

    // 获取模型的长度（X轴方向尺寸）
    const getModelLength = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.x;
      }
      // 回退到配置的长度
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      return model ? (model.dimensions.length || 1) : 1;
    };

    // 获取模型的高度（Y轴方向尺寸）
    const getModelHeight = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.y;
      }
      // 回退到配置的高度
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      return model ? (model.dimensions.height || 1) : 1;
    };

    // 计算Y轴堆叠
    let currentY_subBase = -0.5;
    let currentY_base = -0.3;
    let currentY_Tablet = -0.1;
    let currentY_Top = -0.1;
    let currentX_subBase = -0.381;
    let currentX_base = -0.381;
    let currentX_Tablet = -0.304;

    // 如果有次底座，将次底座放在最下面，Y坐标设置为0
    if (designState.subBases.length > 0) {
      const totalSubBaseLength = designState.subBases.reduce((sum, subBase) => {
        return sum + getModelLength(subBase.id);
      }, 0) + (designState.subBases.length - 1) * 0.2; // 添加间隔

      if (totalSubBaseLength > 0) {
        currentX_subBase = -totalSubBaseLength / 2; // 从左侧开始
      }

      designState.subBases.forEach((subBase, index) => {
        const height = getModelHeight(subBase.id);
        const length = getModelLength(subBase.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[subBase.id] = [currentX_subBase, currentY_subBase, 0];

        // 计算X轴偏移，基于次底座的长度
        // const xOffset = currentX_subBase;
        currentX_subBase += length + 0.2;

        // 只有第一个次底座参与Y轴堆叠计算
        if (index === 0) {
          if (height > 0) {
            currentY_Top = currentY_subBase;
            currentY_Top += height;
            currentY_base = currentY_Top;
          }
        }
      });
    }

    // 如果有底座，放在次底座上面
    if (designState.bases.length > 0) {
      // 如果没有次底座，将底座的Y坐标设置为0
      if (designState.subBases.length === 0) {
        currentY_base = -0.5;
        currentY_Tablet = -0.3;
        currentY_Top = -0.3;
      }

      // 计算所有底座的总长度
      const totalBaseLength = designState.bases.reduce((sum, base) => {
        return sum + getModelLength(base.id);
      }, 0) + (designState.bases.length - 1) * 0.2; // 添加间隔

      if (totalBaseLength > 0) {
        currentX_base = -totalBaseLength / 2; // 从左侧开始
      }

      designState.bases.forEach((base, index) => {
        const height = getModelHeight(base.id);
        const length = getModelLength(base.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[base.id] = [currentX_base, currentY_base, 0];

        // 计算X轴偏移，基于底座的长度
        // const xOffset = currentX_base;
        currentX_base += length + 0.2;

        // 只有第一个底座参与Y轴堆叠计算
        if (index === 0) {
          if (height > 0) {
            currentY_Top = currentY_base;
            currentY_Top += height
            currentY_Tablet = currentY_Top;
          }
        }
      });
    }

    // 如果有碑，放在底座上面
    if (designState.monuments.length > 0) {
      // 如果没有次底座和底座，将碑的Y坐标设置为0
      if (designState.subBases.length === 0 && designState.bases.length === 0) {
        currentY_Tablet = -0.5;
        currentY_Top = -0.5;
      }

      // 计算所有纪念碑的总长度
      const totalMonumentLength = designState.monuments.reduce((sum, monument) => {
        return sum + getModelLength(monument.id);
      }, 0) + (designState.monuments.length - 1) * 0.2; // 添加间隔

      if (totalMonumentLength > 0) {
        currentX_Tablet = -totalMonumentLength / 2; // 从左侧开始
      }

      designState.monuments.forEach((monument, index) => {
        const height = getModelHeight(monument.id);
        const length = getModelLength(monument.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[monument.id] = [currentX_Tablet, currentY_Tablet, 0];

        // 计算X轴偏移，基于纪念碑的长度
        // const xOffset = currentX_Tablet;
        currentX_Tablet += length + 0.2;

        // 只有第一个碑参与Y轴堆叠计算
        if (index === 0) {
          currentY_Top += height;
        }
      });
    }
    return positions;
  };

  const positions = calculateModelPositions();

  const handleModelLoad = (elementId, elementType, dimensions) => {
    if (onDimensionsChange) {
      onDimensionsChange(elementId, dimensions, elementType);
    }
  };


  // 使用 drei 提供的默认字体
  const EnhancedTextElement = ({
    text,
    monument,
    onTextPositionChange,
    onTextRotationChange,
    onTextSelect,
    onDeleteText,
    isSelected,
    isTextEditing
  }) => {
    const textRef = useRef();
    const transformControlsRef = useRef();
    const groupRef = useRef(); // 用于变换控制的组（锚定到墓碑正面平面）
    const [isDragging, setIsDragging] = useState(false);
    const { scene, controls } = useThree();
    const [monumentMaterial, setMonumentMaterial] = useState(null);
    const [dragEnabled, setDragEnabled] = useState(false);
    const [hasInitPosition, setHasInitPosition] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const lineRefs = useRef([]); // 多行文字的 refs
    const [lineOffsets, setLineOffsets] = useState([]);
    const rafWriteRef = useRef(null);

    // 使用传入的 getFontPath 函数（来自 useDesignState）
    const localGetFontPath = useCallback((nameOrPath) => {
      if (getFontPath) {
        return getFontPath(nameOrPath);
      }
      // 回退：如果没有传入则使用默认
      return nameOrPath || '/fonts/helvetiker_regular.typeface.json';
    }, [getFontPath]);
    // const initialPosition = useState()
    // 首次没有位置时，将文字初始化到表面中心
    useEffect(() => {
      if (!monument || !onTextPositionChange) return;
      if (hasInitPosition) return;
      if (!text.position || text.position.length < 2) {
        onTextPositionChange(text.id, [0, 0, 0]);
      }
      if (!text.rotation || text.rotation.length < 3) {
        onTextRotationChange && onTextRotationChange(text.id, [0, 0, 0]);
      }
      setHasInitPosition(true);
    }, [monument, text.id, text.position, text.rotation, onTextPositionChange, onTextRotationChange, hasInitPosition]);

    // 将文字组锚定在墓碑正面平面，并随平面旋转（以墓碑包围盒正面中心为基准）
    useEffect(() => {
      if (!groupRef.current || !monument) return;
      if (isDragging) return;

      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) return;

      // 确保世界矩阵最新
      monumentMesh.updateWorldMatrix(true, false);

      // 获取墓碑包围盒（世界空间），计算尺寸
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      // 根据雕刻类型决定沿法线方向的偏移（局部 -Z 被认为是正面）
      let frontOffset = 0.015; // 默认轻微抬起以避免Z冲突
      switch (text.engraveType) {
        case 'vcut':
        case 'frost':
          frontOffset = 0.021;
          break;
        case 'polish':
          frontOffset = 0.0;
          break;
        default:
          frontOffset = 0.015;
      }

      // 取墓碑的世界变换
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      
      // 前表面局部Z：使用 -size.z（用户要求），再加雕刻偏移
      const localPlaneZ = -size.z + frontOffset;
      const xLocal = (text.position?.[0] !== undefined)
        ? text.position[0]
        : 0;
      const yLocal = (text.position?.[1] !== undefined)
        ? text.position[1]
        : 0;
      const localPlanePoint = new THREE.Vector3(
        xLocal,
        yLocal,
        localPlaneZ
      );

      // 将本地点变换到世界坐标
      const localToWorld = localPlanePoint.clone().applyQuaternion(worldQuaternion).multiply(worldScale).add(worldPosition);

      // 让文字朝外：在墓碑朝向基础上绕Y轴再旋转180度
      const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      const finalQuat = worldQuaternion.clone().multiply(flipQuat);

      groupRef.current.position.copy(localToWorld);
      groupRef.current.quaternion.copy(finalQuat);
    }, [monument, text.position, text.engraveType, isDragging, monument?.dimensions]);

    // 非拖拽时每帧校准贴面（应对厚度/缩放变化）
    useFrame(() => {
      if (!groupRef.current || !monument) return;
      if (isDragging) return;
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) return;
      monumentMesh.updateWorldMatrix(true, false);

      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      let frontOffset = 0.015;
      if (text.engraveType === 'vcut' || text.engraveType === 'frost') frontOffset = 0.021;
      if (text.engraveType === 'polish') frontOffset = 0.0;

      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      // 使用厚度直接确定前表面 Z：-size.z + 偏移
      const localPlaneZ = -size.z + frontOffset;

      // 使用已存的局部 X/Y（若无则 0），更新到最新的前表面 Z
      const localPoint = new THREE.Vector3(
        text.position?.[0] || 0,
        text.position?.[1] || 0,
        localPlaneZ
      );
      const nextWorld = localPoint.clone().applyQuaternion(worldQuaternion).multiply(worldScale).add(worldPosition);
      groupRef.current.position.lerp(nextWorld, 0.5);
    });

    // 将 group 的世界位姿回写为平面内的局部 X/Y 与绕法线的 Z 旋转
    const writeBackPoseToState = useCallback(() => {
      if (!groupRef.current || !monument) return;
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) return;
      monumentMesh.updateWorldMatrix(true, false);

      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      // 世界 -> 墓碑局部
      const groupWorldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
      const localPos = groupWorldPos.clone().sub(worldPosition);
      localPos.divide(worldScale);
      localPos.applyQuaternion(worldQuaternion.clone().invert());

      // 计算局部旋转（相对墓碑朝向，去除翻转）
      const groupWorldQuat = groupRef.current.getWorldQuaternion(new THREE.Quaternion());
      const relativeQuat = worldQuaternion.clone().invert().multiply(groupWorldQuat);
      const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      const localQuat = flipQuat.clone().invert().multiply(relativeQuat);
      const euler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');

      const doWrite = () => {
        onTextPositionChange && onTextPositionChange(text.id, [localPos.x, localPos.y, 0]);
        onTextRotationChange && onTextRotationChange(text.id, [euler.x, euler.y, euler.z]);
        rafWriteRef.current = null;
      };
      if (!rafWriteRef.current) rafWriteRef.current = requestAnimationFrame(doWrite);
    }, [monument, text.id, onTextPositionChange, onTextRotationChange]);

    // 只在 polish 类型时获取主碑材质（包含 map），若未就绪会在下一帧重试一次
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
    }, [monument, text.engraveType, text.polishBlend]);

    // 选中时提供键盘快捷键切换模式：T=移动，R=旋转
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

    // 使用主碑材质或回退材质
    const textMaterial = useMemo(() => {
      // 只有 polish 类型使用墓碑材质
      if (text.engraveType === 'polish' && monumentMaterial) {
        return monumentMaterial;
      }

      // 其他类型使用原来的逻辑
      try {
        const materialProps = {
          transparent: true,
          side: THREE.DoubleSide
        };

        switch (text.engraveType) {
          case 'vcut':
            // V-Cut: 深色凹陷效果
            return new THREE.MeshPhysicalMaterial({
              ...materialProps,
              color: text.vcutColor || '#5D4037',
              roughness: 0.9,
              metalness: 0.05,
              clearcoat: 0.1,
              clearcoatRoughness: 0.2,
              opacity: 0.95
            });

          case 'frost':
            // Frost: 粗糙霜化表面
            return new THREE.MeshPhysicalMaterial({
              ...materialProps,
              color: 0xF8F8F8,
              roughness: Math.max(0.6, text.frostIntensity || 0.8),
              metalness: 0.02,
              transmission: 0.1,
              thickness: 0.01,
              opacity: 0.85 - ((text.frostIntensity || 0.8) * 0.2)
            });

          case 'polish':
            // Polish: 如果无法获取墓碑材质，使用回退材质
            return new THREE.MeshPhysicalMaterial({
              ...materialProps,
              color: 0x7A7A7A,
              roughness: 0.1 + ((text.polishBlend || 0.5) * 0.4),
              metalness: 0.5 - ((text.polishBlend || 0.5) * 0.2),
              clearcoat: 0.5,
              clearcoatRoughness: 0.1 + ((text.polishBlend || 0.5) * 0.3),
              opacity: 0.98
            });

          default:
            return new THREE.MeshStandardMaterial({
              ...materialProps,
              color: 0x333333,
              roughness: 0.7,
              metalness: 0.3
            });
        }
      } catch (error) {
        console.error('Error creating material, using fallback:', error);
        return new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      }
    }, [monumentMaterial, text.engraveType, text.vcutColor, text.frostIntensity, text.polishBlend]);


    // 普通文字的水平对齐（左/中/右）——通过几何包围盒计算偏移，保持在同一平面
    useEffect(() => {
      // 多行对齐：按每行宽度与最大宽度计算 X 偏移
      const refs = lineRefs.current;
      if (!refs || refs.length === 0) return;
      // 计算所有行的宽度与中心
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


    // 点击处理
    const handleClick = useCallback((event) => {
      event
        .stopPropagation();
      console.log('文字被点击 - 详细信息:', {
        textId: text.id,
        eventType: event.type,
        isTextEditing,
        isSelected,
        groupRefExists: !!groupRef.current,
        monumentId: monument?.id
      });
      if (!isTextEditing) return;
      if (onTextSelect) {
        console.log('调用 onTextSelect');
        onTextSelect(text.id);

      }
    }, [text.id, onTextSelect, isTextEditing]);


    // 弯曲文字渲染函数 - 使用 Text3D，保持在同一平面，弧长由字距驱动
    const renderCurvedText = () => {
      if (!text.content) return null;

      const characters = text.content.split('');
      const fontSize = text.size * 0.01;
      const kerningUnit = (text.kerning || 0) * 0.001; // drei Text3D 的 letterSpacing 与 size 同量纲

      // 弯曲强度 -> 夹角（弧度）
      const curveAmount = Math.max(0, text.curveAmount || 0) / 100; // 归一化 0..1
      const minArcAngle = Math.PI * 0.3;
      const maxArcAngle = Math.PI * 0.8;
      const arcAngle = curveAmount === 0 ? 0 : (minArcAngle + (maxArcAngle - minArcAngle) * curveAmount);

      // 近似每个字符的宽度（0.6 * 字号），总弧长由字距驱动
      const avgCharWidth = 0.6 * fontSize;
      const spacingPerGap = fontSize * kerningUnit;
      const totalArcLength = characters.length * avgCharWidth + Math.max(0, characters.length - 1) * spacingPerGap;

      // 半径 = 弧长 / 夹角（避免除0）
      const radius = arcAngle > 1e-6 ? Math.max(1e-4, totalArcLength / arcAngle) : 1e6;

      const n = characters.length;
      return characters.map((char, index) => {
        const centerIndex = (n - 1) / 2;
        const step = n > 1 ? arcAngle / (n - 1) : 0;
        
        // 统一从中间向两边弯曲（不再受对齐方式影响）
        let angle = (index - centerIndex) * step;

        // 计算位置
        const xOffset = Math.sin(angle) * radius;
        const yOffset = Math.cos(angle) * radius - radius;

        // 正确的旋转：在Z轴上旋转，使文字朝向扇形圆心
        const rotationZ = -angle; // 负号使文字朝向圆心

        return (
          <group
            key={index}
            position={[xOffset, yOffset, 0]}
            rotation={[0, 0, rotationZ]} // 在平面内绕Z旋转
          >
            <Text3D
              font={localGetFontPath(text.font)}
              size={fontSize}
              height={text.thickness || 0.02}
              letterSpacing={kerningUnit}
              lineHeight={text.lineSpacing}
              curveSegments={8}
              bevelEnabled={true}
              bevelThickness={0.002}
              bevelSize={0.002}
              bevelOffset={0}
              bevelSegments={3}
              material={textMaterial}
            >
              {char}
            </Text3D>
          </group>
        );
      });
    };

    // 渲染普通文字（非弯曲）
    const renderNormalText = () => {
      const content = text.content || 'Text';
      const lines = content.split('\n');
      // 计算每行 Y 偏移（顶部到下方）
      const fontSize = text.size * 0.01;
      const lineGap = fontSize * (text.lineSpacing || 1.2);

      // 渲染多行，每行有独立 ref 用于计算 boundingBox
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
    // 根据 curveAmount 决定渲染方式
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
          // 位置与旋转由上面的 useEffect 锚定到墓碑正面
          onClick={handleClick}
          userData={{ isTextElement: true, textId: text.id }}
        >
          {/* 使用 Text3D 创建有厚度的文字 */}
          {renderTextContent()}
        </group>

        {/* 平面内拖拽与旋转控制器（仅选中且目标已就绪时显示），渲染为兄弟节点避免循环 */}
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






  return (
    <group ref={sceneRef}>
      {designState.subBases.map(subBase => (
        <Model
          key={subBase.id}
          ref={el => modelRefs.current[subBase.id] = el}
          modelPath={subBase.modelPath}
          texturePath={subBase.texturePath}
          position={positions[subBase.id] || [0, 0, 0]}
          dimensions={subBase.dimensions}
          color={subBase.color}
          onDimensionsChange={(dims) => handleModelLoad(subBase.id, 'subBase', dims)}
        />
      ))}

      {designState.bases.map(base => (
        <Model
          key={base.id}
          ref={el => modelRefs.current[base.id] = el}
          modelPath={base.modelPath}
          texturePath={base.texturePath}
          position={positions[base.id] || [0, 0, 0]}
          dimensions={base.dimensions}
          color={base.color}
          onDimensionsChange={(dims) => handleModelLoad(base.id, 'base', dims)}
        />
      ))}

      {/* 修改纪念碑渲染，添加文本支持 */}
      {designState.monuments.map(monument => {
        const monumentTexts = designState.textElements.filter(text => text.monumentId === monument.id);

        return (
          <group key={`monument-group-${monument.id}`}>
            {/* 纪念碑模型 */}
            <Model
              key={monument.id}
              ref={el => modelRefs.current[monument.id] = el}
              modelPath={monument.modelPath}
              texturePath={monument.texturePath}
              position={positions[monument.id] || [0, 0, 0]}
              dimensions={monument.dimensions}
              color={monument.color}
              onDimensionsChange={(dims) => handleModelLoad(monument.id, 'monument', dims)}
            />

            {/* 使用增强的文字元素 */}
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
              />
            ))}
          </group>
        );
      })}

      {designState.vases.map(vase => (
        <Model
          key={vase.id}
          ref={el => modelRefs.current[vase.id] = el}
          modelPath={vase.modelPath}
          texturePath={vase.texturePath}
          position={vase.position}
          dimensions={vase.dimensions}
          color={vase.color}
          isDraggable={true}
          onDimensionsChange={(dims) => handleModelLoad(vase.id, 'vase', dims)}
        />
      ))}

      {designState.artElements.map(art => (
        <Model
          key={art.id}
          ref={el => modelRefs.current[art.id] = el}
          modelPath={art.modelPath}
          position={art.position}
          dimensions={art.dimensions}
          color={art.color}
          isDraggable={true}
          onDimensionsChange={(dims) => handleModelLoad(art.id, 'art', dims)}
        />
      ))}

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[5]} />

      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </group>
  );


});

// 主场景包装器
const Scene3D = forwardRef(({ background, ...props }, ref) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [0, 3, 1],
          fov: 25,
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
          <MonumentScene ref={ref} background={background} {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Scene3D;