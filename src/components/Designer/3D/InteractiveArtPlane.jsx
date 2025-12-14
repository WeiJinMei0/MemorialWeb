import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { floodFill } from './utils';
import {
  DeleteOutlined,
  SwapOutlined,
  ExpandOutlined,
  ReloadOutlined,
  DragOutlined,
  CopyOutlined,
  SaveOutlined
} from '@ant-design/icons';

// --- 辅助函数 ---

const parseColorToRGBA = (colorStr) => {
  if (!colorStr) return [66, 133, 244, 255];
  if (colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0];
  if (typeof colorStr === 'string' && colorStr.startsWith('rgba')) {
    const parts = colorStr.match(/(\d+(\.\d+)?)/g);
    if (parts && parts.length >= 4) {
      return [
        parseInt(parts[0], 10),
        parseInt(parts[1], 10),
        parseInt(parts[2], 10),
        Math.round(parseFloat(parts[3]) * 255)
      ];
    }
  }
  const c = new THREE.Color(colorStr);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), 255];
};

const globalFill = (context, canvas, originalData, rgbaColor) => {
  const width = canvas.width;
  const height = canvas.height;
  const currentImageData = context.getImageData(0, 0, width, height);
  const data = currentImageData.data;
  const oData = originalData.data;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const getIdx = (x, y) => y * width + x;
  const isLine = (x, y) => {
    const i = (y * width + x) * 4;
    return oData[i] < 100 && oData[i + 1] < 100 && oData[i + 2] < 100 && oData[i + 3] > 10;
  };
  const checkAndAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = getIdx(x, y);
    if (visited[idx] === 1) return;
    visited[idx] = 1;
    if (!isLine(x, y)) queue.push({ x, y });
  };
  for (let x = 0; x < width; x++) { checkAndAdd(x, 0); checkAndAdd(x, height - 1); }
  for (let y = 0; y < height; y++) { checkAndAdd(0, y); checkAndAdd(width - 1, y); }
  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    checkAndAdd(x + 1, y); checkAndAdd(x - 1, y); checkAndAdd(x, y + 1); checkAndAdd(x, y - 1);
  }
  const [r, g, b, a] = rgbaColor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIdx(x, y);
      if (visited[idx] === 0 && !isLine(x, y)) {
        const i = idx * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
      }
    }
  }
  context.putImageData(currentImageData, 0, 0);
};

// --- 主组件 ---

