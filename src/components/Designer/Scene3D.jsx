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
                            onLoad,
                            onDimensionsChange,

                            /** 填充模式是否激活 (来自您的代码) */
                            isFillModeActive,
                            /** 点击填充时的回调 (来自您的代码) */
                            onFillClick,
                            /** 是否可拖拽 (来自同事的代码) */
                            isDraggable = false
                          }, ref) => {
  const meshRef = useRef();
  const sceneObjectRef = useRef(null); // 用于跟踪添加到场景的对象
  const { gl, scene } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    let currentSceneObject = null;

    // 重置hasReportedDimensions当模型路径变化时
    setHasReportedDimensions(false);

    const loadModel = async () => {
      try {
        // 清理之前的模型
        if (sceneObjectRef.current && scene) {
          scene.remove(sceneObjectRef.current);
          // 清理几何体和材质
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

        // 更新meshRef指向场景对象
        if (meshRef.current !== clonedScene) {
          meshRef.current = clonedScene;
        }

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const originalDims = {
          length: size.x,
          width: size.y,
          height: size.z
        };

        if (!isMounted) return;
        setOriginalDimensions(originalDims);

        if (onDimensionsChange && !hasReportedDimensions &&
          (dimensions.length === 0 || dimensions.width === 0 || dimensions.height === 0)) {
          onDimensionsChange(originalDims);
          setHasReportedDimensions(true);
        }

        const textureLoader = new THREE.TextureLoader();
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            textureLoader.load(texturePath, (texture) => {
              if (!isMounted) return;
              texture.colorSpace = THREE.SRGBColorSpace;
              console.log(`Texture loaded: ${texturePath}`);
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

  useLayoutEffect(() => {
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
// 您的 InteractiveArtPlane 组件 (保持不变)
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


// --- 合并点：从同事的 Scene3D.jsx 复制 EnhancedTextElement ---
// (同事的 EnhancedTextElement)
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
      onTextPositionChange && onTextPositionChange(text.id, [localPos.x, localPos.y, 0]);
      onTextRotationChange && onTextRotationChange(text.id, [euler.x, euler.y, euler.z]);
      rafWriteRef.current = null;
    };
    if (!rafWriteRef.current) rafWriteRef.current = requestAnimationFrame(doWrite);
  }, [monument, text.id, onTextPositionChange, onTextRotationChange, modelRefs]);

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
    console.log('文字被点击:', text.id, isTextEditing);
    if (!isTextEditing) return;
    if (onTextSelect) {
      onTextSelect(text.id);
    }
  }, [text.id, onTextSelect, isTextEditing]);

  const renderCurvedText = () => {
    if (!text.content) return null;
    const characters = text.content.split('');
    const fontSize = text.size * 0.01;
    const kerningUnit = (text.kerning || 0) * 0.001;
    const curveAmount = Math.max(0, text.curveAmount || 0) / 100;
    const minArcAngle = Math.PI * 0.3;
    const maxArcAngle = Math.PI * 0.8;
    const arcAngle = curveAmount === 0 ? 0 : (minArcAngle + (maxArcAngle - minArcAngle) * curveAmount);
    const avgCharWidth = 0.6 * fontSize;
    const spacingPerGap = fontSize * kerningUnit;
    const totalArcLength = characters.length * avgCharWidth + Math.max(0, characters.length - 1) * spacingPerGap;
    const radius = arcAngle > 1e-6 ? Math.max(1e-4, totalArcLength / arcAngle) : 1e6;
    const n = characters.length;
    return characters.map((char, index) => {
      const centerIndex = (n - 1) / 2;
      const step = n > 1 ? arcAngle / (n - 1) : 0;
      let angle = (index - centerIndex) * step;
      const xOffset = Math.sin(angle) * radius;
      const yOffset = Math.cos(angle) * radius - radius;
      const rotationZ = -angle;
      return (
        <group key={index} position={[xOffset, yOffset, 0]} rotation={[0, 0, rotationZ]} >
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
        onClick={handleClick}
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
                                    // 您的 Art props
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
                                    getFontPath
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

  // 您的 art plane 选中逻辑
  const handleSelectArtPlane = useCallback((artId) => {
    onArtElementSelect(artId);
    // --- 合并点：取消选中文字 ---
    if (artId && isTextEditing && onTextSelect) {
      onTextSelect(null);
    }
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
      if (totalSubBaseLength>0) currentX_subBase = -totalSubBaseLength / 2;
      designState.subBases.forEach((subBase, index) => {
        const height = getModelHeight(subBase.id);
        const length = getModelLength(subBase.id);
        positions[subBase.id] = [currentX_subBase, currentY_subBase, 0];
        currentX_subBase += length + 0.2;
        if (index === 0 && height > 0){
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
        positions[base.id] = [currentX_base, baseYPosition, 0];

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
        positions[monument.id] = [currentX_Tablet, currentY_Tablet, 0];
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
  artPlaneRefs.current = {};

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

      {/* 您的 SubBases 渲染 (保持不变) */}
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
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(subBase.id, 'subBase')}
        />
      ))}

      {/* 您的 Bases 渲染 (保持不变) */}
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
            {/* 您的 Monument Model 渲染 */}
            <Model
              key={monument.id}
              ref={el => modelRefs.current[monument.id] = el}
              modelPath={monument.modelPath}
              texturePath={monument.texturePath}
              position={positions[monument.id] || [0, 0, 0]}
              dimensions={monument.dimensions}
              color={monument.color}
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
    <div style={{ width: '100%', height: '100%' }}>
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