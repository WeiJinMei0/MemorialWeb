// src/components/Designer/3d/Model.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

// --- 全局复用数学对象 ---
const _mouse = new THREE.Vector2();
const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _startPoint = new THREE.Vector3();
const _originalPos = new THREE.Vector3();
const _planeNormal = new THREE.Vector3(0, 0, 1);
const _plane = new THREE.Plane(_planeNormal, 0);
const _raycaster = new THREE.Raycaster();

/**
 * Model 负责加载 GLB、绑定贴图、回传尺寸并兼容拖拽/填色模式。
 * 优化后的拖拽系统：平滑、流畅、高性能
 */
const Model = forwardRef(({
  modelPath,
  texturePath,
  position = [0, 0, 0],
  dimensions = { length: 1, width: 1, height: 1 },
  color = 'Black',
  polish,
  isMultiTextureBase = false,
  onLoad,
  onDimensionsChange,
  isFillModeActive,
  onFillClick,
  isDraggable = false,
  onSelect,
  isSelected = false,
  elementId,
  elementType,
  onSelectElement,
  onPositionChange,
}, ref) => {
  const groupRef = useRef();
  const { scene, gl, camera, controls } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 拖拽相关状态
  const dragRef = useRef({
    isDragging: false,
    rect: null,
  });

  // 防抖保存定时器
  const saveTimeoutRef = useRef(null);

  // 本地位置状态
  const [localPosition, setLocalPosition] = useState(() => new THREE.Vector3(...position));

  // 选中框状态
  const [selectionBox, setSelectionBox] = useState(null);

  // 底座状态
  const [multiTextureParts, setMultiTextureParts] = useState({
    surfaceA: null,
    surfaceB_meshes: [],
    surfaceC_meshes: []
  });
  const [baseTextures, setBaseTextures] = useState({
    polished: null,
    sandblasted: null,
    natural: null
  });

  const textureLoaderRef = useRef(new THREE.TextureLoader());

  useImperativeHandle(ref, () => ({
    getMesh: () => groupRef.current,
    getDimensions: () => originalDimensions,
    getPosition: () => localPosition.toArray(),
  }));

  // --- 位置同步 ---
  useLayoutEffect(() => {
    // 只在非拖拽状态下同步外部位置变化
    if (groupRef.current && !dragRef.current.isDragging) {
      const newPos = new THREE.Vector3(...position);
      groupRef.current.position.copy(newPos);
      setLocalPosition(newPos);
    }
  }, [position]);

  // --- 模型缩放同步 ---
  useLayoutEffect(() => {
    if (groupRef.current && model && originalDimensions) {
      const scaleX = originalDimensions.length === 0 ? 1 : dimensions.length / originalDimensions.length;
      const scaleY = originalDimensions.height === 0 ? 1 : dimensions.height / originalDimensions.height;
      const scaleZ = originalDimensions.width === 0 ? 1 : dimensions.width / originalDimensions.width;
      
      groupRef.current.scale.set(scaleX, scaleY, scaleZ);
      groupRef.current.updateMatrix();
      groupRef.current.updateWorldMatrix(true, true);
    }
  }, [dimensions, originalDimensions, model]);

  // --- 交互样式管理 ---
  useEffect(() => {
    if ((isSelected || isDraggable) && !isFillModeActive) {
      gl.domElement.style.cursor = isHovered ? 'move' : 'default';
    } else {
      gl.domElement.style.cursor = 'auto';
    }
    return () => { gl.domElement.style.cursor = 'auto'; };
  }, [isSelected, isHovered, isDraggable, gl, isFillModeActive]);

  // --- 拖拽辅助函数 ---
  const getIntersection = useCallback((clientX, clientY, rect, cameraZ) => {
    if (!rect || !camera) return null;
    
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    _mouse.set(x, y);
    _raycaster.setFromCamera(_mouse, camera);
    _plane.constant = -cameraZ;
    
    const intersection = _raycaster.ray.intersectPlane(_plane, _target);
    return intersection;
  }, [camera]);

  // --- 提交变换（防抖） ---
  const commitTransform = useCallback(() => {
    if (groupRef.current && onPositionChange) {
      onPositionChange(elementId, groupRef.current.position.toArray(), elementType);
    }
  }, [elementId, elementType, onPositionChange]);

  // --- 拖拽开始 ---
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    
    // 填充模式处理
    if (isFillModeActive && onFillClick) {
      onFillClick();
      return;
    }
    
    // 选中元素
    // if (onSelectElement) {
    //   onSelectElement(elementId, elementType);
    // }
    if (onSelectElement) {
      onSelectElement(elementId, elementType, e.nativeEvent); 
    }

    
    // 开始拖拽
    if (groupRef.current && isDraggable) {
      // 设置拖拽状态
      dragRef.current.isDragging = true;
      dragRef.current.rect = gl.domElement.getBoundingClientRect();
      
      // 记录初始位置
      _originalPos.copy(groupRef.current.position);
      
      // 禁用相机控制
      if (controls) {
        controls.enabled = false;
      }
      
      // 获取拖拽起点
      const hit = getIntersection(
        e.nativeEvent.clientX,
        e.nativeEvent.clientY,
        dragRef.current.rect,
        _originalPos.z
      );
      
      if (hit) {
        _startPoint.copy(hit);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
      }
    }
  }, [isFillModeActive, isDraggable, elementId, elementType, 
      onSelectElement, onFillClick, gl, controls, getIntersection]);

  // --- 拖拽移动（优化版） ---
  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.isDragging || !dragRef.current.rect || !groupRef.current) return;
    
    // 使用 requestAnimationFrame 确保平滑性
    requestAnimationFrame(() => {
      const hit = getIntersection(
        e.clientX,
        e.clientY,
        dragRef.current.rect,
        _originalPos.z
      );
      
      if (hit) {
        _offset.subVectors(hit, _startPoint);
        
        // Shift 键限制轴移动
        if (e.shiftKey) {
          if (Math.abs(_offset.x) > Math.abs(_offset.y)) {
            _offset.y = 0;
          } else {
            _offset.x = 0;
          }
        }
        
        // 计算新位置（保持 Z 轴不变）
        // 实时 position = 拖拽开始时模型的位置 + 鼠标在世界坐标里的位移
        const newPosition = new THREE.Vector3(
          _originalPos.x + _offset.x,
          _originalPos.y + _offset.y,
          _originalPos.z
        );
        // CS新增日志输出拖拽前后位置对比
        console.group(`【${elementId}】拖拽信息 =====`);
        console.log('原始位置:', _originalPos.toArray());
        console.log('拖拽后的位置:', newPosition.toArray());
        console.log('groupRef.current.position:', groupRef.current.position);
        console.groupEnd();
        
        // 直接更新本地位置（不触发外部状态）

        groupRef.current.position.copy(newPosition);
        setLocalPosition(newPosition);
      }
    });
  }, [getIntersection]);

  // --- 拖拽结束 ---
  const handlePointerUp = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.rect = null;
      
      // 恢复相机控制
      if (controls) {
        controls.enabled = true;
      }
      
      // 移除事件监听器
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      // 防抖提交位置变化
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        commitTransform();
        saveTimeoutRef.current = null;
      }, 16); // 约1帧时间
    }
  }, [controls, commitTransform, handlePointerMove]);

  // --- 清理事件监听器 ---
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [handlePointerMove]);

  // 添加悬停效果，考虑多选状态
  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    setIsHovered(true);
    
    // 如果按住 Ctrl，显示特殊光标
    if (e.ctrlKey || e.metaKey) {
      gl.domElement.style.cursor = 'copy';
    }
  }, [gl]);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    setIsHovered(false);
    // 恢复默认光标
    gl.domElement.style.cursor = 'auto';
  }, [gl]);

  // --- 纹理加载 ---
  useEffect(() => {
    if (!isMultiTextureBase) return;

    const colorFolderMap = {
      'Bahama Blue': 'Bahama Blue',
      'Black': 'Black',
      'Blue Pearl': 'Blue Pearl',
      'Charcoal': 'Charcoal',
      'Grey': 'Grey',
      'Ocean Green': 'Ocean Green',
      'Paradiso': 'Paradiso',
      'PG red': 'PG red',
      'Pink': 'Pink',
      'Rustic Mahgoany': 'Rustic Mahgoany'
    };
    const colorFolder = colorFolderMap[color] || 'Black';

    const loadTexture = (name) => {
      const tex = textureLoaderRef.current.load(
        `/textures/Bases/${colorFolder}/${name}.jpg`,
        (t) => {
          t.colorSpace = THREE.NoColorSpace;
          t.flipY = false;
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
        }
      );
      return tex;
    };

    setBaseTextures({
      polished: loadTexture('磨光'),
      sandblasted: loadTexture('扫砂'),
      natural: loadTexture('自然')
    });

    return () => {
      setBaseTextures(prev => {
        Object.values(prev).forEach(t => t?.dispose());
        return { polished: null, sandblasted: null, natural: null };
      });
    };
  }, [isMultiTextureBase, color]);

  // --- 模型加载 ---
  useEffect(() => {
    let isMounted = true;
    let currentSceneObject = null;
    setHasReportedDimensions(false);

    const loadModel = async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        if (!isMounted) return;

        const clonedScene = gltf.scene.clone();
        // clonedScene.position.copy(localPosition);// 会造成位置叠加
        // 【修复】模型位置固定为原点，由 group 控制实际位置
        // 避免 group.position + model.position 导致位置叠加
        clonedScene.position.set(0, 0, 0);

        if (!isMounted) return;

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const originalDims = { length: size.x, width: size.z, height: size.y };
        if (isMounted) {
          setOriginalDimensions(originalDims);
          setSelectionBox({ 
            size: [size.x, size.y, size.z], 
            center: [center.x, center.y, center.z] 
          });
        }

        if (onDimensionsChange && !hasReportedDimensions &&
          (dimensions.length === 0 || dimensions.width === 0 || dimensions.height === 0)) {
          onDimensionsChange(originalDims);
          setHasReportedDimensions(true);
        }

        if (isMultiTextureBase) {
          const parts = { surfaceA: null, surfaceB_meshes: [], surfaceC_meshes: [] };
          clonedScene.traverse((child) => {
            if (child.isMesh) {
              child.material = child.material.clone();
              child.material.roughness = 0.15;
              child.material.metalness = 0.1;
              child.material.envMapIntensity = 0.6;
              child.material.needsUpdate = true;

              const name = child.name;
              if (name === 'surfaceA') {
                parts.surfaceA = child;
              } else if (name.startsWith('surfaceB')) {
                parts.surfaceB_meshes.push(child);
              } else if (name.startsWith('surfaceC')) {
                parts.surfaceC_meshes.push(child);
              }
            }
          });
          if (isMounted) setMultiTextureParts(parts);
        } else {
          const textureLoader = new THREE.TextureLoader();
          clonedScene.traverse((child) => {
            if (child.isMesh) {
              textureLoader.load(texturePath, (texture) => {
                if (!isMounted) return;
                texture.colorSpace = THREE.NoColorSpace;
                child.material = new THREE.MeshStandardMaterial({
                  map: texture,
                  roughness: 0.7,
                  metalness: 0.1
                });
              }, undefined, () => {
                if (!isMounted) return;
                child.material = new THREE.MeshStandardMaterial({
                  color: getColorValue(color),
                  roughness: 0.7,
                  metalness: 0.1
                });
              });
            }
          });
        }        
        if (isMounted) {
          setModel(clonedScene);
          if (onLoad) onLoad(clonedScene);
        }
        
      } catch (err) {
        console.error(`Failed to load model: ${modelPath}`, err);
        if (isMounted) setError(true);
      }
    };

    loadModel();
    
    return () => {
      isMounted = false;
      if (currentSceneObject && gl.scene) {
        gl.scene.remove(currentSceneObject);
      }
    };
  }, [modelPath, color, texturePath, isMultiTextureBase, gl, onLoad, onDimensionsChange, dimensions, hasReportedDimensions]);

  // ===================================================
  // 🔍 模型原点 / 尺寸 / 关键点世界坐标强制校验（只在加载后执行）
  // ===================================================
  useLayoutEffect(() => {
    if (!groupRef.current || !model) return;
  
    // 1️⃣ 强制更新世界矩阵
    groupRef.current.updateWorldMatrix(true, true);
  
    // 2️⃣ 世界坐标下的包围盒（真实几何）
    const box = new THREE.Box3().setFromObject(groupRef.current);
  
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
  
    // 3️⃣ 关键几何点（世界坐标）
    const bottomCenterWorld = new THREE.Vector3(
      center.x,
      box.min.y,
      center.z
    );
  
    const topCenterWorld = new THREE.Vector3(
      center.x,
      box.max.y,
      center.z
    );
  
    // 4️⃣ pivot（模型原点）世界坐标
    const pivotWorld = new THREE.Vector3();
    groupRef.current.getWorldPosition(pivotWorld);
  
    // 5️⃣ 打印
    console.group(`📦【模型位置校验】${elementId || modelPath}`);
    // 模型原点（0,0,0）在整个世界坐标系中的最终位置
    console.log('📍 模型原点在世界坐标中的最终位置:', pivotWorld.toArray());
  
    console.log('📐 模型尺寸 (X,Y,Z):', size.toArray());
    console.log('⚪ 模型中心 (world):', center.toArray());
  
    console.log('⬇️ 模型底部中心 (world):', bottomCenterWorld.toArray());
    console.log('⬆️ 模型顶部中心 (world):', topCenterWorld.toArray());
  
    console.groupEnd();
  }, [model, localPosition]);

  // --- 动态贴图应用 ---
  useEffect(() => {
    if (!isMultiTextureBase || !polish || !baseTextures.polished || !multiTextureParts.surfaceA) {
      return;
    }

    const { surfaceA, surfaceB_meshes, surfaceC_meshes } = multiTextureParts;
    const { polished, sandblasted, natural } = baseTextures;

    let texA, texB_group, texC_group;
    const isBaseModel = modelPath === "/models/Bases/Base.glb";

    if (isBaseModel) {
      texA = polished;
      texB_group = (polish === 'PT') ? natural : polished;
      texC_group = (polish === 'P5') ? polished : natural;
    } else {
      switch (polish) {
        case 'P2': texA = polished; texB_group = natural; texC_group = natural; break;
        case 'P3': texA = polished; texB_group = natural; texC_group = polished; break;
        case 'P5': texA = polished; texB_group = polished; texC_group = polished; break;
        default: texA = polished; texB_group = natural; texC_group = natural; break;
      }
    }

    if (surfaceA) {
      surfaceA.material.map = texA.clone();
      surfaceA.material.map.colorSpace = THREE.NoColorSpace;
      surfaceA.material.map.needsUpdate = true;
      surfaceA.material.needsUpdate = true;
    }
    surfaceB_meshes.forEach(mesh => {
      mesh.material.map = texB_group.clone();
      mesh.material.map.colorSpace = THREE.NoColorSpace;
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    });
    surfaceC_meshes.forEach(mesh => {
      mesh.material.map = texC_group.clone();
      mesh.material.map.colorSpace = THREE.NoColorSpace;
      mesh.material.map.needsUpdate = true;
      mesh.material.needsUpdate = true;
    });

  }, [isMultiTextureBase, polish, baseTextures, multiTextureParts, modelPath]);

  // --- 性能优化：使用 useFrame 进行平滑更新 ---
  useFrame(() => {
    // 拖拽期间持续更新选中框位置
    if (dragRef.current.isDragging && groupRef.current && selectionBox) {
      groupRef.current.updateWorldMatrix(true, true);
    }
  });

  // --- 选中框组件 ---
  const SelectionBox = useMemo(() => {
    if (!isSelected || !selectionBox || !selectionBox.size) return null;
    
    const boxGeometry = new THREE.BoxGeometry(
      selectionBox.size[0], 
      selectionBox.size[1], 
      selectionBox.size[2]
    );
    
    return (
      <group position={selectionBox.center}>
        <lineSegments>
          <edgesGeometry args={[boxGeometry]} />
          <lineBasicMaterial 
            color="#1890ff"  // 🔵 蓝色
            linewidth={2} 
            depthTest={false}
            transparent 
            opacity={0.8}
          />
        </lineSegments>
      </group>
    );
  }, [isSelected, selectionBox]);

  if (error) {
    return (
      <mesh ref={groupRef} position={localPosition.toArray()}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}><div>Model Error</div></Html>
      </mesh>
    );
  }

  if (!model) {
    return (
      <mesh ref={groupRef} position={localPosition.toArray()} scale={[0.5, 0.5, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" transparent opacity={0.3} />
      </mesh>
    );
  }

  return (
    <group
      ref={groupRef}
      position={localPosition.toArray()}
      userData={{ 
        isModel: true, 
        modelId: elementId, 
        modelType: elementType,
        isDraggable: isDraggable && isSelected
      }}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={model} />
      {SelectionBox}
    </group>
  );
});

export default Model;