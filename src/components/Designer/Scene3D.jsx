import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, Suspense, useLayoutEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// 移除了 DecalGeometry 导入
import * as THREE from 'three';

// Flood Fill 算法
const floodFill = (context, canvas, originalImageData, canvasTexture, startX, startY, newColor) => {
  const { width, height } = canvas;
  // 获取 *当前* 画布数据
  const imageData = context.getImageData(0, 0, width, height); //
  const data = imageData.data;
  const originalData = originalImageData.data; // 原始 PNG 数据

  const getPixelIndex = (x, y) => (y * width + x) * 4; //

  // --- 【新增】辅助函数，用于检查像素是否为“线条” ---
  // 基于原始 PNG 图像数据
  const isPixelLine = (idx) => {
    return originalData[idx] < 100 &&       // R
      originalData[idx + 1] < 100 &&   // G
      originalData[idx + 2] < 100 &&   // B
      originalData[idx + 3] > 10;
  };

  const startIdx = getPixelIndex(startX, startY);

  // 1. 检查是否点击了线条
  if (isPixelLine(startIdx)) {
    return; // 不填充线条
  }

  // 2. 检查点击的区域是否已经是新颜色
  if (data[startIdx] === newColor[0] &&
    data[startIdx + 1] === newColor[1] &&
    data[startIdx + 2] === newColor[2] &&
    data[startIdx + 3] === 255) {
    return;
  }

  // 3. 开始队列填充
  const queue = [[startX, startY]]; //
  while (queue.length > 0) {
    const [x, y] = queue.shift(); //

    // 检查边界
    if (x < 0 || x >= width || y < 0 || y >= height) continue; //

    const idx = getPixelIndex(x, y);

    // --- 【核心逻辑修改】 ---

    // A. 检查当前像素是否为线条边界
    if (isPixelLine(idx)) {
      continue; // 碰到线条，停止这个方向的填充
    }

    // B. 检查是否已填充为新颜色 (防止重复处理和无限循环)
    if (data[idx] === newColor[0] &&
      data[idx + 1] === newColor[1] &&
      data[idx + 2] === newColor[2] &&
      data[idx + 3] === 255) {
      continue; // 已经填充过
    }

    // C. 填充新颜色
    data[idx] = newColor[0];     //
    data[idx + 1] = newColor[1]; //
    data[idx + 2] = newColor[2]; //
    data[idx + 3] = 255;         //

    // D. 将邻居添加到队列
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); //
  }

  // 4. 将修改后的数据写回画布
  context.putImageData(imageData, 0, 0); //
  // 5. 通知 Three.js 更新纹理
  canvasTexture.needsUpdate = true; //
};

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

  /** 填充模式是否激活 */
  isFillModeActive,
  /** 点击填充时的回调 */
  onFillClick,
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
      // --- 点击处理器，用于实现填充 ---
      onPointerDown={(e) => {
        // 仅在填充模式激活时响应
        if (isFillModeActive) {

          // 这能防止点击模型时，触发 MonumentScene 的背景点击事件（该事件会取消选中图案）。
          e.stopPropagation();
          if (onFillClick) {
            onFillClick();
          }
        }
        // 如果不是填充模式，则不执行任何操作，事件会正常冒泡。
        // 如果点击的是模型，事件冒泡后会被 MonumentScene 的背景点击捕获，从而取消选中图案。
      }}
    />
  );

  return isDraggable ? (
    <TransformControls object={meshRef} mode="translate">
      {ModelComponent}
    </TransformControls>
  ) : ModelComponent;
});


