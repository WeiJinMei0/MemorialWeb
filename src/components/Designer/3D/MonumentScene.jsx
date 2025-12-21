import React, { forwardRef, useRef, useMemo, useEffect, useCallback, useImperativeHandle, useState, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AxesHelper } from 'three';
import * as THREE from 'three';
// import { OrbitControls, AxesHelper } from '@react-three/drei'; // 新增：导入 AxesHelper
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

// 工具函数（放在positions useMemo外，或内部）
const extractNumFromLabel = (label) => {
  const num = parseInt(label?.replace(/[^0-9]/g, ''), 10);
  return num || 0;
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
  isPartialFill,
  onModelFillClick,
  monumentColor, // 【新增】接收主碑颜色
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
  onSaveToArtOptions,
  selectedModelId,
  selectedModelType,
  onSelectElement,
  onModelPositionChange,
  isViewRotatable = false,
  onResetView,
}, ref) => {
  const { gl, scene, camera, raycaster, pointer } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const artPlaneRefs = useRef({});
  const vaseRefs = useRef({});
  const orbitControlsRef = useRef();

  // 新增：重置相机到正面视图的函数
  const resetCameraToFront = useCallback(() => {
    if (camera && orbitControlsRef.current) {
      // 设置正面视图的相机位置
      camera.position.set(0, 0, 4);
      camera.lookAt(0, 0, 0);
      
      // 重置控制器目标
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.set(0, 0, 0);
        orbitControlsRef.current.update();
      }
    }
  }, [camera]);

  // 新增：初始化时调用重置视图
  useEffect(() => {
    // 组件加载后重置到正面视图
    const timer = setTimeout(() => {
      resetCameraToFront();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [resetCameraToFront]);

  // 全局点击处理（点击空白处取消选中）
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // 只处理canvas上的点击
      if (event.target !== gl.domElement) return;
      
      // 检查是否点击到了模型
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // 查找第一个击中的可见 Mesh
      const hit = intersects.find(i => i.object.isMesh && i.object.visible);
      
      if (!hit) {
        // 点击空白处，清除所有选中
        if (onSelectElement) onSelectElement(null, null);
        // 同时清除其他元素的选中状态
        if (onArtElementSelect) onArtElementSelect(null);
        if (onTextSelect) onTextSelect(null);
        if (onVaseSelect) onVaseSelect(null);
      }
    };

    const canvasDom = gl.domElement;
    canvasDom.addEventListener('click', handleGlobalClick);

    return () => {
      canvasDom.removeEventListener('click', handleGlobalClick);
    };
  }, [gl.domElement,  onArtElementSelect, onTextSelect, onVaseSelect, camera, raycaster, scene, pointer]);

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

      if (hit && onAddTextElement) {
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
  },[gl.domElement, isFillModeActive, camera, raycaster, scene, pointer, onAddTextElement, modelRefs]);

  // 处理元素选中
  const handleSelectElement = useCallback((elementId, elementType) => {
    if (onSelectElement) {
      onSelectElement(elementId, elementType);
    }
  }, [onSelectElement]);

  // 处理模型位置变化
  const handleModelPositionChange = useCallback((elementId, newPosition, elementType) => {
    if (onModelPositionChange) {
      onModelPositionChange(elementId, newPosition, elementType);
    }
  }, [onModelPositionChange]);
  
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
    },
    // 新增：重置相机到正面视图的方法
    resetCameraToFront: () => {
      resetCameraToFront();
    }
  }));

  // 计算所有模型位置（含碑体、底座、副底座）
  const positions = useMemo(() => {
    const positions = {};
    const tabletInitLength = 0.761999964; // 碑体默认长度
    const tabletInitWidth = 0.20320001150977138;   // 碑体默认宽度
    const tabletInitHeight = 0.6095151570481228;  // 碑体默认高度

    const baseInitLength = 0.9144; // 底座默认长度
    const baseInitWidth = 0.3555999644456996;   // 底座默认宽度
    const baseInitHeight = 0.20320000099831273;  // 底座默认高度


    const baseInitX = 0;
    const baseInitY =  0 - baseInitHeight;  // 底座默认的初始 Y 轴位置
    const baseInitZ = 0;   // 底座默认的初始 Z 轴位置

    const tabletInitX = 0;
    const tabletInitY = 0; // 碑体默认的初始 Y 轴位置
    const tabletInitZ = 0; // 碑体默认的初始 Z 轴位置

    const monumentInitX = 0
    const monumentInitY = 0
    const monumentInitZ = 0

    const tabletList = designState.monuments.filter(m => m.family === 'Tablet');
    const baseList = designState.bases;
    const tabletCount = tabletList.length;
    const TABLET_SPACING_HALF = tabletInitWidth*1.5 ; // 对称间距（可调整）

    designState.bases.forEach((base) => {
      if (base.position && base.position.length === 3) {
        positions[base.id] = base.position;
      } else {
        positions[base.id] = [baseInitX, baseInitY, baseInitZ];
      }
    });
    // 1. 处理底座位置
    // designState.bases.forEach((base) => {
    //   // 对Tablet和Base按序号升序排序（小序号在前）
    //   const sortedTablets = [...tabletList].sort((a, b) => {
    //     const aNum = extractNumFromLabel(a.label);
    //     const bNum = extractNumFromLabel(b.label);
    //     return aNum - bNum;
    //   });
    //   const sortedBases = [...baseList].sort((a, b) => {
    //     const aNum = extractNumFromLabel(a.label);
    //     const bNum = extractNumFromLabel(b.label);
    //     return aNum - bNum;
    //   });
    //   // 获取当前Base的序号 + 在排序后Base列表中的索引
    //   const baseNum = extractNumFromLabel(base.label);
    //   const baseIndex = sortedBases.findIndex(b => b.id === base.id);
    //   console.log("sortedTablets:",sortedTablets)
    //   console.log("sortedBases:",sortedBases)
    //   console.log("baseIndex:",baseIndex)
    //   // 分场景计算Base位置（核心逻辑）
    //   let basePos;
    //   // 有Tablet → 按序号匹配base在Tablet正下方
    //   if (tabletCount > 0) {
    //     // 小序号Base对应小序号Tablet（baseIndex匹配sortedTablets索引）
    //     const targetTablet = sortedTablets[baseIndex];
    //     if (targetTablet && targetTablet.position && targetTablet.position.length === 3) {
    //       // Base位置 = 对应Tablet正下方（X/Z一致，Y=Tablet.Y - 底座高度）
    //       // basePos = [
    //       //   targetTablet.position[0],
    //       //   targetTablet.position[1] - baseInitHeight,
    //       //   targetTablet.position[2]
    //       // ];
    //       // basePos =  targetTablet.position; //指向了targetTablet.position的内存地址，引用赋值，会改变targetTablet.position的值
    //       basePos = [...targetTablet.position]; 
    //       console.log("basePos before:",basePos)
    //       console.log("targetTablet.position before:",targetTablet.position)
    //       basePos[1] = basePos[1] - baseInitHeight;
    //       console.log("basePos after:",basePos)
    //       console.log("targetTablet.position after:",targetTablet.position)
    //       console.log("1111111111111")
    //     } else {
    //       // 兜底：Tablet位置异常 → 用Base自身位置或默认位置
    //       basePos = (base.position && base.position.length === 3) 
    //         ? base.position 
    //         : [baseInitX, baseInitY, baseInitZ];
    //       console.log("222222222222222")
    //     }
    //   }
    //   // 无Tablet → 底座对称布局 
    //   else {
    //     if (baseCount === 1) {
    //       // 1个Base：默认位置 [0, -底座高度, 0]
    //       basePos = (base.position && base.position.length === 3) 
    //         ? base.position 
    //         : [baseInitX, baseInitY, baseInitZ];
    //         console.log("333333333333333")
    //     } else if (baseCount === 2) {
    //       // 2个Base：关于原点对称（X轴±TABLET_SPACING_HALF）
    //       basePos = (base.position && base.position.length === 3) 
    //         ? base.position 
    //         : [
    //             baseIndex === 0 ? -TABLET_SPACING_HALF : TABLET_SPACING_HALF,
    //             baseInitY,
    //             baseInitZ
    //           ];
    //       console.log("444444444444444444")
    //     } else {
    //       // 超过2个Base → 兜底默认位置
    //       basePos = (base.position && base.position.length === 3) 
    //         ? base.position 
    //         : [baseInitX, baseInitY, baseInitZ];
    //         console.log("5555555555555")
    //     }
    //   }
    //   console.log("basePos:",basePos)
    //   console.log("base.id:",base.id)
    //   // 最终：将计算后的位置存入positions
    //   positions[base.id] = basePos;
    // });


    // 2. 处理碑位置
    designState.monuments.forEach((monument) => {
      // 非Tablet碑体：判断位置是否为合法三维数组
      if (monument.family !== 'Tablet') {
        if (monument.position && monument.position.length === 3) {
          positions[monument.id] = monument.position;
        } else {
          positions[monument.id] = [monumentInitX, monumentInitY, monumentInitZ];
        }
      } 
      // Tablet碑体
      else {
        // 如果已有有效位置，直接使用（用户可能已拖动）
        if (monument.position && monument.position.length === 3) {
          positions[monument.id] = monument.position;
        } else {
          // 没有有效位置时，使用默认位置或对称布局
          let targetPosition = [monumentInitX, monumentInitY, monumentInitZ];
          
          // 对称布局：仅在初始化时（无位置）应用
          if (tabletCount === 2) {
            const sortedTablets = [...tabletList].sort((a, b) => {
              const aNum = extractNumFromLabel(a.label);
              const bNum = extractNumFromLabel(b.label);
              return aNum - bNum;
            });
            const tabletIndex = sortedTablets.findIndex(m => m.id === monument.id);
            targetPosition = [
              tabletIndex === 0 ? -TABLET_SPACING_HALF : TABLET_SPACING_HALF,
              monumentInitY,
              monumentInitZ
            ];
          }
          positions[monument.id] = targetPosition;
        }
      }
    });

    // 3. 处理副底座位置
    // designState.subBases.forEach(subBase => {
    //   if (subBase.position && subBase.position.length === 3) {
    //     positions[subBase.id] = subBase.position;
    //   } else {
    //     positions[subBase.id] = [baseInitX, baseInitY, baseInitZ];
    //   }
    // });

    return positions;
  }, [designState.subBases, designState.bases, designState.monuments]);

  const handleModelLoad = (elementId, elementType, dimensions) => {
    if (onDimensionsChange) {
      onDimensionsChange(elementId, dimensions, elementType);
    }
  };

  const [autoSurfaceZ, setAutoSurfaceZ] = useState(null);
  const [monumentThickness, setMonumentThickness] = useState(0.1);
  const mainMonument = designState.monuments[0];

  useLayoutEffect(() => {
    if (!mainMonument) return;
    const modelRef = modelRefs.current[mainMonument.id];
    if (!modelRef) return;

    const mesh = modelRef.getMesh();
    if (!mesh) return;

    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);

    // 计算前表面位置
    const newZ = box.min.z - 0.005;

    // 计算碑体厚度 (Z轴方向长度)
    const thickness = box.max.z - box.min.z;

    if (autoSurfaceZ === null || Math.abs(newZ - autoSurfaceZ) > 0.001) {
      setAutoSurfaceZ(newZ);
    }

    if (Math.abs(thickness - monumentThickness) > 0.001) {
      setMonumentThickness(thickness);
    }
  }, [mainMonument, designState.monuments, autoSurfaceZ, monumentThickness]);

  // --- 网格显示逻辑改进 ---
  const [gridSide, setGridSide] = useState('front');

  // 当网格开关开启时，检测一次摄像机位置，决定显示在正面还是反面
  useEffect(() => {
    if (isGridEnabled) {
      // 在 Three.js 坐标系中，若摄像机 z > 0 通常在物体前方(Front/Back取决于物体建模)
      // 根据 ArtPlane 的逻辑：isBackView = camera.position.z > 0;
      // 所以我们以此为基准：正 Z 轴方向为 'back' (背面), 负 Z 轴方向为 'front' (正面)
      const isBack = camera.position.z > 0;
      setGridSide(isBack ? 'back' : 'front');
    }
  }, [isGridEnabled, camera]);

  // 根据朝向计算网格的最终 Z 坐标
  const gridZ = useMemo(() => {
    if (autoSurfaceZ === null) return 0;
    if (gridSide === 'back') {
      // 反面位置: 前表面Z + 厚度 + 偏移量
      // autoSurfaceZ = box.min.z - 0.005
      // box.max.z = box.min.z + thickness
      // 所以 box.max.z = autoSurfaceZ + 0.005 + thickness
      // 我们希望网格在背面之后一点点: box.max.z + 0.005
      // 最终计算: autoSurfaceZ + thickness + 0.01
      return autoSurfaceZ + monumentThickness + 0.01;
    }
    // 正面位置: 前表面Z
    return autoSurfaceZ;
  }, [gridSide, autoSurfaceZ, monumentThickness]);

  // 移除了 (selectedElementId !== null || currentTextId !== null) 判断
  // 现在的逻辑是：只有当开关开启 (isGridEnabled 为 true) 且不在填充模式时才显示
  const showGrid = isGridEnabled && mainMonument && autoSurfaceZ !== null && !isFillModeActive;


  return (
    <group ref={sceneRef}>
      {/* 新增：中心坐标轴（原点处），长度设为 1 米（可自定义） */}
      {/* <axesHelper args={[1]} />  */}


      <OrbitControls
        ref={orbitControlsRef}
        enabled={isViewRotatable && !selectedModelId && !selectedElementId && !currentTextId && !selectedVaseId && !isFillModeActive}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        minPolarAngle={0}
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
          isDraggable={true}
          isSelected={selectedModelId === subBase.id && selectedModelType === 'subBase'}
          elementId={subBase.id}
          elementType="subBase"
          onSelectElement={handleSelectElement}
          onPositionChange={handleModelPositionChange}
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
          isDraggable={true}
          isSelected={selectedModelId === base.id && selectedModelType === 'base'}
          elementId={base.id}
          elementType="base"
          onSelectElement={handleSelectElement}
          onPositionChange={handleModelPositionChange}
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
          isDraggable={true}
          isSelected={selectedModelId === monument.id && selectedModelType === 'monument'}
          elementId={monument.id}
          elementType="monument"
          onSelectElement={handleSelectElement}
          onPositionChange={handleModelPositionChange}
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
            gridZ // 使用根据朝向计算出的 Z 值
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
          onDelete={onDeleteElement}
          onFlip={onFlipElement}
          onDuplicate={onDuplicateElement}
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
          // 在这里传递 isPartialFill
          isPartialFill={isPartialFill}
          // 【新增】传递碑体颜色
          monumentColor={monumentColor}
          surfaceZ={autoSurfaceZ}
          monumentThickness={monumentThickness}
          onDelete={onDeleteElement}
          onFlip={onFlipElement}
          onMirrorCopy={onDuplicateElement}
          onSave={onSaveToArtOptions} // 【新增】：传递保存回调
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