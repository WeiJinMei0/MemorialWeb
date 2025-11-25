// src/components/Designer/3d/Vase3D.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

const Vase3D = forwardRef(({
  vase,
  isSelected,
  onSelect,
  onUpdateVaseElementState,
  transformMode = 'translate',
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [model, setModel] = useState(null);

  const [error, setError] = useState(false);

  // 纹理状态
  const [vaseTextures, setVaseTextures] = useState({
    polished: null,
    sandblasted: null
  });

  // 【优化】不再需要手动操作 scene，R3F 会自动处理
  // const { scene } = useThree(); 

  useImperativeHandle(ref, () => ({
    getMesh: () => meshRef.current,
  }));

  // 加载花瓶纹理 (保持不变)
  useEffect(() => {
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

    const color = vase.color || 'Black';
    const colorFolder = colorFolderMap[color] || 'Black';

    const loader = new THREE.TextureLoader();

    const polishedTex = loader.load(
      `/textures/Bases/${colorFolder}/磨光.jpg`,
      (t) => {
        t.flipY = false;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.NoColorSpace;
      }
    );

    const sandblastedTex = loader.load(
      `/textures/Bases/${colorFolder}/扫砂.jpg`,
      (t) => {
        t.flipY = false;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.NoColorSpace;
      }
    );

    setVaseTextures({
      polished: polishedTex,
      sandblasted: sandblastedTex
    });

    return () => {
      polishedTex.dispose();
      sandblastedTex.dispose();
    };
  }, [vase.color]);

  // 加载模型
  useEffect(() => {
    let isMounted = true;

    // 确保纹理加载完成后再处理模型
    if (!vaseTextures.polished || !vaseTextures.sandblasted) {
      return;
    }

    const loadModel = async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(vase.modelPath);
        if (!isMounted) return;

        const clonedScene = gltf.scene.clone();

        // 应用材质逻辑
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            // 强制将底色设为最亮
            child.material.color.setHex(0xffffff);

            child.material.color.setHex(0xffffff);

            if (child.name === 'vase') {
              child.material.map = vaseTextures.polished.clone();
              child.material.map.colorSpace = THREE.NoColorSpace;
              child.material.roughness = 1;
              child.material.metalness = 0.0;
            } else if (child.name === 'vaseInside') {
              child.material.map = vaseTextures.sandblasted.clone();
              child.material.map.colorSpace = THREE.NoColorSpace;
              child.material.roughness = 1;
              child.material.metalness = 0;
            } else {
              child.material.color = new THREE.Color(getColorValue(vase.color));
              child.material.roughness = 1;
              child.material.metalness = 0;
            }
            child.material.needsUpdate = true;
          }
        });

        // 【关键修改】：
        // 1. 不要手动 scene.add(clonedScene)
        // 2. 不要在这里手动赋值 meshRef.current，交给 <primitive ref={...} /> 处理

        if (!isMounted) return;
        setModel(clonedScene);
      } catch (err) {
        console.error(`Failed to load vase model: ${vase.modelPath}`, err);
        if (isMounted) setError(true);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      // 【优化】：不再需要手动 cleanup scene.remove，组件卸载时 R3F 会自动移除 primitive
    };
  }, [vase.modelPath, vaseTextures, vase.color]); // 移除了 scene 依赖

  // 位置/缩放/旋转 更新逻辑
  useLayoutEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(vase.position[0] || 0, vase.position[1] || 0, vase.position[2] || 0);
      meshRef.current.scale.set(vase.scale[0] || 1, vase.scale[1] || 1, vase.scale[2] || 1);
      meshRef.current.rotation.set(vase.rotation[0] || 0, vase.rotation[1] || 0, vase.rotation[2] || 0);
    }
  }, [
    vase.position,
    vase.scale,
    vase.rotation,
    model // <--- 【关键修复】：添加 model 到依赖数组
    // 这样当模型加载完成(model变化)时，会重新执行这里，把位置应用上去
  ]);

  // 控制器逻辑
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.mode = transformMode;
      controlRef.current.enabled = isSelected;
      if (transformMode === 'rotate') {
        controlRef.current.showX = false; controlRef.current.showY = false; controlRef.current.showZ = true;
      } else {
        controlRef.current.showX = true; controlRef.current.showY = true; controlRef.current.showZ = true;
      }
    }
  }, [isSelected, transformMode]);

  const onTransformEndHandler = () => {
    if (meshRef.current) {
      const newTransform = {
        position: meshRef.current.position.toArray(),
        scale: meshRef.current.scale.toArray(),
        rotation: meshRef.current.rotation.toArray().slice(0, 3)
      };
      onUpdateVaseElementState(vase.id, newTransform);
    }
  };

  if (error) {
    return (
      <mesh ref={meshRef} position={vase.position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}><div>Vase Error</div></Html>
      </mesh>
    );
  }

  if (!model) {
    return (
      <mesh position={vase.position} scale={[0.5, 0.5, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" transparent opacity={0.3} />
      </mesh>
    );
  }

  return (
    <group ref={ref}>
      {isSelected && (
        <TransformControls
          ref={controlRef}
          object={meshRef}
          onMouseUp={onTransformEndHandler}
          mode={transformMode}
          size={1.0}
        />
      )}
      <primitive
        ref={meshRef}
        object={model}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!isSelected) {
            onSelect(vase.id);
          }
        }}
      />
    </group>
  );
});

export default Vase3D;