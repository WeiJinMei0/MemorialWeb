import React, { forwardRef, useRef, useMemo, useEffect, useCallback, useImperativeHandle, useState, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model.jsx';
import Vase3D from './Vase3D.jsx';
import InteractiveArtPlane from './InteractiveArtPlane.jsx';
import EnhancedTextElement from './EnhancedTextElement.jsx';

/**
 * 碑体辅助网格组件
 */
const MonumentGrid = ({ width, height, position }) => {
  if (!width || !height) return null;
  const INCH_IN_METERS = 0.0254;
  const size = Math.max(width, height) * 3;
  const divisions = Math.ceil(size / INCH_IN_METERS);
  const actualSize = divisions * INCH_IN_METERS;

  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <gridHelper
        args={[actualSize, divisions, 0x1890ff, 0xdddddd]}
        position={[0, 0, 0]}
      />
    </group>
  );
};

/**
 * MonumentScene 是 3D 画布的聚合层
 */
const MonumentScene = forwardRef(({
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
  onTextContentChange,
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  currentTextId,
  isTextEditing,
  getFontPath,
  onVaseSelect,
  selectedVaseId,
  vaseTransformMode,
  onUpdateVaseElementState,
  onSceneDrop
}, ref) => {
  const { gl, scene, camera, raycaster, pointer } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const artPlaneRefs = useRef({});
  const vaseRefs = useRef({});

  // 点击空白退出 (修正后的逻辑)
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // 1. 基础检查：必须点击的是 canvas 且非填充模式
      if (event.target !== gl.domElement || isFillModeActive) {
        return;
      }

      // 2. 使用射线检测判断是否击中了场景中的物体
      raycaster.setFromCamera(pointer, camera);

      // 检测与场景中所有物体的交点
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 3. 查找第一个击中的可见 Mesh
      const hit = intersects.find(i => i.object.isMesh && i.object.visible);

      if (hit) {
        // 【关键修复】
        // 只要击中的物体是“图案平面”（无论是否是当前选中的那个），都视为有效交互。
        // 这避免了点击新图案时，因 React 状态尚未更新导致 ID 不匹配而触发的误取消。
        // 具体的选中切换逻辑由 InteractiveArtPlane 内部的 onPointerDown 负责。
        if (hit.object.userData?.isArtPlane) {
          return;
        }
      }

      // 4. 如果击中了其他物体（如墓碑底座）或者什么都没击中，才执行取消选中
      onArtElementSelect(null);
      if (isTextEditing && onTextSelect) {
        onTextSelect(null);
      }
      if (onVaseSelect) {
        onVaseSelect(null);
      }
    };

    const canvasDom = gl.domElement;
    canvasDom.addEventListener('click', handleGlobalClick);

    return () => {
      canvasDom.removeEventListener('click', handleGlobalClick);
    };
  }, [gl.domElement, isFillModeActive, onArtElementSelect, isTextEditing, onTextSelect, onVaseSelect, camera, raycaster, scene, pointer]);

  // 支持从外部拖入保存的艺术元素 JSON
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

  const handleSelectArtPlane = useCallback((artId) => {
    onArtElementSelect(artId);
  }, [onArtElementSelect]);

  const handleSelectVase = useCallback((vaseId) => {
    if (onVaseSelect) {
      onVaseSelect(vaseId);
    }
    if (onUpdateVaseElementState && vaseId) {
      onUpdateVaseElementState(vaseId, { isSelected: true });
    }
  }, [onVaseSelect, onUpdateVaseElementState]);

  // 背景图（HDRI）异步加载
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
    getArtCanvasData: () => {
      const artData = {};
      for (const artId in artPlaneRefs.current) {
        const artRef = artPlaneRefs.current[artId];
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

  const positions = useMemo(() => {
    const positions = {};

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
      return model ? (model.dimensions.height || 0) : 0;
    };

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
      const maxBaseLength = Math.max(...designState.bases.map(base => getModelLength(base.id)));
      if (maxBaseLength > 0) currentX_base = -maxBaseLength / 2;

      let baseYPosition = currentY_base;
      designState.bases.forEach((base, index) => {
        const height = getModelHeight(base.id);
        const length = getModelLength(base.id);
        positions[base.id] = [0, baseYPosition, -0.103];

        if (height > 0) {
          baseYPosition += height;
        }

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

  const [autoSurfaceZ, setAutoSurfaceZ] = useState(null);
  const mainMonument = designState.monuments[0];

  useLayoutEffect(() => {
    if (!mainMonument) return;
    const modelRef = modelRefs.current[mainMonument.id];
    if (!modelRef) return;

    const mesh = modelRef.getMesh();
    if (!mesh) return;

    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    const newZ = box.min.z - 0.005;

    if (autoSurfaceZ === null || Math.abs(newZ - autoSurfaceZ) > 0.001) {
      setAutoSurfaceZ(newZ);
    }
  }, [mainMonument, designState.monuments, autoSurfaceZ]);

  const showGrid = (selectedElementId !== null || currentTextId !== null) && mainMonument && autoSurfaceZ !== null && !isFillModeActive;

  return (
    <group ref={sceneRef}>

      <OrbitControls
        enabled={selectedElementId === null && currentTextId === null && selectedVaseId === null && !isFillModeActive}
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
          modelPath="/models/Bases/Base.glb"
          isMultiTextureBase={true}
          polish={subBase.polish}
          position={positions[subBase.id] || [0, 0, 0]}
          dimensions={subBase.dimensions}
          color={subBase.color}
          onDimensionsChange={(dims) => handleModelLoad(subBase.id, 'subBase', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(subBase.id, 'subBase')}
        />
      ))}

      {designState.bases.map(base => (
        <Model
          key={base.id}
          ref={el => modelRefs.current[base.id] = el}
          modelPath="/models/Bases/Base.glb"
          isMultiTextureBase={true}
          polish={base.polish}
          position={positions[base.id] || [0, 0, 0]}
          dimensions={base.dimensions}
          color={base.color}
          onDimensionsChange={(dims) => handleModelLoad(base.id, 'base', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(base.id, 'base')}
        />
      ))}

      {designState.monuments.map(monument => (
        <Model
          key={monument.id}
          ref={el => modelRefs.current[monument.id] = el}
          modelPath={monument.modelPath}
          isMultiTextureBase={true}
          polish={monument.polish}
          position={positions[monument.id] || [0, 0, 0]}
          dimensions={monument.dimensions}
          color={monument.color}
          onDimensionsChange={(dims) => handleModelLoad(monument.id, 'monument', dims)}
          isFillModeActive={isFillModeActive}
          onFillClick={() => onModelFillClick(monument.id, 'monument')}
        />
      ))}

      {designState.textElements.map(text => {
        const targetMonument = designState.monuments.find(m => m.id === text.monumentId);
        if (!targetMonument) return null;

        const isMainMonument = designState.monuments.length > 0 && targetMonument.id === designState.monuments[0].id;
        const effectiveSurfaceZ = isMainMonument ? autoSurfaceZ : null;

        return (
          <EnhancedTextElement
            key={text.id}
            text={text}
            monument={targetMonument}
            isSelected={currentTextId === text.id}
            onTextContentChange={onTextContentChange}
            isTextEditing={isTextEditing}
            onTextSelect={onTextSelect}
            onDeleteText={onDeleteText}
            onTextPositionChange={onTextPositionChange}
            onTextRotationChange={onTextRotationChange}
            getFontPath={getFontPath}
            modelRefs={modelRefs}
            globalTransformMode={transformMode}
            surfaceZ={effectiveSurfaceZ}
          />
        );
      })}

      {showGrid && positions[mainMonument.id] && (
        <MonumentGrid
          width={mainMonument.dimensions.length}
          height={mainMonument.dimensions.height}
          position={[
            positions[mainMonument.id][0],
            positions[mainMonument.id][1],
            autoSurfaceZ
          ]}
        />
      )}

      {designState.vases.map(vase => (
        <Vase3D
          key={vase.id}
          ref={el => vaseRefs.current[vase.id] = el}
          vase={vase}
          isSelected={selectedVaseId === vase.id}
          onSelect={handleSelectVase}
          onUpdateVaseElementState={onUpdateVaseElementState}
          transformMode={vaseTransformMode}
        />
      ))}

      {designState.artElements.map(art => (
        <InteractiveArtPlane
          key={art.id}
          ref={el => artPlaneRefs.current[art.id] = el}
          art={{ ...art, imagePath: art.imagePath }}
          isSelected={selectedElementId === art.id}
          onSelect={handleSelectArtPlane}
          onTransformEnd={onUpdateArtElementState}
          transformMode={transformMode}
          fillColor={fillColor}
          isFillModeActive={isFillModeActive}
          surfaceZ={autoSurfaceZ}
          onDelete={onDeleteElement}
          onFlip={onFlipElement}
          onMirrorCopy={onDuplicateElement}
        />
      ))}

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 10]} intensity={0.8} />
      <directionalLight position={[-5, 10, 10]} intensity={0.8} />
      <directionalLight position={[0, 5, -10]} intensity={0.6} />
      <directionalLight position={[-10, 0, 0]} intensity={0.4} />
      <directionalLight position={[10, 0, 0]} intensity={0.4} />

    </group>
  );
});

export default MonumentScene;