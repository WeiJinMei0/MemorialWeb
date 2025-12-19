// src/components/Designer/3d/Vase3D.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

// --- 操作图标 ---
import {
  DeleteOutlined,
  CopyOutlined,
  SwapOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';

// --- 性能优化：全局复用数学对象 ---
const _mouse = new THREE.Vector2();
const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _startPoint = new THREE.Vector3();
const _originalPos = new THREE.Vector3();
const _planeNormal = new THREE.Vector3(0, 0, 1);
const _plane = new THREE.Plane(_planeNormal, 0);
const _raycaster = new THREE.Raycaster();

const Vase3D = forwardRef(({
  vase,
  isSelected,
  onSelect,
  onUpdateVaseElementState,
  transformMode = 'translate',
  onDelete,
  onFlip,
  onDuplicate,
  onSave
}, ref) => {
  const { gl, camera, controls } = useThree();
  const groupRef = useRef();
  const controlRef = useRef();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [selectionBox, setSelectionBox] = useState(null);

  const [vaseTextures, setVaseTextures] = useState({
    polished: null,
    sandblasted: null
  });

  const dragRef = useRef({
    isDragging: false,
    rect: null,
  });

  // 用于防抖保存 Z 轴变化
  const saveTimeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getMesh: () => groupRef.current,
  }));

  // --- 1. 纹理加载 ---
  useEffect(() => {
    const colorFolderMap = {
      'Bahama Blue': 'Bahama Blue', 'Black': 'Black', 'Blue Pearl': 'Blue Pearl',
      'Charcoal': 'Charcoal', 'Grey': 'Grey', 'Ocean Green': 'Ocean Green',
      'Paradiso': 'Paradiso', 'PG red': 'PG red', 'Pink': 'Pink', 'Rustic Mahgoany': 'Rustic Mahgoany'
    };
    const color = vase.color || 'Black';
    const colorFolder = colorFolderMap[color] || 'Black';
    const loader = new THREE.TextureLoader();
    const polishedTex = loader.load(`/textures/Bases/${colorFolder}/磨光.jpg`, (t) => { t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; });
    const sandblastedTex = loader.load(`/textures/Bases/${colorFolder}/扫砂.jpg`, (t) => { t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; });
    setVaseTextures({ polished: polishedTex, sandblasted: sandblastedTex });
    return () => { polishedTex.dispose(); sandblastedTex.dispose(); };
  }, [vase.color]);

  // --- 2. 模型加载 ---
  useEffect(() => {
    let isMounted = true;
    if (!vaseTextures.polished || !vaseTextures.sandblasted) return;
    const loadModel = async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(vase.modelPath);
        if (!isMounted) return;
        const clonedScene = gltf.scene.clone();

        clonedScene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        if (isMounted) setSelectionBox({ size: size.toArray(), center: center.toArray() });

        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.setHex(0xffffff);
            if (child.name === 'vase') {
              child.material.map = vaseTextures.polished.clone();
              child.material.map.colorSpace = THREE.NoColorSpace;
              child.material.roughness = 1; child.material.metalness = 0.0;
            } else if (child.name === 'vaseInside') {
              child.material.map = vaseTextures.sandblasted.clone();
              child.material.map.colorSpace = THREE.NoColorSpace;
              child.material.roughness = 1; child.material.metalness = 0;
            } else {
              child.material.color = new THREE.Color(getColorValue(vase.color));
              child.material.roughness = 1; child.material.metalness = 0;
            }
            child.userData.isVase = true; child.userData.vaseId = vase.id; child.material.needsUpdate = true;
          }
        });
        if (isMounted) setModel(clonedScene);
      } catch (err) { if (isMounted) setError(true); }
    };
    loadModel();
    return () => { isMounted = false; };
  }, [vase.modelPath, vaseTextures, vase.color, vase.id]);

  // --- 3. 状态同步 ---
  useLayoutEffect(() => {
    // 只有非拖拽且非 Z 轴滚动调整时才同步
    if (groupRef.current && !dragRef.current.isDragging && !saveTimeoutRef.current) {
      groupRef.current.position.set(vase.position[0] || 0, vase.position[1] || 0, vase.position[2] || 0);
      groupRef.current.scale.set(vase.scale[0] || 1, vase.scale[1] || 1, vase.scale[2] || 1);
      groupRef.current.rotation.set(vase.rotation[0] || 0, vase.rotation[1] || 0, vase.rotation[2] || 0);
    }
  }, [vase.position, vase.scale, vase.rotation]);

  // --- 4. 按钮处理函数 ---
  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(vase.id, 'vase');
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(vase.id, 'vase');
  };

  const handleFlipX = (e) => {
    e.stopPropagation();
    if (onFlip) onFlip(vase.id, 'x', 'vase');
  };

  const handleFlipY = (e) => {
    e.stopPropagation();
    if (onFlip) onFlip(vase.id, 'y', 'vase');
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (onSave) onSave(vase);
  };

  // --- 5. 按钮样式 ---
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

  // --- 6. 计算选中框的四个角位置 ---
  const getCornerPositions = useMemo(() => {
    if (!selectionBox) return null;
    
    const { size, center } = selectionBox;
    const halfSize = new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
    
    // 计算四个角（在当前局部坐标系中）
    // 注意：我们使用 X 和 Y 方向的角，Z 方向保持中心
    return {
      topRight: [center[0] + halfSize.x, center[1] + halfSize.y, center[2]],
      topLeft: [center[0] - halfSize.x, center[1] + halfSize.y, center[2]],
      bottomRight: [center[0] + halfSize.x, center[1] - halfSize.y, center[2]],
      bottomLeft: [center[0] - halfSize.x, center[1] - halfSize.y, center[2]]
    };
  }, [selectionBox]);

  // --- 7. 交互样式 ---
  useEffect(() => {
    if (isSelected && transformMode === 'translate' && isHovered) {
      document.body.style.cursor = 'move';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => { document.body.style.cursor = 'auto'; };
  }, [isSelected, isHovered, transformMode]);

  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.mode = transformMode;
      controlRef.current.enabled = isSelected;
      if (transformMode === 'rotate') {
        controlRef.current.showX = false; controlRef.current.showY = false; controlRef.current.showZ = true;
      }
    }
  }, [isSelected, transformMode]);

  const commitTransform = () => {
    if (groupRef.current) {
      const newTransform = {
        position: groupRef.current.position.toArray(),
        scale: groupRef.current.scale.toArray(),
        rotation: groupRef.current.rotation.toArray().slice(0, 3)
      };
      onUpdateVaseElementState(vase.id, newTransform);
    }
  };

  // --- 8. 拖拽逻辑 (X/Y) ---
  const getIntersects = (clientX, clientY, rect, cameraZ) => {
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _mouse.set(x, y);
    _raycaster.setFromCamera(_mouse, camera);
    _plane.constant = -cameraZ;
    return _raycaster.ray.intersectPlane(_plane, _target);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (!isSelected) onSelect(vase.id);
    if (transformMode !== 'translate' || !groupRef.current) return;

    if (controls) controls.enabled = false;

    dragRef.current.isDragging = true;
    dragRef.current.rect = gl.domElement.getBoundingClientRect();
    _originalPos.copy(groupRef.current.position);

    const hit = getIntersects(e.nativeEvent.clientX, e.nativeEvent.clientY, dragRef.current.rect, _originalPos.z);
    if (hit) {
      _startPoint.copy(hit);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.isDragging || !groupRef.current) return;
    const hit = getIntersects(e.clientX, e.clientY, dragRef.current.rect, _originalPos.z);

    if (hit) {
      _offset.subVectors(hit, _startPoint);
      if (e.shiftKey) {
        if (Math.abs(_offset.x) > Math.abs(_offset.y)) _offset.y = 0;
        else _offset.x = 0;
      }
      _target.addVectors(_originalPos, _offset);
      groupRef.current.position.copy(_target);
    }
  };

  const onPointerUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.rect = null;
      if (controls) controls.enabled = true;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      commitTransform();
    }
  };

  // --- 9. 滚轮逻辑 (Z轴) ---
  const handleWheel = (e) => {
    if (!isSelected || transformMode !== 'translate' || !groupRef.current) return;

    // 阻止 OrbitControls 的缩放
    e.stopPropagation();

    // 计算 Z 轴位移
    // 滚轮通常 deltaY 为 100/-100，系数 0.0005 使其移动平滑
    const deltaZ = e.deltaY * 0.0005;

    // 直接应用视觉更新
    groupRef.current.position.z += deltaZ;

    // 防抖提交状态，避免频繁重渲染
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      commitTransform();
      saveTimeoutRef.current = null;
    }, 500);
  };

  const onHover = (hover) => {
    if (dragRef.current.isDragging) return;
    setIsHovered(hover);
  };

  const selectionBoxGeometry = useMemo(() => {
    if (!selectionBox) return null;
    return new THREE.BoxGeometry(...selectionBox.size);
  }, [selectionBox]);

  if (error) {
    return <mesh position={vase.position}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="red" /></mesh>;
  }

  return (
    <>
      <group
        ref={groupRef}
        userData={{ isVase: true, vaseId: vase.id }}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel} // 绑定滚轮事件实现 Z 轴移动
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        {!model ? (
          <mesh scale={[0.5, 0.5, 0.5]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="gray" transparent opacity={0.3} /></mesh>
        ) : (
          <>
            <primitive object={model} />
            
            {/* 选中框 */}
            {isSelected && selectionBox && selectionBoxGeometry && (
              <group position={selectionBox.center}>
                <lineSegments>
                  <edgesGeometry args={[selectionBoxGeometry]} />
                  <lineBasicMaterial color="#1890ff" depthTest={false} transparent opacity={0.8} />
                </lineSegments>
                
                {/* 操作按钮 - 放在四个角上 */}
                {getCornerPositions && (
                  <>
                    {/* 右上角：删除按钮 */}
                    <Html position={[selectionBox.size[0]/2, selectionBox.size[1]/2, 0]} zIndexRange={[100, 0]} center>
                      <div style={btnStyle} onClick={handleDelete} title="删除">
                        <DeleteOutlined />
                      </div>
                    </Html>
                    
                    {/* 左上角：左右翻转按钮 */}
                    <Html position={[-selectionBox.size[0]/2, selectionBox.size[1]/2, 0]} zIndexRange={[100, 0]} center>
                      <div style={btnStyle} onClick={handleFlipX} title="左右翻转">
                        <SwapOutlined />
                      </div>
                    </Html>
                    
                    {/* 右下角：上下翻转按钮 */}
                    <Html position={[selectionBox.size[0]/2, -selectionBox.size[1]/2, 0]} zIndexRange={[100, 0]} center>
                      <div style={btnStyle} onClick={handleFlipY} title="上下翻转">
                        <VerticalAlignTopOutlined />
                      </div>
                    </Html>
                    
                    {/* 左下角：复制按钮 */}
                    <Html position={[-selectionBox.size[0]/2, -selectionBox.size[1]/2, 0]} zIndexRange={[100, 0]} center>
                      <div style={btnStyle} onClick={handleDuplicate} title="复制">
                        <CopyOutlined />
                      </div>
                    </Html>
                  </>
                )}
              </group>
            )}
          </>
        )}
      </group>
    </>
  );
});

export default Vase3D;