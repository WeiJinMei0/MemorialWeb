import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, Suspense, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from 'three';

const Loader = () => (
  <Html center>
    <div>Loading 3D Model...</div>
  </Html>
);

const Model = forwardRef(({
  modelPath,
  texturePath,
  position = [0, 0, 0],
  dimensions = { length: 1, width: 1, height: 1 },
  color = 'Black',
  onLoad,
  onDimensionsChange,
  isDraggable = false
}, ref) => {
  const meshRef = useRef();
  const { gl, scene } = useThree();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [hasReportedDimensions, setHasReportedDimensions] = useState(false);

  useImperativeHandle(ref, () => ({
    getMesh: () => meshRef.current,
    getDimensions: () => originalDimensions
  }));


  useEffect(() => {
    const loadModel = async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        const clonedScene = gltf.scene;
        // 设置位置
        clonedScene.position.set(position[0], position[1], position[2]);
        // const clonedScene = gltf.scene;
        scene.add(clonedScene);

        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const originalDims = {
          length: size.x,
          width: size.y,
          height: size.z
        };

        setOriginalDimensions(originalDims);

        if (onDimensionsChange && !hasReportedDimensions &&
            (dimensions.length === 0 || dimensions.width === 0 || dimensions.height === 0)) {
          onDimensionsChange(originalDims);
          setHasReportedDimensions(true);
        }

        const textureLoader = new THREE.TextureLoader();
        clonedScene.traverse((child) => {

          if (child.isMesh) {
            // console.log(`Texture loaded: ${texturePath}`);
            textureLoader.load(texturePath, (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;

              console.log(`Texture loaded: ${texturePath}`);
              child.material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.1
              });
            }, undefined, () => {
              child.material = new THREE.MeshStandardMaterial({
                color: getColorValue(color),
                roughness: 0.7,
                metalness: 0.1
              });
            });
          }
        });

        setModel(clonedScene);
        if (onLoad) onLoad(clonedScene);
      } catch (err) {
        console.error(`Failed to load model: ${modelPath}`, err);
        setError(true);
      }
    };

    const getColorValue = (color) => {
      const colorMap = {
        'Black': 0x333333,
        'Red': 0x8B0000,
        'Grey': 0x808080,
        'Blue': 0x0000CD,
        'Green': 0x006400
      };
      return colorMap[color] || 0x333333;
    };

    loadModel();
  }, [modelPath, color]);

  useLayoutEffect(() => {
    if (meshRef.current && position) {
      // console.log(`i: ${i}`);
      // i+=1;
      meshRef.current.position.set(position[0], position[1], position[2]);
    }
  });

  useEffect(() => {
    if (meshRef.current && originalDimensions) {
      const scaleX = dimensions.length / originalDimensions.length;
      const scaleY = dimensions.height / originalDimensions.height;
      const scaleZ = dimensions.width / originalDimensions.width;
      meshRef.current.scale.set(scaleX, scaleY, scaleZ);
    }
  }, [dimensions, originalDimensions]);

  if (error) {
    return (
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" transparent opacity={0.5} />
        <Html distanceFactor={10}>
          <div>Model Error</div>
        </Html>
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
    />
  );

  return isDraggable ? (
    <TransformControls object={meshRef} mode="translate">
      {ModelComponent}
    </TransformControls>
  ) : ModelComponent;
});

