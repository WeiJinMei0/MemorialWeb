// src/components/Designer/3d/Model.jsx
import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, useLayoutEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';
import { getColorValue } from './utils';

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
}, ref) => {
  const meshRef = useRef();
  const sceneObjectRef = useRef(null);
  const { scene } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

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
    getMesh: () => meshRef.current,
    getDimensions: () => originalDimensions
  }));

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
        if (sceneObjectRef.current && scene) {
          scene.remove(sceneObjectRef.current);
          sceneObjectRef.current.traverse((child) => {
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
          sceneObjectRef.current = null;
        }

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        if (!isMounted) return;

        const clonedScene = gltf.scene.clone();
        clonedScene.position.set(position[0], position[1], position[2]);

        scene.add(clonedScene);
        sceneObjectRef.current = clonedScene;
        currentSceneObject = clonedScene;

        if (meshRef.current !== clonedScene) {
          meshRef.current = clonedScene;
        }

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // 【关键修正】：确保尺寸映射正确
        // Length -> X
        // Width  -> Z (厚度/Depth)
        // Height -> Y (高度/Up)
        const originalDims = { length: size.x, width: size.z, height: size.y };

        if (!isMounted) return;
        setOriginalDimensions(originalDims);

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
      if (currentSceneObject && scene) {
        scene.remove(currentSceneObject);
      }
      if (sceneObjectRef.current && scene) {
        scene.remove(sceneObjectRef.current);
        sceneObjectRef.current = null;
      }
    };
  }, [modelPath, color, texturePath, scene, isMultiTextureBase]);

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

  useLayoutEffect(() => {
    const currentModel = sceneObjectRef.current || model;
    if (currentModel && position) {
      currentModel.position.set(position[0], position[1], position[2]);
      if (meshRef.current !== currentModel) {
        meshRef.current = currentModel;
      }
    }
  }, [position, model]);

  // 缩放逻辑修正：改用 useLayoutEffect 确保在父组件测量前应用缩放
  useLayoutEffect(() => {
    if (meshRef.current && originalDimensions) {
      const scaleX = originalDimensions.length === 0 ? 1 : dimensions.length / originalDimensions.length;
      // Height -> Y
      const scaleY = originalDimensions.height === 0 ? 1 : dimensions.height / originalDimensions.height;
      // Width -> Z
      const scaleZ = originalDimensions.width === 0 ? 1 : dimensions.width / originalDimensions.width;

      meshRef.current.scale.set(scaleX, scaleY, scaleZ);
      // 强制更新矩阵，确保后续测量准确
      meshRef.current.updateMatrix();
      meshRef.current.updateWorldMatrix(true, true);
    }
  }, [dimensions, originalDimensions]);

  useFrame(() => {
    if (!isMultiTextureBase || !meshRef.current || !multiTextureParts.surfaceA) return;

    const { surfaceA, surfaceB_meshes, surfaceC_meshes } = multiTextureParts;
    const scale = meshRef.current.scale;
    const sx = scale.x; const sy = scale.y; const sz = scale.z;

    const isBaseModel = modelPath === "/models/Bases/Base.glb";

    if (isBaseModel) {
      const applyScale = (mesh) => {
        if (!mesh || !mesh.material.map) return;
        const map = mesh.material.map;
        const name = mesh.name;
        if (name.includes('_front') || name.includes('_back')) { map.repeat.set(sx, sy); map.offset.set((1 - sx) / 2, (1 - sy) / 2); }
        else if (name.includes('_left') || name.includes('_right')) { map.repeat.set(sz, sy); map.offset.set((1 - sz) / 2, (1 - sy) / 2); }
      };
      if (surfaceA && surfaceA.material.map) { surfaceA.material.map.repeat.set(sx, sz); surfaceA.material.map.offset.set((1 - sx) / 2, (1 - sz) / 2); }
      surfaceB_meshes.forEach(applyScale);
      surfaceC_meshes.forEach(applyScale);
    } else {
      // Monument logic
      if (surfaceA && surfaceA.material.map) { surfaceA.material.map.repeat.set(sx, sy); surfaceA.material.map.offset.set((1 - sx) / 2, (1 - sy) / 2); }
      surfaceB_meshes.forEach(mesh => { if (mesh && mesh.material.map) { mesh.material.map.repeat.set(sz, sy); mesh.material.map.offset.set((1 - sz) / 2, (1 - sy) / 2); } });
      surfaceC_meshes.forEach(mesh => { if (mesh && mesh.material.map) { mesh.material.map.repeat.set(sx, sz); mesh.material.map.offset.set((1 - sx) / 2, (1 - sz) / 2); } });
    }
  });

  if (error) {
    return (
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}><div>Model Error</div></Html>
      </mesh>
    );
  }

  if (!model) {
    return (
      <mesh position={position} scale={[0.5, 0.5, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="gray" transparent opacity={0.3} />
      </mesh>
    );
  }

  const ModelComponent = (
    <primitive
      ref={meshRef}
      object={model}
      onPointerDown={(e) => {
        if (isFillModeActive) {
          e.stopPropagation();
          if (onFillClick) {
            onFillClick();
          }
        } else if (onSelect) {
          onSelect();
        }
      }}
    />
  );

  return isDraggable ? (
    <TransformControls object={meshRef} mode="translate">
      {ModelComponent}
    </TransformControls>
  ) : ModelComponent;
});

export default Model;