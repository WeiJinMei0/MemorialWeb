// src/components/Designer/3d/InteractiveArtPlane.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { floodFill } from './utils';

/**
 * 辅助函数：整体填充所有封闭区域
 * 逻辑：从画布边缘开始进行 BFS (广度优先搜索) 标记“外部”区域。
 * 所有未被标记为“外部”且不是线条的区域，即为“内部封闭区域”，统一填充颜色。
 */
const globalFill = (context, canvas, originalData, rgbColor) => {
  const width = canvas.width;
  const height = canvas.height;
  const currentImageData = context.getImageData(0, 0, width, height);
  const data = currentImageData.data;
  const oData = originalData.data;

  // 标记数组：0 = 未访问/未知，1 = 已访问（外部或边界）
  const visited = new Uint8Array(width * height);
  const queue = [];

  const getIdx = (x, y) => y * width + x;

  // 判断是否为线条像素

  const isLine = (x, y) => {
    const i = (y * width + x) * 4;
    return oData[i] < 100 && oData[i + 1] < 100 && oData[i + 2] < 100 && oData[i + 3] > 10;
  };

  // 检查并添加到队列的辅助函数
  const checkAndAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = getIdx(x, y);
    if (visited[idx] === 1) return; // 已访问过

    visited[idx] = 1; // 标记为已访问

    // 如果不是线条，说明是连通的“外部”空间，继续加入队列扩散
    // 如果是线条，虽然标记为已访问（作为边界），但不加入队列，停止扩散
    if (!isLine(x, y)) {
      queue.push({ x, y });
    }
  };

  // 1. 初始化：将画布四周边缘作为“外部”的起始点
  for (let x = 0; x < width; x++) {
    checkAndAdd(x, 0);
    checkAndAdd(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    checkAndAdd(0, y);
    checkAndAdd(width - 1, y);
  }

  // 2. BFS 扩散，标记所有与边缘连通的空白区域为“外部”
  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    checkAndAdd(x + 1, y);
    checkAndAdd(x - 1, y);
    checkAndAdd(x, y + 1);
    checkAndAdd(x, y - 1);
  }

  // 3. 遍历所有像素，填充“内部”区域
  // 内部区域定义：未被 visited 标记（说明不与边缘连通） 且 不是线条
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIdx(x, y);
      // 如果 visited[idx] 仍为 0，说明 BFS 没走到这里，它被线条包围在内部
      if (visited[idx] === 0) {
        if (!isLine(x, y)) {
          const i = idx * 4;
          data[i] = rgbColor[0];
          data[i + 1] = rgbColor[1];
          data[i + 2] = rgbColor[2];
          data[i + 3] = 255; // 填实
        }
      }
    }
  }

  context.putImageData(currentImageData, 0, 0);
};


/**
 * InteractiveArtPlane 提供艺术图层的加载、TransformControls 以及填色操作。
 * 所有 2D 编辑都在隐藏 canvas 中完成，再实时映射到平面纹理。
 */
