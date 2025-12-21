// src/components/Designer/Scene3D.jsx
import React, { forwardRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
// 引入新文件夹中的主场景
import MonumentScene from './3D/MonumentScene';

const Loader = () => (
  <Html center>
    <div>Loading 3D Model...</div>
  </Html>
);

// 主场景包装器
const Scene3D = forwardRef(({
  background,
  onUpdateArtElementState,
  onArtElementSelect,
  selectedElementId,
  transformMode,
  isFillModeActive,
  fillColor,
  onModelFillClick,
  onAddTextElement,
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
  isGridEnabled,
  selectedModelId,
  selectedModelType,
  onSelectElement,
  onModelPositionChange,
  isViewRotatable = false,
  onResetView,
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
          position: [0, 0, -4],
          fov: 25,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          stencil: true // 关键：开启模板缓冲，支持 V-Cut 挖孔效果
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
            onAddTextElement={onAddTextElement}
            onTextPositionChange={onTextPositionChange}
            onTextRotationChange={onTextRotationChange}
            onTextSelect={onTextSelect}
            onDeleteText={onDeleteText}
            currentTextId={currentTextId}
            isTextEditing={isTextEditing}
            getFontPath={getFontPath}
            onVaseSelect={onVaseSelect}
            selectedVaseId={selectedVaseId}
            vaseTransformMode={vaseTransformMode}
            onUpdateVaseElementState={onUpdateVaseElementState}
            isGridEnabled={isGridEnabled}
            selectedModelId={selectedModelId}
            selectedModelType={selectedModelType}
            onSelectElement={onSelectElement}
            onModelPositionChange={onModelPositionChange}
            isViewRotatable={isViewRotatable}
            onResetView={onResetView}
            {...props}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Scene3D;