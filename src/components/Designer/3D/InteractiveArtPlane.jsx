// src/components/Designer/3d/InteractiveArtPlane.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { floodFill } from './utils';

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
  }, [art.id, art.imagePath]);


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
          }, { replaceHistory: true });
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

export default InteractiveArtPlane;