// src/components/Designer/3d/Model.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

// --- 性能优化：全局复用数学对象 ---
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
 * 修正了尺寸映射：Width 对应 Z (厚度), Height 对应 Y (高度)
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
  onSelectElement, // 新增：选中回调
  onPositionChange, // 新增：位置变化回调
  onClearSelection, // 新增：清除选中回调
}, ref) => {
  const groupRef = useRef();
  const { scene, gl, camera, controls } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

  // 拖拽相关状态
  const [isHovered, setIsHovered] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);

  // 拖拽状态Ref
  const dragRef = useRef({
    isDragging: false,
    rect: null,
    startWorldPos: new THREE.Vector3(),
    originalLocalPos: new THREE.Vector3(),
  });

  // 本地位置状态，用于实时更新
  const [localPosition, setLocalPosition] = useState(() => new THREE.Vector3(...position));

  // 同步外部位置变化
  useEffect(() => {
    if (!dragRef.current.isDragging) {
      setLocalPosition(new THREE.Vector3(...position));
      if (groupRef.current) {
        groupRef.current.position.set(...position);
      }
    }
  }, [position]);

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

  //  // --- 选中框逻辑 ---
  //  useEffect(() => {
  //   if (isSelected && groupRef.current) {
  //     // 计算包围盒
  //     const box = new THREE.Box3().setFromObject(groupRef.current);
  //     const size = new THREE.Vector3();
  //     box.getSize(size);
  //     const center = new THREE.Vector3();
  //     box.getCenter(center);
      
  //     // 设置选中框数据
  //     setSelectionBox({
  //       size: size.toArray(),
  //       center: center.toArray()
  //     });
  //   } else {
  //     setSelectionBox(null);
  //   }
  // }, [isSelected, dimensions, position, isDragging]);

  const getIntersection = useCallback((clientX, clientY, rect, cameraZ) => {
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _mouse.set(x, y);
    _raycaster.setFromCamera(_mouse, camera);
    _plane.constant = -cameraZ;
    return _raycaster.ray.intersectPlane(_plane, _target);
  }, [camera]);

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    
    // 填充模式处理
    if (isFillModeActive && onFillClick) {
      onFillClick();
      return;
    }
    
    // 选中元素
    if (!isSelected && onSelectElement) {
      onSelectElement(elementId, elementType);
    }
    
    if (!isSelected || !groupRef.current || !isDraggable) return;
    
    // 开始拖拽
    dragRef.current.isDragging = true;
    dragRef.current.rect = gl.domElement.getBoundingClientRect();
    
    // 记录初始位置
    dragRef.current.startWorldPos.copy(groupRef.current.getWorldPosition(new THREE.Vector3()));
    dragRef.current.originalLocalPos.copy(groupRef.current.position);
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
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
    
    // 阻止默认行为
    e.preventDefault();
  }, [isFillModeActive, isSelected, isDraggable, elementId, elementType, onSelectElement, onFillClick, gl, controls, getIntersection]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.isDragging || !dragRef.current.rect || !groupRef.current) return;
    
    const hit = getIntersection(
      e.clientX,
      e.clientY,
      dragRef.current.rect,
      _originalPos.z
    );
    
    if (hit) {
      _offset.subVectors(hit, _startPoint);
      
      // 如果按住Shift键，限制移动轴
      if (e.shiftKey) {
        if (Math.abs(_offset.x) > Math.abs(_offset.y)) {
          _offset.y = 0;
        } else {
          _offset.x = 0;
        }
      }
      
      // 只更新X和Y轴，保持Z轴不变
      _target.set(
        _originalPos.x + _offset.x,
        _originalPos.y + _offset.y,
        _originalPos.z // Z轴保持不变
      );
      
      // 直接更新模型位置（实时反馈）
      groupRef.current.position.copy(_target);
      setLocalPosition(_target.clone());
      
      // 实时更新外部状态（不防抖，确保流畅性）
      if (onPositionChange) {
        onPositionChange(elementId, _target.toArray(), elementType);
      }
    }
  }, [getIntersection, elementId, elementType, onPositionChange]);

  const onPointerUp = useCallback(() => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.rect = null;
      
      // 恢复相机控制
      if (controls) {
        controls.enabled = true;
      }
      
      // 提交最终位置
      if (groupRef.current && onPositionChange) {
        onPositionChange(elementId, groupRef.current.position.toArray(), elementType);
      }
      
      // 移除事件监听器
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }
  }, [controls, elementId, elementType, onPositionChange, onPointerMove]);

  // 清理事件监听器
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove]);


  // 加载底座/碑体贴图
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

  // 加载模型与基本材质
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
        clonedScene.position.copy(localPosition);

        if (!isMounted) return;

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const originalDims = { length: size.x, width: size.z, height: size.y };
        if (!isMounted) return;
        
        setOriginalDimensions(originalDims);
        setSelectionBox({ size: size.toArray(), center: center.toArray() });

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

        if (!isMounted) return;
        setModel(clonedScene);
        if (onLoad) onLoad(clonedScene);
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
  }, [modelPath, color, texturePath, isMultiTextureBase, localPosition]);

  // 动态贴图应用
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

  // 位置和缩放同步
  useLayoutEffect(() => {
    if (groupRef.current && model) {
      groupRef.current.position.copy(localPosition);
      
      if (originalDimensions) {
        const scaleX = originalDimensions.length === 0 ? 1 : dimensions.length / originalDimensions.length;
        const scaleY = originalDimensions.height === 0 ? 1 : dimensions.height / originalDimensions.height;
        const scaleZ = originalDimensions.width === 0 ? 1 : dimensions.width / originalDimensions.width;
        
        groupRef.current.scale.set(scaleX, scaleY, scaleZ);
        groupRef.current.updateMatrix();
        groupRef.current.updateWorldMatrix(true, true);
      }
    }
  }, [dimensions, originalDimensions, model, localPosition]);

  // --- 交互样式 ---
  useEffect(() => {
    if (isSelected && isDraggable) {
      gl.domElement.style.cursor = isHovered ? 'move' : 'auto';
    } else {
      gl.domElement.style.cursor = 'auto';
    }
    return () => { gl.domElement.style.cursor = 'auto'; };
  }, [isSelected, isHovered, isDraggable, gl]);

  // --- 选中框组件 ---
  const SelectionBox = () => {
    if (!isSelected || !selectionBox || !selectionBox.size) return null;
    
    return (
      <group position={selectionBox.center}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...selectionBox.size)]} />
          <lineBasicMaterial 
            color="#1890ff" 
            linewidth={2} 
            depthTest={false}
            transparent 
            opacity={0.8}
          />
        </lineSegments>
      </group>
    );
  };


  if (error) {
    return (
      <mesh ref={groupRef} position={position}>
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
      userData={{ 
        isModel: true, 
        modelId: elementId, 
        modelType: elementType,
        isDraggable: isDraggable && isSelected
      }}
      onPointerDown={handlePointerDown}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <primitive object={model} />
      <SelectionBox />
    </group>
  );
});

export default Model;