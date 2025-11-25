// src/components/Designer/3d/MonumentScene.jsx
import React, { forwardRef, useRef, useMemo, useEffect, useCallback, useImperativeHandle } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model.jsx';
import Vase3D from './Vase3D.jsx';
import InteractiveArtPlane from './InteractiveArtPlane.jsx';
import EnhancedTextElement from './EnhancedTextElement.jsx';

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
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const artPlaneRefs = useRef({});
  const vaseRefs = useRef({});

  const handleSceneClick = (e) => {
    // 使用 nativeEvent 获取原生 DOM 事件
    if (e.nativeEvent.target.tagName === 'CANVAS' && !isFillModeActive) {
      onArtElementSelect(null);
      if (isTextEditing && onTextSelect) {
        onTextSelect(null);
      }
      if (onVaseSelect) {
        onVaseSelect(null);
      }
    }
  };

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

  return (
    <group ref={sceneRef} onClick={handleSceneClick}>

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

      {designState.monuments.map(monument => {
        const monumentTexts = designState.textElements.filter(text => text.monumentId === monument.id);
        return (
          <React.Fragment key={`monument-${monument.id}`}>
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
                getFontPath={getFontPath}
                modelRefs={modelRefs}
              />
            ))}
          </React.Fragment>
        );
      })}

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
        />
      ))}

      {/* --- Updated Lighting Setup: Multi-point lighting for no obvious shadows --- */}
      <ambientLight intensity={0.4} />
      {/* Front Right (Key Light-ish) */}
      <directionalLight position={[5, 10, 10]} intensity={0.8} />
      {/* Front Left (Fill Light) */}
      <directionalLight position={[-5, 10, 10]} intensity={0.8} />
      {/* Back (Rim Light) - Helps separate from background */}
      <directionalLight position={[0, 5, -10]} intensity={0.6} />
      {/* Side Lights - Fills side shadows */}
      <directionalLight position={[-10, 0, 0]} intensity={0.4} />
      <directionalLight position={[10, 0, 0]} intensity={0.4} />

      <axesHelper args={[5]} />

    </group>
  );
});

export default MonumentScene;