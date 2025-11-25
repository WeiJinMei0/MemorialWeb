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
  transformMode,
}, ref) => {
  const meshRef = useRef();
  const controlRef = useRef();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);

  const { scene } = useThree();

  useImperativeHandle(ref, () => ({
    getMesh: () => meshRef.current,
  }));

  useEffect(() => {
    let isMounted = true;
    let currentSceneObject = null;

    const loadModel = async () => {
      try {
        if (currentSceneObject && scene) {
          scene.remove(currentSceneObject);
          currentSceneObject.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                  });
                } else {
                  if (child.material.map) child.material.map.dispose();
                  child.material.dispose();
                }
              }
            }
          });
          currentSceneObject = null;
        }

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(vase.modelPath);
        if (!isMounted) return;

        const clonedScene = gltf.scene.clone();
        scene.add(clonedScene);
        currentSceneObject = clonedScene;
        meshRef.current = clonedScene;

        const textureLoader = new THREE.TextureLoader();
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            textureLoader.load(vase.texturePath, (texture) => {
              if (!isMounted) return;
              texture.colorSpace = THREE.SRGBColorSpace;
              child.material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.1
              });
            }, undefined, () => {
              if (!isMounted) return;
              child.material = new THREE.MeshStandardMaterial({
                color: getColorValue(vase.color),
                roughness: 0.7,
                metalness: 0.1
              });
            });
          }
        });

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
      if (currentSceneObject && scene) {
        scene.remove(currentSceneObject);
        currentSceneObject.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat.map) mat.map.dispose();
                  mat.dispose();
                });
              } else {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [vase.modelPath, vase.color, vase.texturePath, scene]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        vase.position[0] || 0,
        vase.position[1] || 0,
        vase.position[2] || 0
      );
      meshRef.current.scale.set(
        vase.scale[0] || 1,
        vase.scale[1] || 1,
        vase.scale[2] || 1
      );
      meshRef.current.rotation.set(
        vase.rotation[0] || 0,
        vase.rotation[1] || 0,
        vase.rotation[2] || 0
      );
    }
  }, [vase.position, vase.scale, vase.rotation]);

  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.mode = transformMode;
      controlRef.current.enabled = isSelected;

      if (transformMode === 'rotate') {
        controlRef.current.showX = false;
        controlRef.current.showY = false;
        controlRef.current.showZ = true;
      } else if (transformMode === 'scale') {
        controlRef.current.showX = true;
        controlRef.current.showY = true;
        controlRef.current.showZ = false;
      } else if (transformMode === 'translate') {
        controlRef.current.showX = true;
        controlRef.current.showY = true;
        controlRef.current.showZ = false;
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

  const onTransformStartHandler = () => { };
  const onTransformChangeHandler = () => { };

  if (error) {
    return (
      <mesh ref={meshRef} position={vase.position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}>
          <div>Vase Error</div>
        </Html>
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
          onMouseDown={onTransformStartHandler}
          onMouseUp={onTransformEndHandler}
          onChange={onTransformChangeHandler}
          mode={transformMode}
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