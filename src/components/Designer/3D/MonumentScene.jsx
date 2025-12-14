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
  const size = Math.max(width, height) * 10;
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
  onSceneDrop,
  isGridEnabled,
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
  onAddTextElement,
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

}, ref) => {
  const { gl, scene, camera, raycaster, pointer } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const artPlaneRefs = useRef({});
  const vaseRefs = useRef({});

  // 添加双击处理
  useEffect(() => {
    const handleDoubleClick = (event) => {
      // 必须在非填充模式下才能添加文本
      if (isFillModeActive) {
        return;
      }

      // 设置射线
      raycaster.setFromCamera(pointer, camera);

      // 检测与场景中所有物体的交点
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 查找第一个击中的可见 Mesh
      const hit = intersects.find(i => i.object.isMesh && i.object.visible);

      if (hit) {
        // 向上遍历查找 monument 对象
        let curr = hit.object;
        let monument = null;

        // 方法1: 检查是否直接匹配纪念碑的网格
        for (const monumentObj of designState.monuments) {
          const modelRef = modelRefs.current[monumentObj.id];
          if (modelRef && modelRef.getMesh) {
            const mesh = modelRef.getMesh();

            // 直接匹配
            if (mesh === curr) {
              monument = monumentObj;
              break;
            }

            // 遍历子对象匹配
            let found = false;
            mesh.traverse((child) => {
              if (child === curr) {
                monument = monumentObj;
                found = true;
              }
            });

            if (found) break;
          }
        }

        // 如果还没找到，尝试通过 userData 查找
        if (!monument) {
          while (curr) {
            // 检查对象是否有 monumentId 属性
            if (curr.userData?.monumentId) {
              monument = designState.monuments.find(m => m.id === curr.userData.monumentId);
              break;
            }

            // 检查对象是否是 monument 模型
            if (modelRefs.current) {
              for (const [modelId, modelRef] of Object.entries(modelRefs.current)) {
                if (modelRef && modelRef.getMesh && modelRef.getMesh() === curr) {
                  monument = designState.monuments.find(m => m.id === modelId);
                  if (monument) break;
                }
              }
            }

            if (monument) break;
            if (curr === scene) break;
            curr = curr.parent;
          }
        }

        // 如果找到 monument，则创建一个新的文本元素
        if (monument && onAddTextElement) {
          // 创建新的文本元素
          const newTextProperties = {
            content: 'Enter Text',
            font: 'Cambria_Regular',
            size: 3,
            monumentId: monument.id,
            position: [0, 0.3, 0], // 默认位置
            engraveType: 'vcut',
            vcutColor: '#FFFFFF'
          };

          // 调用回调函数添加文本
          onAddTextElement(newTextProperties);
        }
      }
    };

    const canvasDom = gl.domElement;
    canvasDom.addEventListener('dblclick', handleDoubleClick);

    return () => {
      canvasDom.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [gl.domElement, isFillModeActive, camera, raycaster, scene, pointer, designState.monuments, onAddTextElement, modelRefs]);

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
        // 【关键修复】：向上遍历父级，检查是否属于“受保护”的物体（花瓶或图案）
        // 这能解决花瓶换色后 Mesh 替换导致的选中失效问题
        let curr = hit.object;
        let isProtected = false;
        while (curr) {
          if (curr.userData?.isArtPlane || curr.userData?.isVase) {
            isProtected = true;
            break;
          }
          // 防止死循环（虽然在 Three.js 场景图中 parent 最终为 null）
          if (curr === scene) break;
          curr = curr.parent;
        }

        if (isProtected) {
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

  // 计算所有模型位置（含碑体、底座、副底座）
  const positions = useMemo(() => {
    const positions = {};

    // 工具函数：获取模型尺寸
    const getModelLength = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.x;
      }
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments].find(m => m.id === modelId);
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
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments].find(m => m.id === modelId);
      return model ? (model.dimensions.height || 0) : 0;
    };

    // 配置项
    const PAIR_SPACING = 1.0;
    const NO_SPACING = 0;
    const ALIGN_Z = -0.103;
    const baseInitY = -0.5;

    // 1. 先计算所有Base和Monument的动态居中位置（核心：先算完所有底座位置）
    const basePositionMap = {}; // 存储底座ID和最新位置的映射
    if (designState.monuments.length > 0) {
      const comboLengths = designState.monuments.map((monument, index) => {
        const monumentLength = getModelLength(monument.id);
        const base = designState.bases[index];
        const baseLength = base ? getModelLength(base.id) : monumentLength;
        return Math.max(monumentLength, baseLength);
      });

      const totalComboWidth = comboLengths.reduce((sum, len) => sum + len + PAIR_SPACING, 0) - PAIR_SPACING;
      const centerOffsetX = -totalComboWidth / 2;

      designState.monuments.forEach((monument, index) => {
        const prevComboTotal = comboLengths.slice(0, index).reduce((sum, len) => sum + len + PAIR_SPACING, 0);
        const currentComboLength = comboLengths[index];
        const comboCenterOffset = currentComboLength / 2;
        const finalX = centerOffsetX + prevComboTotal + comboCenterOffset;

        // 设置底座位置，并存入映射表
        const base = designState.bases[index];
        if (base) {
          const basePos = [finalX, baseInitY, ALIGN_Z];
          positions[base.id] = basePos;
          basePositionMap[base.id] = basePos; // 关键：记录底座最新位置
        }

        // 设置碑体位置
        const currentBaseY = base ? positions[base.id][1] : baseInitY;
        const currentBaseHeight = base ? getModelHeight(base.id) : 0;
        positions[monument.id] = [
          finalX,
          currentBaseY + currentBaseHeight + NO_SPACING,
          ALIGN_Z
        ];
      });
    }

    // 2. 计算SubBase位置（根据bindBaseId匹配底座最新位置，确保跟随）
    if (designState.subBases.length > 0 && Object.keys(basePositionMap).length > 0) {
      designState.subBases.forEach(subBase => {
        // 根据绑定的base.id获取底座最新位置
        const targetBasePos = basePositionMap[subBase.bindBaseId];
        if (targetBasePos) {
          const baseHeight = getModelHeight(subBase.bindBaseId); // 获取对应底座高度
          // SubBase位置：X/Y贴合底座底部，Z轴统一
          positions[subBase.id] = [
            targetBasePos[0], // X轴完全跟随底座
            targetBasePos[1] - baseHeight + NO_SPACING, // Y轴贴底座底部
            ALIGN_Z // Z轴统一
          ];
        } else {
          // 兜底位置（无匹配底座时）
          positions[subBase.id] = [0, baseInitY - 1, ALIGN_Z];
        }
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

  // 移除了 (selectedElementId !== null || currentTextId !== null) 判断
  // 现在的逻辑是：只有当开关开启 (isGridEnabled 为 true) 且不在填充模式时才显示designState={designState}
  const showGrid = isGridEnabled && mainMonument && autoSurfaceZ !== null && !isFillModeActive;


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