// -----------------------------------------------------
// 【修改】交互式图案平面组件
// -----------------------------------------------------
const InteractiveArtPlane = forwardRef(({
  art,
  isSelected,
  onSelect,
  onTransformEnd,
  transformMode,
  fillColor, // 【新增】接收填充颜色
  isFillModeActive // 【新增】接收填充模式状态
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [canvasTexture, setCanvasTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const lastScaleRef = useRef(null);
  const isInitialLoadRef = useRef(true); // 【修改】用于跟踪初始加载

  const artCanvasRef = useRef({
    canvas: null,
    context: null,
    originalData: null
  });

  // 【新增】当 art.id 或 imagePath 改变时，重置 "初始加载" 状态
  useEffect(() => {
    isInitialLoadRef.current = true;
    // setAspectRatio(1); // 不必重置，加载纹理时会重置
  }, [art.id, art.imagePath]);


  // 1. 加载纹理
  useEffect(() => {
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
      setAspectRatio(aspect); // <-- 触发 useLayoutEffect
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      context.drawImage(img, 0, 0);
      const originalData = context.getImageData(0, 0, canvas.width, canvas.height); //
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
  }, [art.imagePath]);


  // 2. 监听属性变化重绘画布
  useEffect(() => {
    const { lineColor, lineAlpha } = art.properties || {};
    const safeLineAlpha = lineAlpha ?? 1.0;
    const { context, originalData, canvas } = artCanvasRef.current;
    if (!context || !originalData || !canvasTexture) return;

    const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height); //
    const newImageData = new ImageData(canvas.width, canvas.height); //
    const newData = newImageData.data; //
    const oldData = originalData.data; //
    const currentData = currentImageData.data; //

    let rgbColor = null;
    if (lineColor) {
      rgbColor = new THREE.Color(lineColor).toArray().map(c => Math.round(c * 255)); //
    }

    for (let i = 0; i < oldData.length; i += 4) {
      const isLine = oldData[i] < 100 &&
        oldData[i + 1] < 100 &&
        oldData[i + 2] < 100
        && oldData[i + 3] > 10;
      if (isLine) {
        if (rgbColor) {
          newData[i] = rgbColor[0];     //
          newData[i + 1] = rgbColor[1]; //
          newData[i + 2] = rgbColor[2]; //
        } else {
          newData[i] = oldData[i];
          newData[i + 1] = oldData[i + 1];
          newData[i + 2] = oldData[i + 2];
        }
        newData[i + 3] = oldData[i + 3] * safeLineAlpha; //
      } else {
        newData[i] = currentData[i];     //
        newData[i + 1] = currentData[i + 1]; //
        newData[i + 2] = currentData[i + 2]; //
        newData[i + 3] = currentData[i + 3]; //
      }
    }
    context.putImageData(newImageData, 0, 0); //
    canvasTexture.needsUpdate = true; //
  }, [
    art.properties?.lineColor,
    art.properties?.lineAlpha,
    canvasTexture
  ]);


  // 3. 初始位置、缩放和旋转设置 (【修改】)
  useLayoutEffect(() => {
    if (meshRef.current) {
      const position = art.position || [0, 0, 0];
      const scale = art.scale || [0.2, 0.2, 1];
      const rotation = art.rotation || [0, 0, 0];

      meshRef.current.position.set(position[0], position[1], position[2]);
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);

      // --- 【修正后的代码 V3】 ---
      if (isInitialLoadRef.current) {
        // 标记为 "非初始加载"
        isInitialLoadRef.current = false;

        // 仅在需要时应用长宽比
        if (aspectRatio > 0 && aspectRatio !== 1) {
          const baseSize = Math.abs(scale[0]); // 使用 X 轴 scale 的绝对值
          const newScaleY = baseSize / aspectRatio;
          const signX = Math.sign(scale[0]); // 保留 X 轴可能的翻转

          meshRef.current.scale.set(
            baseSize * signX,
            newScaleY * signX, // Y 轴符号跟随 X 轴
            scale[2] || 1
          );

          // 【关键新增】: 立即将这个新计算的 scale 保存回父 state
          // 这样 flip 函数下次读取 art.scale 时，就会拿到这个 [0.2, 0.133, 1]
          onTransformEnd(art.id, {
            position: meshRef.current.position.toArray(),
            scale: meshRef.current.scale.toArray(),
            rotation: meshRef.current.rotation.toArray().slice(0, 3)
          });

        } else {
          // 如果 aspectRatio === 1, 原始 scale [0.2, 0.2, 1] 是正确的
          // 无需调用 onTransformEnd，因为它没有改变
          meshRef.current.scale.set(scale[0], scale[1], scale[2] || 1);
        }
      } else {
        // 如果不是初始加载 (isInitialLoadRef.current === false)
        // 则直接使用来自 prop 的 art.scale
        // (这可能是用户拖动的结果，也可能是翻转的结果)
        meshRef.current.scale.set(scale[0], scale[1], scale[2] || 1);
      }
      // --- 【修正结束】 ---

    }
  }, [art.id, art.position, art.scale, art.rotation, aspectRatio, onTransformEnd]); // 依赖 aspectRatio 和 onTransformEnd


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
      // --- 【修改】 移除了 X/Y 轴的等比缩放逻辑 ---
      /*
      const changeX = Math.abs(scale.x - lastScale[0]);
      const changeY = Math.abs(scale.y - lastScale[1]);
      if (changeX > changeY) {
        scale.y = scale.x / aspectRatio;
      } else {
        scale.x = scale.y * aspectRatio;
      }
      */
      // --- 结束修改 ---

      // 【保留】 保持 Z 轴缩放不变 (它是一个平面)
      scale.z = lastScale[2] || 1;
      //lastScaleRef.current = [scale.x, scale.y, scale.z];
    }
  };


  // 6. 返回 JSX (【修改】onPointerDown)
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

          // 1. 检查是否启用了填充模式
          if (isSelected && isFillModeActive) {

            // 仅在 e.uv 存在时执行填充 (确保点击在平面上)
            if (e.uv) {
              const { canvas, context, originalData } = artCanvasRef.current;
              if (canvas && context && originalData && canvasTexture) {
                // 转换 UV 坐标为像素坐标
                const pixelX = Math.floor(e.uv.x * canvas.width);
                const pixelY = Math.floor((1 - e.uv.y) * canvas.height);

                // 转换填充颜色
                const rgbColor = new THREE.Color(fillColor || '#4285F4')
                  .toArray()
                  .map(c => Math.round(c * 255));

                // 调用填充算法
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
            // 填充后，不执行任何其他操作 (不取消选中，不开始拖动)
            return;
          }

          // 2. 如果未启用填充模式，检查是否是“选中”操作
          if (!isSelected) {
            onSelect(art.id);
            return;
          }

          // 3. 如果已选中且未启用填充模式
          // 此事件将由 TransformControls 捕获以进行拖动/缩放/旋转。

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


// 主场景组件
const MonumentScene = forwardRef(({
  // ... (MonumentScene component props)
  designState,
  onDimensionsChange,
  onDuplicateElement,
  onDeleteElement,
  onFlipElement,
  background = null,
  onUpdateArtElementState, // 【从 props 接收】用于更新 ArtElement P, R, S 的回调
  // 从 props 接收选中状态和变换模式
  selectedElementId,
  transformMode,
  onArtElementSelect, //用于报告选中 ID 的回调
  // 接收填充相关 props ---
  isFillModeActive,
  fillColor,
  onModelFillClick,
}, ref) => {
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});

  // 清除选中状态（点击场景空白处）
  const handleSceneClick = (e) => {
    // 阻止点击场景内部元素时触发取消选中
    // 也阻止在填充模式下取消选中 (e.event.target.tagName 检查确保是 R3F 画布的空白处)
    if (e.event.target.tagName === 'CANVAS' && !isFillModeActive) {
      onArtElementSelect(null); //
    }
  };

  // 处理平面选中
  const handleSelectArtPlane = useCallback((artId) => {
    onArtElementSelect(artId); //上报选中 ID
  }, [onArtElementSelect]);

  // 处理背景图片
  useEffect(() => {
    if (background) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(background, (texture) => {
        // 设置场景背景
        scene.background = texture;

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

  // useImperativeHandle
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
    }
  }));

  // calculateModelPositions
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

      if (totalSubBaseLength>0){
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
        if (index === 0){
          if(height > 0){
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

      if (totalBaseLength > 0){
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
        if (index === 0){
          if (height > 0){
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

      if (totalMonumentLength > 0){
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
        if (index === 0){
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

  return (
    // 添加 onClick 事件以处理点击空白处取消选中
    // 注意：这里的 onClick 是 R3F 事件，而不是 DOM 事件
    <group ref={sceneRef} onClick={handleSceneClick}>
      {/* 阻止 OrbitControls 影响 TransformControls */}
      <OrbitControls
        // 【关键修改】在填充模式或选中元素时禁用 OrbitControls
        enabled={selectedElementId === null && !isFillModeActive}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />


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
          // --- 【新增】传递填充 props ---
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(subBase.id, 'subBase')}
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
          // --- 【新增】传递填充 props ---
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(base.id, 'base')}
        />
      ))}

      {designState.monuments.map(monument => (
        <Model
          key={monument.id}
          ref={el => modelRefs.current[monument.id] = el}
          modelPath={monument.modelPath}
          texturePath={monument.texturePath}
          position={positions[monument.id] || [0, 0, 0]}
          dimensions={monument.dimensions}
          color={monument.color}
          onDimensionsChange={(dims) => handleModelLoad(monument.id, 'monument', dims)}
          // --- 【新增】传递填充 props ---
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(monument.id, 'monument')}
        />
      ))}

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
          // --- 【新增】花瓶也可以被填充？如果不想让花瓶被填充，移除下面2行 ---
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(vase.id, 'vase')}
        />
      ))}

      {/* 【替换】使用 InteractiveArtPlane 替换 ArtDecal */}
      {designState.artElements.map(art => (
        <InteractiveArtPlane
          key={art.id}
          art={{
            ...art,
            // 确保组件能拿到图片路径
            imagePath: art.imagePath
          }}
          isSelected={selectedElementId === art.id} // 【更新】使用 props 传入的 ID
          onSelect={handleSelectArtPlane} // 【更新】使用上报回调
          onTransformEnd={onUpdateArtElementState}
          // 移除了 onDragChange 属性
          transformMode={transformMode} // 【更新】使用 props 传入的 mode
          fillColor={fillColor} // 【新增】将填充颜色传递下去
          isFillModeActive={isFillModeActive} // <-- 【新增】传递模式状态
        />
      ))}

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[5]} />

      {/* 移除场景内的 HTML 变换模式 UI，现在由 ArtEditorPanel 处理 */}
      {/* {selectedElementId && selectedElementType === 'art' && ( ... )} */}

      {/* 注意：OrbitControls 已经被移到 group 内部，并且通过 enabled 属性控制是否禁用 */}
    </group>
  );
});

// 主场景包装器
const Scene3D = forwardRef(({
  background,
  onUpdateArtElementState,
  onArtElementSelect,
  selectedElementId,
  transformMode,
  // 接收填充 props ---
  isFillModeActive,
  fillColor,
  onModelFillClick,
  ...props
}, ref) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [0, 2, 4],
          fov: 50,
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
            onArtElementSelect={onArtElementSelect} // 传递给 MonumentScene
            selectedElementId={selectedElementId} //传递给 MonumentScene
            transformMode={transformMode} // 传递给 MonumentScene
            // 传递填充 props ---
            isFillModeActive={isFillModeActive}
            fillColor={fillColor}
            onModelFillClick={onModelFillClick}
            {...props}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Scene3D;