import React, { forwardRef, useRef, useState, useEffect, useImperativeHandle, Suspense, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

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
  onTextPositionChange,
  background = null
}, ref) => {
  const { gl, scene } = useThree();
  const sceneRef = useRef();
  const modelRefs = useRef({});
  const [selectedTextId, setSelectedTextId] = useState(null);

  // 当添加新文字时，自动选中它
  useEffect(() => {
    const textElements = designState.textElements || [];
    if (textElements.length > 0) {
      // 获取最新添加的文字
      const latestText = textElements[textElements.length - 1];
      setSelectedTextId(latestText.id);
    }
  }, [designState.textElements]);

  // 点击场景其他部分时取消选中文字
  useEffect(() => {
    const handleSceneClick = () => {
      setSelectedTextId(null);
    };

    // 添加全局点击事件监听器
    document.addEventListener('click', handleSceneClick);
    return () => {
      document.removeEventListener('click', handleSceneClick);
    };
  }, []);

  // 处理文字位置变化
  const handleTextPositionChange = (textId, newPosition) => {
    if (onTextPositionChange) {
      onTextPositionChange(textId, newPosition);
    }
  };

  // 处理文字选中
  const handleTextSelect = (textId) => {
    console.log('wenbenbeixuanzhong:', textId);
    setSelectedTextId(textId);
  };

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

      if (totalSubBaseLength > 0) {
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
        if (index === 0) {
          if (height > 0) {
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

      if (totalBaseLength > 0) {
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
        if (index === 0) {
          if (height > 0) {
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

      if (totalMonumentLength > 0) {
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
        if (index === 0) {
          currentY_Top += height;
        }
      });
    }
    return positions;
  };
  //文本
  const TextElement = ({ text, monument, monumentRef, onTextPositionChange, isSelected, onSelect }) => {
    const textRef = useRef();
    const transformControlsRef = useRef();
    const [initialPosition, setInitialPosition] = useState(null); // 修复：添加 initialPosition 状态
    // 处理变换控制器的变化
    const handleTransformChange = () => {
      console.log('文本', textRef.current)
      if (!textRef.current || !initialPosition) return;

      // 获取当前位置
      const currentPosition = textRef.current.position.clone();

      // 保持Z轴不变，只更新XY坐标
      const newPosition = new THREE.Vector3(
        currentPosition.x,
        currentPosition.y,
        initialPosition.z // 保持原始的Z坐标
      );

      // 应用新位置
      textRef.current.position.copy(newPosition);

      // 通知父组件位置变化
      if (onTextPositionChange) {
        onTextPositionChange(text.id, [newPosition.x, newPosition.y, newPosition.z]);
      }
    };


    useEffect(() => {
      if (!textRef.current || !monument || initialPosition) return;

      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) return;

      // 获取纪念碑的尺寸
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      // 根据对齐方式计算水平位置
      let xOffset = 0;
      switch (text.alignment) {
        case 'left':
          xOffset = -size.x * 0.4;
          break;
        case 'right':
          xOffset = size.x * 0.4;
          break;
        case 'center':
        default:
          xOffset = 0;
      }

      // 垂直居中
      const yOffset = 0;
      const frontSurfaceZ = -size.z;

      // 根据雕刻类型调整深度
      const zOffset = text.engraveType === 'engraved' ?
        frontSurfaceZ + 0.02 :  // 凹陷，稍微向内
        frontSurfaceZ - 0.02;   // 凸出，稍微向外

      // 设置文字位置
      const position = new THREE.Vector3(0, yOffset, -size.z - 0.01);
      textRef.current.position.copy(position);
      setInitialPosition(position);
      textRef.current.rotation.y = Math.PI;



    }, [text, monument, initialPosition]);
    // 点击文字时选中
    const handleTextClick = (event) => {
      event.stopPropagation();
      if (onSelect) {
        onSelect(text.id);
        console.log('wenbenbeixuanzhong:', text.id);
      }
    };

    return (
      <group ref={textRef} onClick={handleTextClick}>
        <Text
          color={text.color}
          fontSize={text.size * 0.01}
          anchorX={text.alignment}
          anchorY="middle"
          letterSpacing={text.kerning * 0.001}
          lineHeight={text.lineSpacing}
          position={[0, 0, 0]}
          renderOrder={1}
        >
          {text.content}
          <meshStandardMaterial
            color={text.color}
            roughness={0.3}
            metalness={text.engraveType === 'engraved' ? 0.2 : 0.8}
            side={THREE.DoubleSide} // 确保文字双面可见
          />
        </Text>
        {/* 位置控制器 - 只有当文字被选中时显示 */}
        {isSelected && (
          <TransformControls
            ref={transformControlsRef}
            object={textRef}
            mode="translate"
            showX={true}
            showY={true}
            showZ={false} // 隐藏Z轴控制器
            onObjectChange={handleTransformChange}
            onMouseUp={handleTransformChange}
          />
        )}
      </group>
    );
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

      {/* 修改纪念碑渲染，添加文本支持 */}
      {designState.monuments.map(monument => {
        const monumentTexts = designState.textElements.filter(text => text.monumentId === monument.id);

        return (
          <group key={`monument-group-${monument.id}`}>
            {/* 纪念碑模型 */}
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

            {/* 该纪念碑上的文本 */}
            {monumentTexts.map(text => (
              <TextElement
                key={text.id}
                text={text}
                monument={monument}
                isSelected={selectedTextId === text.id}
                onSelect={handleTextSelect}
                onTextPositionChange={handleTextPositionChange}
              />
            ))}
          </group>
        );
      })}

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
const Scene3D = forwardRef(({ background, ...props }, ref) => {
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