const InteractiveArtPlane = forwardRef(({
  art,
  isSelected,
  onSelect,
  onTransformEnd,
  fillColor,
  isFillModeActive,
  surfaceZ,
  monumentThickness = 0,
  onDelete,
  onFlip,
  onMirrorCopy,
  onSave,
  isPartialFill = false
}, ref) => {
  const { camera, gl, raycaster } = useThree();
  const meshRef = useRef();
  const [canvasTexture, setCanvasTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  const isInitialLoadRef = useRef(true);
  const [dimensionsLabel, setDimensionsLabel] = useState({ width: 0, height: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // 交互状态Ref
  const interactionRef = useRef({
    mode: null, // 'move', 'scale', 'rotate'
    startMouse: new THREE.Vector3(),
    startPosition: new THREE.Vector3(),
    startScale: new THREE.Vector3(),
    startRotation: new THREE.Euler(),
    planeZ: 0,
  });

  const artCanvasRef = useRef({ canvas: null, context: null, originalData: null });
  const uniqueOffset = useMemo(() => Math.random() * 0.0009 + 0.0001, []);
  const manualOffset = 0.005;

  // --- 辅助方法 ---
  const getMouseOnPlane = (clientX, clientY, z) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  };

  useImperativeHandle(ref, () => ({
    getCanvasDataURL: () => artCanvasRef.current?.canvas?.toDataURL('image/png')
  }), []);

  // 光标样式
  useEffect(() => {
    if (isSelected && isHovered && !isFillModeActive) {
      document.body.style.cursor = 'move';
    } else if (isHovered && isFillModeActive) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => { document.body.style.cursor = 'auto'; };
  }, [isHovered, isSelected, isFillModeActive]);

  // 加载图片
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (art.modifiedImageData) {
      const img = new Image();
      img.src = art.modifiedImageData;
      img.onload = () => {
        if (!img || img.naturalHeight === 0) return;
        setAspectRatio(img.naturalWidth / img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const loader = new THREE.TextureLoader();
        loader.load(art.imagePath, (tex) => {
          const oCanvas = document.createElement('canvas');
          oCanvas.width = tex.image.naturalWidth;
          oCanvas.height = tex.image.naturalHeight;
          const oCtx = oCanvas.getContext('2d', { willReadFrequently: true });
          oCtx.drawImage(tex.image, 0, 0);
          artCanvasRef.current = { canvas, context: ctx, originalData: oCtx.getImageData(0, 0, oCanvas.width, oCanvas.height) };
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          setCanvasTexture(texture);
        });
      };
      return;
    }
    if (!art.imagePath) { setCanvasTexture(null); return; }

    new THREE.TextureLoader().load(art.imagePath, (tex) => {
      const img = tex.image;
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      artCanvasRef.current = { canvas, context: ctx, originalData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      setCanvasTexture(texture);
    });
  }, [art.imagePath, art.modifiedImageData]);

  // 线稿着色 (Line Color) Logic
  useEffect(() => {
    const lineColor = art.properties?.lineColor || '#FFFFFF';
    const lineAlpha = art.properties?.lineAlpha;

    const { context, originalData, canvas } = artCanvasRef.current;
    if (!context || !originalData || !canvasTexture) return;

    const w = canvas.width, h = canvas.height;
    const newData = new ImageData(w, h);
    const d = newData.data;
    const o = originalData.data;
    const c = context.getImageData(0, 0, w, h).data;
    let rgb = null;

    if (lineColor) rgb = new THREE.Color(lineColor).toArray().map(v => Math.round(v * 255));

    for (let i = 0; i < o.length; i += 4) {
      if (o[i] < 100 && o[i + 1] < 100 && o[i + 2] < 100 && o[i + 3] > 10) {
        if (rgb) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; }
        else { d[i] = o[i]; d[i + 1] = o[i + 1]; d[i + 2] = o[i + 2]; }
        d[i + 3] = o[i + 3] * (lineAlpha ?? 1.0);
      } else {
        d[i] = c[i]; d[i + 1] = c[i + 1]; d[i + 2] = c[i + 2]; d[i + 3] = c[i + 3];
      }
    }
    context.putImageData(newData, 0, 0);
    canvasTexture.needsUpdate = true;
  }, [art.properties?.lineColor, art.properties?.lineAlpha, canvasTexture]);

  // 自动填充逻辑 (Auto Fill)
  useEffect(() => {
    if (!canvasTexture || !artCanvasRef.current.context) return;

    // 【重要修复】：只有当前被选中的图案才响应全局填充颜色的变化
    // 防止更改颜色时错误地填充所有图案
    if (!isSelected) return;

    if (isFillModeActive && isPartialFill) {
      return;
    }
    const isTransparent = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';
    if (isTransparent || isFillModeActive) {
      const { canvas, context, originalData } = artCanvasRef.current;
      if (canvas && context && originalData) {
        const rgbaColor = parseColorToRGBA(fillColor || '#4285F4');
        globalFill(context, canvas, originalData, rgbaColor);
        canvasTexture.needsUpdate = true;
      }
    }
  }, [fillColor, isPartialFill, isFillModeActive, canvasTexture, isSelected]); // 添加 isSelected 依赖

  // 初始化 Transform 及位置逻辑
  useLayoutEffect(() => {
    if (meshRef.current) {
      const pos = art.position || [0, 0, 0];
      const rot = art.rotation || [0, 0, 0];
      const baseZ = (surfaceZ !== undefined && surfaceZ !== null) ? surfaceZ : pos[2];
      const isBack = art.side === 'back';
      let targetZ;
      if (isBack) {
        targetZ = baseZ + 0.005 + monumentThickness + manualOffset + uniqueOffset;
      } else {
        targetZ = baseZ - uniqueOffset;
      }
      meshRef.current.position.set(pos[0], pos[1], targetZ);
      meshRef.current.rotation.set(rot[0], rot[1], rot[2]);
      if (isInitialLoadRef.current && aspectRatio) {
        isInitialLoadRef.current = false;
        const baseSize = 0.2;
        const scaleX = art.scale ? art.scale[0] : (baseSize * Math.sign(art.scale?.[0] || 1));
        const scaleY = Math.abs(scaleX) / aspectRatio * Math.sign(art.scale?.[1] || 1);
        let finalSide = art.side;
        if (!finalSide) {
          const isBackView = camera.position.z > 0;
          finalSide = isBackView ? 'back' : 'front';
          if (finalSide === 'back') {
            targetZ = baseZ + 0.005 + monumentThickness + manualOffset + uniqueOffset;
            meshRef.current.position.set(pos[0], pos[1], targetZ);
          } else {
            targetZ = baseZ - uniqueOffset;
            meshRef.current.position.set(pos[0], pos[1], targetZ);
          }
        }
        meshRef.current.scale.set(scaleX, scaleY, 1);
        onTransformEnd(art.id, {
          position: [pos[0], pos[1], targetZ],
          scale: [scaleX, scaleY, 1],
          rotation: rot,
          side: finalSide
        }, { replaceHistory: true });
      } else if (!isInitialLoadRef.current && art.scale) {
        meshRef.current.scale.set(art.scale[0], art.scale[1], art.scale[2] || 1);
      }
      const toInches = 39.37;
      setDimensionsLabel({
        width: Math.abs(meshRef.current.scale.x) * toInches,
        height: Math.abs(meshRef.current.scale.y) * toInches
      });
    }
  }, [art.id, art.position, art.scale, art.rotation, aspectRatio, surfaceZ, monumentThickness, art.side]);

  // --- 交互逻辑 ---

  const startInteraction = (e, mode) => {
    if (!isSelected || !meshRef.current) return;

    // 【重要修复】：如果处于填充模式但禁用了局部填充（即 Insert 模式），允许交互（移动/缩放）
    // 只在局部填充模式下（需要点击像素）禁用交互
    if (isFillModeActive && isPartialFill) return;

    if (e.button !== 0) return;

    e.stopPropagation();

    const mesh = meshRef.current;
    const worldZ = mesh.position.z;
    const mouseWorld = getMouseOnPlane(e.clientX, e.clientY, worldZ);
    if (!mouseWorld) return;

    interactionRef.current = {
      mode,
      startMouse: mouseWorld,
      startPosition: mesh.position.clone(),
      startScale: mesh.scale.clone(),
      startRotation: mesh.rotation.clone(),
      planeZ: worldZ
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    const { mode, startMouse, startPosition, startScale, startRotation, planeZ } = interactionRef.current;
    if (!mode || !meshRef.current) return;

    const currentMouse = getMouseOnPlane(e.clientX, e.clientY, planeZ);
    if (!currentMouse) return;

    const mesh = meshRef.current;

    if (mode === 'move') {
      const delta = currentMouse.clone().sub(startMouse);
      mesh.position.copy(startPosition.clone().add(delta));
    }
    else if (mode === 'scale') {
      const center = startPosition;
      const startDist = center.distanceTo(startMouse);
      const currDist = center.distanceTo(currentMouse);

      if (startDist > 0.0001) {
        const factor = currDist / startDist;
        mesh.scale.set(
          startScale.x * factor,
          startScale.y * factor,
          startScale.z
        );
      }
      const toInches = 39.37;
      setDimensionsLabel({
        width: Math.abs(mesh.scale.x) * toInches,
        height: Math.abs(mesh.scale.y) * toInches
      });
    }
    else if (mode === 'rotate') {
      const center = startPosition;
      const startAngle = Math.atan2(startMouse.y - center.y, startMouse.x - center.x);
      const currAngle = Math.atan2(currentMouse.y - center.y, currentMouse.x - center.x);
      const deltaAngle = currAngle - startAngle;

      mesh.rotation.set(
        startRotation.x,
        startRotation.y,
        startRotation.z + deltaAngle
      );
    }
  };

  const handlePointerUp = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    if (interactionRef.current.mode && meshRef.current) {
      onTransformEnd(art.id, {
        position: meshRef.current.position.toArray(),
        scale: meshRef.current.scale.toArray(),
        rotation: meshRef.current.rotation.toArray().slice(0, 3)
      });
    }
    interactionRef.current.mode = null;
  };

  // --- 按钮处理 ---
  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(art.id, 'art');
  };

  const handleMirror = (e) => {
    e.stopPropagation();
    if (onFlip) onFlip(art.id, 'x', 'art');
  };

  const handleMirrorCopy = (e) => {
    e.stopPropagation();
    if (onMirrorCopy) onMirrorCopy(art.id, 'art');
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (onSave) onSave(art);
  };

  // 样式
  const btnStyle = {
    background: 'white',
    color: '#333',
    borderRadius: '50%',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    fontSize: '12px',
    pointerEvents: 'auto',
    transition: 'all 0.1s',
    border: '1px solid #e0e0e0'
  };

  // 计算当前的缩放符号，用于反向调整 HUD 位置
  const sx = Math.sign(art.scale?.[0] || 1);
  const sy = Math.sign(art.scale?.[1] || 1);

  // 【关键】：决定是否显示选择框控件
  // 如果被选中，且 (不是填充模式 或者 (是填充模式但未开启局部填充))，则显示
  // 这确保了在 Insert 模式下（全局填充，P为off），选择框依然可见
  const showControls = isSelected && (!isFillModeActive || !isPartialFill);

  return (
    <group ref={ref}>
      <mesh
        ref={meshRef}
        userData={{ isArtPlane: true, id: art.id }}
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
        onPointerDown={(e) => {
          // 防止从背面选中正面的图案，或从正面选中背面的图案
          const isBackView = camera.position.z > 0;
          const isArtBack = art.side === 'back';
          if (isBackView !== isArtBack) {
            return;
          }

          if (isFillModeActive) {
            e.stopPropagation();
            const { canvas, context, originalData } = artCanvasRef.current;
            if (canvas && context && originalData && canvasTexture) {
              const rgbaColor = parseColorToRGBA(fillColor || '#4285F4');

              // 逻辑更新：使用 isPartialFill 属性判断是否局部填充
              // Shift 键仍然作为辅助快捷键保留
              if ((isPartialFill || e.shiftKey) && e.uv) {
                floodFill(context, canvas, originalData, canvasTexture, Math.floor(e.uv.x * canvas.width), Math.floor((1 - e.uv.y) * canvas.height), rgbaColor);
              } else {
                // 如果不是局部模式，点击时执行一次全局填充 (虽然可能已经自动填充，但点击可以作为重置或确认)
                globalFill(context, canvas, originalData, rgbaColor);
              }
              onTransformEnd(art.id, { modifiedImageData: canvas.toDataURL('image/png') });
              canvasTexture.needsUpdate = true;
            }
          } else {
            if (!isSelected) {
              e.stopPropagation();
              onSelect(art.id);
            } else {
              startInteraction(e.nativeEvent, 'move');
            }
          }
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={canvasTexture}
          transparent={true}
          opacity={canvasTexture ? 1.0 : 0.8}
          side={THREE.DoubleSide}
          polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1}
          depthTest={true} depthWrite={false}
          emissive={0xffffff}
          emissiveMap={canvasTexture}
          emissiveIntensity={0.3}
        />

        {showControls && (
          <>
            <lineSegments>
              <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
              <lineBasicMaterial color="#1890ff" linewidth={2} />
            </lineSegments>

            <Html position={[0, 0.6 * sy, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {dimensionsLabel.width.toFixed(1)}" x {dimensionsLabel.height.toFixed(1)}"
              </div>
            </Html>

            <Html position={[-0.5 * sx, 0.5 * sy, 0]} zIndexRange={[100, 0]} center>
              <div style={btnStyle} onClick={handleMirror} title="镜像">
                <SwapOutlined />
              </div>
            </Html>

            <Html position={[-0.5 * sx, 0, 0]} zIndexRange={[100, 0]} center>
              <div style={btnStyle} onClick={handleMirrorCopy} title="镜像复制">
                <CopyOutlined />
              </div>
            </Html>

            <Html position={[0.5 * sx, 0.5 * sy, 0]} zIndexRange={[100, 0]} center>
              <div style={btnStyle} onClick={handleDelete} title="删除">
                <DeleteOutlined />
              </div>
            </Html>

            <Html position={[-0.5 * sx, -0.5 * sy, 0]} zIndexRange={[100, 0]} center>
              <div
                style={{ ...btnStyle, cursor: 'alias' }}
                onPointerDown={(e) => startInteraction(e.nativeEvent, 'rotate')}
                title="旋转"
              >
                <ReloadOutlined />
              </div>
            </Html>

            <Html position={[0.5 * sx, -0.5 * sy, 0]} zIndexRange={[100, 0]} center>
              <div
                style={{ ...btnStyle, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startInteraction(e.nativeEvent, 'scale')}
                title="缩放"
              >
                <ExpandOutlined />
              </div>
            </Html>

            <Html position={[0, 0.5 * sy, 0]} zIndexRange={[100, 0]} center>
              <div
                style={{
                  ...btnStyle,
                  cursor: 'move',
                  width: '24px',
                  height: '24px',
                  background: '#f0f5ff',
                  border: '1px solid #adc6ff',
                  color: '#1890ff'
                }}
                onPointerDown={(e) => startInteraction(e.nativeEvent, 'move')}
                title="移动"
              >
                <DragOutlined style={{ fontSize: '12px' }} />
              </div>
            </Html>

            <Html position={[0.5 * sx, 0, 0]} zIndexRange={[100, 0]} center>
              <div style={btnStyle} onClick={handleSave} title="保存到库">
                <SaveOutlined />
              </div>
            </Html>

          </>
        )}
      </mesh>
    </group>
  );
});

export default InteractiveArtPlane;