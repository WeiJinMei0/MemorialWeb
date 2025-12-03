// src/components/Designer/3d/InteractiveArtPlane.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { floodFill } from './utils'; // 确保 utils.js 已经更新

/**
 * 辅助函数：将颜色字符串解析为 [r, g, b, a] 数组 (0-255)
 * 解决了 THREE.Color 丢失 Alpha 通道的问题
 */
const parseColorToRGBA = (colorStr) => {
  if (!colorStr) return [66, 133, 244, 255]; // 默认蓝色

  // 1. 显式处理透明关键字和全透明 RGBA
  if (colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return [0, 0, 0, 0];
  }

  // 2. 处理 rgba(r, g, b, a) 字符串
  if (typeof colorStr === 'string' && colorStr.startsWith('rgba')) {
    const parts = colorStr.match(/(\d+(\.\d+)?)/g);
    if (parts && parts.length >= 4) {
      return [
        parseInt(parts[0], 10),
        parseInt(parts[1], 10),
        parseInt(parts[2], 10),
        Math.round(parseFloat(parts[3]) * 255) // 将 0-1 的 alpha 转为 0-255
      ];
    }
  }

  // 3. 回退：处理 hex 或 rgb (不带 alpha)，默认 alpha 为 255
  const c = new THREE.Color(colorStr);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), 255];
};

/**
 * 辅助函数：整体填充所有封闭区域
 */
const globalFill = (context, canvas, originalData, rgbaColor) => {
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

  const checkAndAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = getIdx(x, y);
    if (visited[idx] === 1) return;

    visited[idx] = 1;

    if (!isLine(x, y)) {
      queue.push({ x, y });
    }
  };

  // 1. 初始化边界
  for (let x = 0; x < width; x++) {
    checkAndAdd(x, 0);
    checkAndAdd(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    checkAndAdd(0, y);
    checkAndAdd(width - 1, y);
  }

  // 2. BFS 扩散
  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    checkAndAdd(x + 1, y);
    checkAndAdd(x - 1, y);
    checkAndAdd(x, y + 1);
    checkAndAdd(x, y - 1);
  }

  // 3. 遍历并填充内部区域
  // 【关键修复】：应用 rgbaColor 的 alpha 通道
  const [r, g, b, a] = rgbaColor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIdx(x, y);
      if (visited[idx] === 0) { // 内部区域
        if (!isLine(x, y)) {
          const i = idx * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a; // <--- 之前这里是 255，现在改为变量 a
        }
      }
    }
  }

  context.putImageData(currentImageData, 0, 0);
};


const InteractiveArtPlane = forwardRef(({
  art,
  isSelected,
  onSelect,
  onTransformEnd,
  transformMode,
  fillColor,
  isFillModeActive,
  surfaceZ
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [canvasTexture, setCanvasTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  const lastScaleRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const [dimensionsLabel, setDimensionsLabel] = useState({ width: 0, height: 0 });

  const artCanvasRef = useRef({
    canvas: null,
    context: null,
    originalData: null
  });

  const uniqueOffset = useMemo(() => Math.random() * 0.0009 + 0.0001, []);
  const manualOffset = 0.005;

  useImperativeHandle(ref, () => ({
    getCanvasDataURL: () => {
      const { canvas } = artCanvasRef.current;
      if (canvas) {
        return canvas.toDataURL('image/png');
      }
      return null;
    }
  }), [artCanvasRef.current?.canvas]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    setAspectRatio(null);
  }, [art.id, art.imagePath]);

  // 加载图片逻辑
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

  // 线稿再着色逻辑
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

  // Transform 更新逻辑 (位置/缩放)
  useLayoutEffect(() => {
    if (meshRef.current) {
      const position = art.position || [0, 0, 0];
      const rotation = art.rotation || [0, 0, 0];

      const baseZ = (surfaceZ !== undefined && surfaceZ !== null) ? surfaceZ : position[2];
      const targetZ = baseZ - uniqueOffset + manualOffset;

      meshRef.current.position.set(position[0], position[1], targetZ);
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);

      if (isInitialLoadRef.current && aspectRatio) {
        isInitialLoadRef.current = false;

        const baseSize = 0.2;
        const newScaleX = baseSize;
        const newScaleY = baseSize / aspectRatio;
        const currentScaleX = art.scale ? art.scale[0] : 0.2;
        const signX = Math.sign(currentScaleX);

        meshRef.current.scale.set(newScaleX * signX, newScaleY * signX, 1);

        onTransformEnd(art.id, {
          position: [position[0], position[1], targetZ],
          scale: meshRef.current.scale.toArray(),
          rotation: meshRef.current.rotation.toArray().slice(0, 3)
        }, { replaceHistory: true });

      } else if (!isInitialLoadRef.current) {
        if (art.scale) {
          meshRef.current.scale.set(art.scale[0], art.scale[1], art.scale[2] || 1);
        }
      }

      if (meshRef.current) {
        const toInches = 39.37;
        const w = Math.abs(meshRef.current.scale.x) * toInches;
        const h = Math.abs(meshRef.current.scale.y) * toInches;
        setDimensionsLabel({ width: w, height: h });
      }
    }
  }, [art.id, art.position, art.scale, art.rotation, aspectRatio, onTransformEnd, surfaceZ, uniqueOffset, manualOffset]);

  // Z轴智能贴合
  useEffect(() => {
    if (surfaceZ !== null && surfaceZ !== undefined) {
      const currentZ = art.position ? art.position[2] : 0;
      const targetZ = surfaceZ - uniqueOffset + manualOffset;

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
  }, [surfaceZ, art.position, art.id, onTransformEnd, uniqueOffset, manualOffset]);

  // Transform controls setup
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.mode = transformMode;
      controlRef.current.enabled = isSelected && !isFillModeActive;
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
  }, [isSelected, transformMode, isFillModeActive]);

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
      const toInches = 39.37;
      const w = Math.abs(meshRef.current.scale.x) * toInches;
      const h = Math.abs(meshRef.current.scale.y) * toInches;
      setDimensionsLabel({ width: w, height: h });
    }
  };

  const showHelpers = isSelected && !isFillModeActive;

  return (
    <group ref={ref}>
      {showHelpers && (
        <>
          <TransformControls
            ref={controlRef}
            object={meshRef}
            onMouseDown={onTransformStartHandler}
            onMouseUp={onTransformEndHandler}
            onChange={onTransformChangeHandler}
            mode={transformMode}
          />
        </>
      )}
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected && isFillModeActive) {
            const { canvas, context, originalData } = artCanvasRef.current;
            if (canvas && context && originalData && canvasTexture) {

              // 【关键修复】：使用自定义解析器获取 [r, g, b, a]
              const rgbaColor = parseColorToRGBA(fillColor || '#4285F4');

              if (e.shiftKey) {
                if (e.uv) {
                  const pixelX = Math.floor(e.uv.x * canvas.width);
                  const pixelY = Math.floor((1 - e.uv.y) * canvas.height);

                  // 传递带有 alpha 的颜色数组给 floodFill
                  floodFill(
                    context,
                    canvas,
                    originalData,
                    canvasTexture,
                    pixelX,
                    pixelY,
                    rgbaColor
                  );
                }
              } else {
                // 传递带有 alpha 的颜色数组给 globalFill
                globalFill(
                  context,
                  canvas,
                  originalData,
                  rgbaColor
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
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          depthTest={true}
          depthWrite={false}
        />

        {showHelpers && (
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