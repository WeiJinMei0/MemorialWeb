// src/components/Designer/Scene3D.jsx
import React, { forwardRef, Suspense,useRef,useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
// 引入新文件夹中的主场景
import MonumentScene from './3D/MonumentScene';
import { AxesHelper, Vector3  } from 'three';

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
          fov: 20, // 将 fov 从 25 修改为 20，物体被“视觉拉近”
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          stencil: true
        }}
        onCreated={({ gl, camera, size }) => {
          gl.setClearColor('#f0f2f5');
          
          // 仅打印画布中心点核心信息（修复变量作用域问题）
          // const centerWorld = new Vector3(0, 0, 0); // 3D场景中心
          // const centerScreen = centerWorld.clone().project(camera); // 转屏幕坐标
          
          // console.log('===== 画布中心点 =====');
          // console.log('世界坐标：', { x: centerWorld.x, y: centerWorld.y, z: centerWorld.z });
          // console.log('屏幕像素坐标：', {
          //   x: Math.round((centerScreen.x * 0.5 + 0.5) * size.width),
          //   y: Math.round((centerScreen.y * -0.5 + 0.5) * size.height)
          // });
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* 添加坐标轴
          <axesHelper args={[5]} />  */}
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