const InteractiveArtPlane = forwardRef(({
  art,
  isSelected,
  onSelect,
  onTransformEnd,
  transformMode,
  fillColor,
  isFillModeActive,
  surfaceZ // 新增：接收从 Scene 传入的表面 Z 坐标
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [canvasTexture, setCanvasTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const lastScaleRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const [dimensionsLabel, setDimensionsLabel] = useState({ width: 0, height: 0 }); // 用于显示尺寸

  const artCanvasRef = useRef({
    canvas: null,
    context: null,
    originalData: null
  });

  // 为每个图案实例生成一个微小的随机 Z 偏移，避免重叠时闪烁 (Z-fighting)
  // 范围：0.0001 ~ 0.001
  const uniqueOffset = useMemo(() => Math.random() * 0.0009 + 0.0001, []);

  // 暴露当前画布快照，供外部保存/导出
  useImperativeHandle(ref, () => ({
    getCanvasDataURL: () => {
      const { canvas } = artCanvasRef.current;
      if (canvas) {
        return canvas.toDataURL('image/png');
      }
      return null;
    }
  }), [artCanvasRef.current?.canvas]);


  // 切换艺术品时，允许缩放逻辑重新运行一次
  // 选中状态下才允许 TransformControls 操作，模式由面板控制
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [art.id, art.imagePath]);


  // 根据 imagePath / modifiedImageData 生成离屏 canvas 与 CanvasTexture
  useEffect(() => {
    isInitialLoadRef.current = true;

    if (art.modifiedImageData) {
      const img = new Image();
      img.src = art.modifiedImageData;
      img.onload = () => {
        if (!img || img.naturalHeight === 0) return;
        const aspect = img.naturalWidth / img.naturalHeight;
        setAspectRatio(aspect);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0);

        const loader = new THREE.TextureLoader();
        loader.load(art.imagePath, (originalTexture) => {
          const originalImg = originalTexture.image;
          const originalCanvas = document.createElement('canvas');
          const originalContext = originalCanvas.getContext('2d', { willReadFrequently: true });
          originalCanvas.width = originalImg.naturalWidth;
          originalCanvas.height = originalImg.naturalHeight;
          originalContext.drawImage(originalImg, 0, 0);
          const originalData = originalContext.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

          artCanvasRef.current = { canvas, context, originalData };
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          setCanvasTexture(texture);
        });
      };
      return;
    }

    if (!art.imagePath) {
      setCanvasTexture(null);
      artCanvasRef.current = { canvas: null, context: null, originalData: null };
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(art.imagePath, (loadedTexture) => {
      const img = loadedTexture.image;
      if (!img || img.naturalHeight === 0) return;

      // 1. 获取正确的宽高比
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
  }, [art.imagePath, art.modifiedImageData]);


  // 线稿再着色：只替换黑色轮廓像素，保留填充区域
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


  // 将 position/rotation/scale 同步到 mesh，并在首次加载时自适应宽高比
  useLayoutEffect(() => {
    if (meshRef.current) {
      const position = art.position || [0, 0, 0];
      const rotation = art.rotation || [0, 0, 0];

      // 优先使用 surfaceZ 确保初始位置贴合
      // 在此叠加 uniqueOffset 确保每个图案有微小深度差异
      const baseZ = (surfaceZ !== undefined && surfaceZ !== null) ? surfaceZ : position[2];
      const targetZ = baseZ - uniqueOffset;

      meshRef.current.position.set(position[0], position[1], targetZ);
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);

      // 仅在首次加载且 aspect 存在时，根据比例重置 Scale
      if (isInitialLoadRef.current && aspectRatio) {
        isInitialLoadRef.current = false;

        const baseSize = 0.2; // 默认基准宽度

        const newScaleX = baseSize;
        const newScaleY = baseSize / aspectRatio;

        // 保留 X 的符号（翻转）
        const currentScaleX = art.scale ? art.scale[0] : 0.2;
        const signX = Math.sign(currentScaleX);

        meshRef.current.scale.set(
          newScaleX * signX,
          newScaleY * signX, // Y 也跟随翻转，保持一致（或者你想让 Y 独立？）通常保持一致
          1 // Z 轴缩放通常为 1
        );

        // 立即回写正确的比例到状态
        onTransformEnd(art.id, {
          position: [position[0], position[1], targetZ],
          scale: meshRef.current.scale.toArray(),
          rotation: meshRef.current.rotation.toArray().slice(0, 3)
        }, { replaceHistory: true });

      } else if (!isInitialLoadRef.current) {
        // 如果不是首次加载（例如拖拽、选中、重绘），则使用传入的 scale
        if (art.scale) {
          meshRef.current.scale.set(art.scale[0], art.scale[1], art.scale[2] || 1);
        }
      }

      // 更新初始尺寸显示
      if (meshRef.current) {
        // 假定 1 unit = 1 meter, 1 meter = 39.37 inches
        const toInches = 39.37;
        const w = Math.abs(meshRef.current.scale.x) * toInches;
        const h = Math.abs(meshRef.current.scale.y) * toInches;
        setDimensionsLabel({ width: w, height: h });
      }
    }
  }, [art.id, art.position, art.scale, art.rotation, aspectRatio, onTransformEnd, surfaceZ, uniqueOffset]);

  // --- 智能贴合核心逻辑 ---
  useEffect(() => {
    if (surfaceZ !== null && surfaceZ !== undefined) {
      // 在比较时，要考虑到 uniqueOffset
      const currentZ = art.position ? art.position[2] : 0;
      // 我们希望 currentZ 接近 (surfaceZ - uniqueOffset)
      const targetZ = surfaceZ - uniqueOffset;

      if (Math.abs(currentZ - targetZ) > 0.002) {
        const newPos = [
          art.position ? art.position[0] : 0,
          art.position ? art.position[1] : 0,
          targetZ
        ];
        if (meshRef.current) {
          meshRef.current.position.z = targetZ;
        }
        onTransformEnd(art.id, { position: newPos });
      }
    }
  }, [surfaceZ, art.position, art.id, onTransformEnd, uniqueOffset]);


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
  // 锁定平面厚度（Z 缩放）并实时更新尺寸标签
  const onTransformChangeHandler = () => {
    if (meshRef.current) {
      if (controlRef.current.mode === 'scale') {
        const scale = meshRef.current.scale;
        const lastScale = lastScaleRef.current;
        if (!lastScale) {
          lastScaleRef.current = [...scale.toArray()];
        } else {
          scale.z = lastScale[2] || 1;
        }
      }

      // 实时更新尺寸
      // 假定 1 unit = 1 meter, 1 meter = 39.37 inches
      const toInches = 39.37;
      const w = Math.abs(meshRef.current.scale.x) * toInches;
      const h = Math.abs(meshRef.current.scale.y) * toInches;
      setDimensionsLabel({ width: w, height: h });
    }
  };

  return (
    <group ref={ref}>
      {isSelected && (
        <>
          <TransformControls
            ref={controlRef}
            object={meshRef}
            onMouseDown={onTransformStartHandler}
            onMouseUp={onTransformEndHandler}
            onChange={onTransformChangeHandler}
            mode={transformMode}
          />
          {/* 显示尺寸标签 (移除了原来的局部 gridHelper) */}
          <group position={art.position}>
          </group>
        </>
      )}
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected && isFillModeActive) {
            const { canvas, context, originalData } = artCanvasRef.current;
            if (canvas && context && originalData && canvasTexture) {
              const rgbColor = new THREE.Color(fillColor || '#4285F4')
                .toArray()
                .map(c => Math.round(c * 255));

              if (e.shiftKey) {
                if (e.uv) {
                  const pixelX = Math.floor(e.uv.x * canvas.width);
                  const pixelY = Math.floor((1 - e.uv.y) * canvas.height);
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
              } else {
                globalFill(
                  context,
                  canvas,
                  originalData,
                  rgbColor
                );
              }

              const newDataUrl = canvas.toDataURL('image/png');
              onTransformEnd(art.id, { modifiedImageData: newDataUrl });
              canvasTexture.needsUpdate = true;
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
          polygonOffset={true}
          polygonOffsetFactor={-1} // 基础偏移
          polygonOffsetUnits={-1}
          depthTest={true}
          depthWrite={false} // 重要：半透明物体通常关闭 depthWrite 以正确混合
        />

        {/* 当被选中时，显示尺寸标签和蓝色边框，但移除内部的 gridHelper */}
        {isSelected && (
          <>
            <Html position={[0.6, 0.6, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif'
              }}>
                {dimensionsLabel.width.toFixed(2)}" x {dimensionsLabel.height.toFixed(2)}"
              </div>
            </Html>

            {/* 仅保留外部边框辅助线 */}
            <lineSegments>
              <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
              <lineBasicMaterial color="#1890ff" linewidth={2} />
            </lineSegments>
          </>
        )}
      </mesh>
    </group>
  );
});

export default InteractiveArtPlane;