// 主场景组件
const MonumentScene = forwardRef(({
  designState,
  onDimensionsChange,
  onDuplicateElement,
  onDeleteElement,
  onFlipElement,
  background = null
}, ref) => {
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});

  // 处理背景图片
  useEffect(() => {
    if (background) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(background, (texture) => {
        // 设置场景背景
        scene.background = texture;
        // 可选：设置背景纹理的映射方式
        texture.mapping = THREE.EquirectangularReflectionMapping;
      }, undefined, (error) => {
        console.error('Failed to load background texture:', error);
        scene.background = null; // 加载失败时清除背景
      });
    } else {
      // 如果没有背景或背景为透明，清除背景
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
    }
  }));

  const calculateModelPositions = () => {
    const positions = {};

    // 获取模型的长度（X轴方向尺寸）
    const getModelLength = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.x;
      }
      // 回退到配置的长度
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      return model ? (model.dimensions.length || 1) : 1;
    };

    // 获取模型的高度（Y轴方向尺寸）
    const getModelHeight = (modelId) => {
      const mesh = modelRefs.current[modelId]?.getMesh();
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        return size.y;
      }
      // 回退到配置的高度
      const model = [...designState.subBases, ...designState.bases, ...designState.monuments]
        .find(m => m.id === modelId);
      return model ? (model.dimensions.height || 1) : 1;
    };

    // 计算Y轴堆叠
    let currentY_subBase = -0.5;
    let currentY_base = -0.3;
    let currentY_Tablet = -0.1;
    let currentY_Top = -0.1;
    let currentX_subBase = -0.381;
    let currentX_base = -0.381;
    let currentX_Tablet = -0.304;

    // 如果有次底座，将次底座放在最下面，Y坐标设置为0
    if (designState.subBases.length > 0) {
      const totalSubBaseLength = designState.subBases.reduce((sum, subBase) => {
        return sum + getModelLength(subBase.id);
      }, 0) + (designState.subBases.length - 1) * 0.2; // 添加间隔

      if (totalSubBaseLength>0){
        currentX_subBase = -totalSubBaseLength / 2; // 从左侧开始
      }

      designState.subBases.forEach((subBase, index) => {
        const height = getModelHeight(subBase.id);
        const length = getModelLength(subBase.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[subBase.id] = [currentX_subBase, currentY_subBase, 0];

        // 计算X轴偏移，基于次底座的长度
        // const xOffset = currentX_subBase;
        currentX_subBase += length + 0.2;

        // 只有第一个次底座参与Y轴堆叠计算
        if (index === 0){
          if(height > 0){
            currentY_Top = currentY_subBase;
            currentY_Top += height;
            currentY_base = currentY_Top;
          }
          }
        });
    }

    // 如果有底座，放在次底座上面
    if (designState.bases.length > 0) {
      // 如果没有次底座，将底座的Y坐标设置为0
      if (designState.subBases.length === 0) {
          currentY_base = -0.5;
          currentY_Tablet = -0.3;
          currentY_Top = -0.3;
      }

      // 计算所有底座的总长度
      const totalBaseLength = designState.bases.reduce((sum, base) => {
        return sum + getModelLength(base.id);
      }, 0) + (designState.bases.length - 1) * 0.2; // 添加间隔

      if (totalBaseLength > 0){
        currentX_base = -totalBaseLength / 2; // 从左侧开始
      }

      designState.bases.forEach((base, index) => {
        const height = getModelHeight(base.id);
        const length = getModelLength(base.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[base.id] = [currentX_base, currentY_base, 0];

        // 计算X轴偏移，基于底座的长度
        // const xOffset = currentX_base;
        currentX_base += length + 0.2;

        // 只有第一个底座参与Y轴堆叠计算
        if (index === 0){
          if (height > 0){
            currentY_Top = currentY_base;
            currentY_Top += height
            currentY_Tablet = currentY_Top;
          }
        }
      });
    }

    // 如果有碑，放在底座上面
    if (designState.monuments.length > 0) {
      // 如果没有次底座和底座，将碑的Y坐标设置为0
      if (designState.subBases.length === 0 && designState.bases.length === 0) {
        currentY_Tablet = -0.5;
        currentY_Top = -0.5;
      }

      // 计算所有纪念碑的总长度
      const totalMonumentLength = designState.monuments.reduce((sum, monument) => {
        return sum + getModelLength(monument.id);
      }, 0) + (designState.monuments.length - 1) * 0.2; // 添加间隔

      if (totalMonumentLength > 0){
        currentX_Tablet = -totalMonumentLength / 2; // 从左侧开始
      }

      designState.monuments.forEach((monument, index) => {
        const height = getModelHeight(monument.id);
        const length = getModelLength(monument.id);

        // 设置位置，Y坐标为当前堆叠高度
        positions[monument.id] = [currentX_Tablet, currentY_Tablet, 0];

        // 计算X轴偏移，基于纪念碑的长度
        // const xOffset = currentX_Tablet;
        currentX_Tablet += length + 0.2;

        // 只有第一个碑参与Y轴堆叠计算
        if (index === 0){
          currentY_Top += height;
        }
      });
    }
    return positions;
  };

  const positions = calculateModelPositions();

  const handleModelLoad = (elementId, elementType, dimensions) => {
    if (onDimensionsChange) {
      onDimensionsChange(elementId, dimensions, elementType);
    }
  };

  return (
    <group ref={sceneRef}>
      {designState.subBases.map(subBase => (
        <Model
          key={subBase.id}
          ref={el => modelRefs.current[subBase.id] = el}
          modelPath={subBase.modelPath}
          texturePath={subBase.texturePath}
          position={positions[subBase.id] || [0, 0, 0]}
          dimensions={subBase.dimensions}
          color={subBase.color}
          onDimensionsChange={(dims) => handleModelLoad(subBase.id, 'subBase', dims)}
        />
      ))}

      {designState.bases.map(base => (
        <Model
          key={base.id}
          ref={el => modelRefs.current[base.id] = el}
          modelPath={base.modelPath}
          texturePath={base.texturePath}
          position={positions[base.id] || [0, 0, 0]}
          dimensions={base.dimensions}
          color={base.color}
          onDimensionsChange={(dims) => handleModelLoad(base.id, 'base', dims)}
        />
      ))}

      {designState.monuments.map(monument => (
        <Model
          key={monument.id}
          ref={el => modelRefs.current[monument.id] = el}
          modelPath={monument.modelPath}
          texturePath={monument.texturePath}
          position={positions[monument.id] || [0, 0, 0]}
          dimensions={monument.dimensions}
          color={monument.color}
          onDimensionsChange={(dims) => handleModelLoad(monument.id, 'monument', dims)}
        />
      ))}

      {designState.vases.map(vase => (
        <Model
          key={vase.id}
          ref={el => modelRefs.current[vase.id] = el}
          modelPath={vase.modelPath}
          texturePath={vase.texturePath}
          position={vase.position}
          dimensions={vase.dimensions}
          color={vase.color}
          isDraggable={true}
          onDimensionsChange={(dims) => handleModelLoad(vase.id, 'vase', dims)}
        />
      ))}

      {designState.artElements.map(art => (
        <Model
          key={art.id}
          ref={el => modelRefs.current[art.id] = el}
          modelPath={art.modelPath}
          position={art.position}
          dimensions={art.dimensions}
          color={art.color}
          isDraggable={true}
          onDimensionsChange={(dims) => handleModelLoad(art.id, 'art', dims)}
        />
      ))}

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <axesHelper args={[5]} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </group>
  );
});

// 主场景包装器
const Scene3D = forwardRef(({background, ...props }, ref) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [0, 3, 1],
          fov: 25,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f0f2f5');
        }}
      >
        <Suspense fallback={<Loader />}>
          <MonumentScene ref={ref} background={background} {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default Scene3D;