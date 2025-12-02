// src/components/Designer/3d/EnhancedTextElement.jsx
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Text3D, TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { extend } from '@react-three/fiber';
import Model from './Model';

extend({ TextGeometry });

/**
 * EnhancedTextElement 负责将排版逻辑、材质模拟、TransformControls
 * 统一封装，让外层只需传入 text state 即可得到可交互的 3D 文本。
 */
const EnhancedTextElement = ({
  text,
  monument,
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  isSelected,
  isTextEditing,
  getFontPath,
  modelRefs,
  globalTransformMode // 2. 接收全局变换模式
}) => {
  const textRef = useRef();
  const transformControlsRef = useRef();
  const groupRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const { scene, controls } = useThree();
  const [monumentMaterial, setMonumentMaterial] = useState(null);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [hasInitPosition, setHasInitPosition] = useState(false);
  // 3. 使用全局模式，不再使用内部 state
  const mode = globalTransformMode || 'translate';
  const lineRefs = useRef([]);
  const [lineOffsets, setLineOffsets] = useState([]);
  const rafWriteRef = useRef(null);
  // 4. 新增：旋转角度状态  
  const [currentRotationDeg, setCurrentRotationDeg] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // 🔥 新增：从 text 中获取 textDirection（默认横向）
  const textDirection = text.textDirection || 'horizontal';

  // 字体路径解析：兼容传入 name 或完整版路径
  const localGetFontPath = useCallback((nameOrPath) => {
    if (getFontPath) {
      return getFontPath(nameOrPath);
    }
    return nameOrPath || '/fonts/helvetiker_regular.typeface.json';
  }, [getFontPath]);

  // 根据雕刻方式为文字落在碑面略微抬高，防止 z-fighting
  const computeSurfaceZ = useCallback((sizeZ, engraveType) => {
    const surfaceZ = -sizeZ / 2;
    if (engraveType === 'vcut' || engraveType === 'frost') return surfaceZ + 0.021;
    if (engraveType === 'polish') return surfaceZ + 0.01;
    return surfaceZ + 0.002;
  }, []);

  // 将 TransformControls 的世界位姿回写到面板状态，便于历史记录
  const writeBackPoseToState = useCallback(() => {
    if (!groupRef.current || !monument) return;
    const monumentMesh = modelRefs.current[monument.id]?.getMesh();
    if (!monumentMesh) return;
    monumentMesh.updateWorldMatrix(true, false);

    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const groupWorldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
    const localPos = groupWorldPos.clone().sub(worldPosition);
    localPos.divide(worldScale);
    localPos.applyQuaternion(worldQuaternion.clone().invert());

    const groupWorldQuat = groupRef.current.getWorldQuaternion(new THREE.Quaternion());
    const relativeQuat = worldQuaternion.clone().invert().multiply(groupWorldQuat);
    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const localQuat = flipQuat.clone().invert().multiply(relativeQuat);
    const euler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');

    const doWrite = () => {
      onTextPositionChange && onTextPositionChange(text.id, [localPos.x, localPos.y, localPos.z]);
      onTextRotationChange && onTextRotationChange(text.id, [euler.x, euler.y, euler.z]);
      rafWriteRef.current = null;
    };
    if (!rafWriteRef.current) rafWriteRef.current = requestAnimationFrame(doWrite);
  }, [monument, text.id, onTextPositionChange, onTextRotationChange, modelRefs]);

  // 把局部 position/rotation 同步到世界坐标，驱动 groupRef
  // 初始化默认文字位置：等待碑体尺寸计算完后再写入
  // 当碑体高度改变时，自动将文字重新贴回表面，避免悬浮
  // polish 文字共享碑体材质的镜面属性，这里 lazy clone
  // 选中状态下支持键盘快捷键切换 T/R，未选中则恢复 Orbit 控制
  // 重新计算多行文本的对齐偏移，使得 left/right/center 视觉正确
  useEffect(() => {
    if (!groupRef.current || !monument) return;
    const monumentMesh = modelRefs.current[monument.id]?.getMesh();
    if (!monumentMesh) return;

    monumentMesh.updateWorldMatrix(true, false);
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    monumentMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const xLocal = Array.isArray(text.position) ? (text.position[0] || 0) : 0;
    const yLocal = Array.isArray(text.position) ? (text.position[1] || 0.3) : 0.3;
    const zLocal = Array.isArray(text.position) ? (text.position[2] || 0) : 0;

    const localPoint = new THREE.Vector3(xLocal, yLocal, zLocal);
    const worldPoint = localPoint.clone()
      .multiply(worldScale)
      .applyQuaternion(worldQuaternion)
      .add(worldPosition);

    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const localEuler = new THREE.Euler(...(text.rotation || [0, 0, 0]), 'XYZ');
    const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
    const worldQuat = worldQuaternion.clone().multiply(flipQuat).multiply(localQuat);

    if (!isDragging) {
      groupRef.current.position.copy(worldPoint);
      groupRef.current.quaternion.copy(worldQuat);
    }
  }, [monument, text.position, text.rotation, modelRefs, isDragging]);

  useEffect(() => {
    const isDefault = Array.isArray(text.position)
      ? (text.position[0] === 0 && text.position[1] === 0 && text.position[2] === 0)
      : true;
    if (!monument || !isDefault || hasInitPosition) return;

    let rafId;
    const tryInit = () => {
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) { rafId = requestAnimationFrame(tryInit); return; }
      monumentMesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.z <= 0) { rafId = requestAnimationFrame(tryInit); return; }
      const surfaceZ = computeSurfaceZ(size.z, text.engraveType);
      const xLocal = 0;
      const yLocal = 0.3;
      if (onTextPositionChange) {
        onTextPositionChange(text.id, [xLocal, yLocal, surfaceZ], { replaceHistory: true });
        setHasInitPosition(true);
      }
    };
    tryInit();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.id, text.position, text.engraveType, onTextPositionChange, modelRefs, computeSurfaceZ, hasInitPosition]);

  useEffect(() => {
    if (!monument) return;
    let rafId;
    const applyZ = () => {
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) { rafId = requestAnimationFrame(applyZ); return; }
      monumentMesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(monumentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.z <= 0) { rafId = requestAnimationFrame(applyZ); return; }
      const targetZ = computeSurfaceZ(size.z, text.engraveType);
      const current = Array.isArray(text.position) ? text.position : [0, 0, 0];
      const currZ = Number(current[2] || 0);
      if (Math.abs(currZ - targetZ) > 1e-6 && onTextPositionChange) {
        onTextPositionChange(text.id, [current[0] || 0, current[1] || 0, targetZ]);
      }
    };
    applyZ();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.id, text.engraveType, onTextPositionChange, modelRefs, computeSurfaceZ]);

  useEffect(() => {
    let rafId;
    const trySetMaterial = () => {
      if (!monument || text.engraveType !== 'polish') {
        setMonumentMaterial(null);
        return;
      }
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) {
        rafId = requestAnimationFrame(trySetMaterial);
        return;
      }
      let found = false;
      monumentMesh.traverse((child) => {
        if (found) return;
        if (child.isMesh && child.material) {
          const baseMat = child.material;
          const cloned = baseMat.clone();
          cloned.map = baseMat.map || cloned.map;
          if (cloned.map) cloned.map.needsUpdate = true;
          cloned.roughness = 0.1 + ((text.polishBlend || 0.5) * 0.4);
          cloned.metalness = 0.5 - ((text.polishBlend || 0.5) * 0.2);
          if (cloned.clearcoat !== undefined) {
            cloned.clearcoat = 0.5;
            cloned.clearcoatRoughness = 0.1 + ((text.polishBlend || 0.5) * 0.3);
          }
          cloned.transparent = true;
          cloned.side = THREE.DoubleSide;
          cloned.needsUpdate = true;
          setMonumentMaterial(cloned);
          found = true;
        }
      });
      if (!found) rafId = requestAnimationFrame(trySetMaterial);
    };
    trySetMaterial();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [monument, text.engraveType, text.polishBlend, modelRefs]);

  useEffect(() => {
    if (!isSelected || !isTextEditing) {
      controls && (controls.enabled = true);
      setIsDragging(false);
      return;
    }
    const onKey = (e) => {
      if (e.key === 't' || e.key === 'T') setTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSelected, isTextEditing, controls]);

  const textMaterial = useMemo(() => {
    if (text.engraveType === 'polish' && monumentMaterial) {
      return monumentMaterial;
    }
    try {
      const materialProps = { transparent: true, side: THREE.DoubleSide };
      switch (text.engraveType) {
        case 'vcut':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: text.vcutColor || '#5D4037', roughness: 0.9, metalness: 0.05, clearcoat: 0.1, clearcoatRoughness: 0.2, opacity: 0.95 });
        case 'frost':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xF8F8F8, roughness: Math.max(0.6, text.frostIntensity || 0.8), metalness: 0.02, transmission: 0.1, thickness: 0.01, opacity: 0.85 - ((text.frostIntensity || 0.8) * 0.2) });
        case 'polish':
          return new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0x7A7A7A, roughness: 0.1 + ((text.polishBlend || 0.5) * 0.4), metalness: 0.5 - ((text.polishBlend || 0.5) * 0.2), clearcoat: 0.5, clearcoatRoughness: 0.1 + ((text.polishBlend || 0.5) * 0.3), opacity: 0.98 });
        default:
          return new THREE.MeshStandardMaterial({ ...materialProps, color: 0x333333, roughness: 0.7, metalness: 0.3 });
      }
    } catch (error) {
      console.error('Error creating material, using fallback:', error);
      return new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    }
  }, [monumentMaterial, text.engraveType, text.vcutColor, text.frostIntensity, text.polishBlend]);

  // 🔥 新增：竖排文字的偏移计算（兼容对齐方式）
  useEffect(() => {
    const refs = lineRefs.current;
    if (!refs || refs.length === 0) return;

    // 区分横/竖排计算偏移
    if (textDirection === 'horizontal') {
      // 原有横向偏移逻辑（保持不变）
      const metrics = refs.map((mesh) => {
        if (!mesh || !mesh.geometry) return { width: 0, centerX: 0 };
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (!bb) return { width: 0, centerX: 0 };
        return { width: bb.max.x - bb.min.x, centerX: (bb.max.x + bb.min.x) / 2 };
      });
      const maxWidth = metrics.reduce((m, v) => Math.max(m, v.width), 0);
      const newOffsets = metrics.map((m) => {
        let desiredCenter = 0;
        if (text.alignment === 'left') desiredCenter = -maxWidth / 2 + m.width / 2;
        else if (text.alignment === 'right') desiredCenter = maxWidth / 2 - m.width / 2;
        else desiredCenter = 0; // center
        const x = desiredCenter - m.centerX;
        return { x };
      });
      setLineOffsets(newOffsets);
    } else {
      // 竖排偏移逻辑（按对齐方式调整X轴）
      const metrics = refs.map((mesh) => {
        if (!mesh || !mesh.geometry) return { height: 0, centerY: 0 };
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (!bb) return { height: 0, centerY: 0 };
        return { height: bb.max.y - bb.min.y, centerY: (bb.max.y + bb.min.y) / 2 };
      });
      const maxHeight = metrics.reduce((m, v) => Math.max(m, v.height), 0);
      const newOffsets = metrics.map((m) => {
        let desiredX = 0;
        // 竖排时：alignment 控制水平对齐（left/center/right）
        if (text.alignment === 'left') desiredX = -maxHeight / 2 + m.height / 2;
        else if (text.alignment === 'right') desiredX = maxHeight / 2 - m.height / 2;
        else desiredX = 0; // center
        return { x: desiredX };
      });
      setLineOffsets(newOffsets);
    }
  }, [text.content, text.size, text.kerning, text.lineSpacing, text.alignment, textDirection]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    if (onTextSelect) {
      onTextSelect(text.id);
    }
  }, [text.id, onTextSelect]);

  // 按字符计算弧长与半径，实现可调弯曲的碑文
  const renderCurvedText = () => {
    if (!text.content) return null;

    const characters = text.content.split('');
    const fontSize = text.size * 0.0254
    const kerningUnit = (text.kerning || 0) * 0.001;
    const curveAmount = text.curveAmount || 0;
    const curveDirection = curveAmount >= 0 ? 1 : -1;
    const curveIntensity = Math.min(Math.abs(curveAmount) / 100, 0.8);

    const calculateCharacterWidth = (char) => {
      const widthMap = {
        'i': 0.3, 'l': 0.3, 'I': 0.4, '1': 0.4, '!': 0.3, '.': 0.2, ',': 0.2,
        't': 0.4, 'f': 0.4, 'r': 0.5, 'j': 0.3,
        'm': 0.9, 'w': 0.9, 'M': 1.0, 'W': 1.0,
        ' ': 0.4
      };
      return widthMap[char] || 0.7;
    };

    const calculateCharacterBottomOffset = (char) => {
      const descenderMap = {
        'g': 0.15, 'j': 0.2, 'p': 0.15, 'q': 0.15, 'y': 0.15
      };
      return descenderMap[char] || 0;
    };

    let totalArcLength = 0;
    const charWidths = characters.map(char => {
      const width = calculateCharacterWidth(char) * fontSize;
      totalArcLength += width;
      return width;
    });

    totalArcLength += Math.max(0, characters.length - 1) * fontSize * kerningUnit;

    const minArcAngle = Math.PI * 0.2;
    const maxArcAngle = Math.PI * 1.2;
    const arcAngle = curveIntensity > 0 ?
      (minArcAngle + (maxArcAngle - minArcAngle) * curveIntensity) : 0;

    const radius = arcAngle > 1e-6 ?
      Math.max(totalArcLength / arcAngle, totalArcLength * 0.5) :
      1e6;

    let currentAngle = -arcAngle / 2;
    const baseOffsetY = -fontSize * 0.5;

    return characters.map((char, index) => {
      if (char === ' ') {
        const charWidth = charWidths[index];
        const charAngleIncrement = (charWidth + fontSize * kerningUnit) / radius;
        currentAngle += charAngleIncrement;
        return null;
      }

      const charRadius = radius;
      const baseX = Math.sin(currentAngle) * charRadius;
      const baseY = (Math.cos(currentAngle) - 1) * charRadius * curveDirection;

      const x = baseX;
      const y = baseY + baseOffsetY;

      const rotationZ = -currentAngle * curveDirection;
      const descenderOffset = calculateCharacterBottomOffset(char) * fontSize;
      const finalY = y - descenderOffset;

      const charWidth = charWidths[index];
      const charAngleIncrement = (charWidth + fontSize * kerningUnit) / radius;
      currentAngle += charAngleIncrement;

      return (
        <group
          key={index}
          position={[x, finalY, 0]}
          rotation={[0, 0, rotationZ]}
        >
          <Text3D
            font={localGetFontPath(text.font)}
            size={fontSize}
            height={text.thickness || 0.02}
            letterSpacing={0}
            curveSegments={16}
            bevelEnabled={true}
            bevelThickness={0.002}
            bevelSize={0.002}
            bevelOffset={0}
            bevelSegments={5}
            material={textMaterial}
          >
            {char}
          </Text3D>
        </group>
      );
    });
  };

  // 🔥 核心修改：常规排版（支持横/竖排切换）
  const renderNormalText = () => {
    const content = text.content || 'Text';
    const fontSize = text.size * 0.0254;
    const lineGap = fontSize * (text.lineSpacing || 1.2);

    if (textDirection === 'horizontal') {
      // 原有横向排版（保持不变）
      const lines = content.split('\n');
      return (
        <group>
          {lines.map((ln, idx) => (
            <Text3D
              key={idx}
              ref={(el) => (lineRefs.current[idx] = el)}
              font={localGetFontPath(text.font)}
              size={fontSize}
              letterSpacing={text.kerning * 0.001}
              height={text.thickness || 0.02}
              curveSegments={8}
              bevelEnabled={true}
              bevelThickness={0.002}
              bevelSize={0.002}
              bevelOffset={0}
              bevelSegments={3}
              material={textMaterial}
              position={[
                lineOffsets[idx]?.x || 0,
                -idx * lineGap + ((lines.length - 1) * lineGap) / 2,
                0
              ]}
            >
              {ln || ' '}
            </Text3D>
          ))}
        </group>
      );
    } else {
      // 竖排排版（核心新增）
      // 拆分字符（忽略换行，按单个字符竖排）
      const chars = content.replace(/\n/g, '').split('');
      return (
        <group>
          {chars.map((char, idx) => (
            <Text3D
              key={idx}
              ref={(el) => (lineRefs.current[idx] = el)}
              font={localGetFontPath(text.font)}
              size={fontSize}
              letterSpacing={text.kerning * 0.001}
              height={text.thickness || 0.02}
              curveSegments={8}
              bevelEnabled={true}
              bevelThickness={0.002}
              bevelSize={0.002}
              bevelOffset={0}
              bevelSegments={3}
              material={textMaterial}
              position={[
                lineOffsets[idx]?.x || 0, // 按对齐方式调整X轴
                -idx * lineGap + ((chars.length - 1) * lineGap) / 2, // Y轴逐字下移
                0
              ]}
            >
              {char || ' '}
            </Text3D>
          ))}
        </group>
      );
    }
  };

  // 统一入口，根据 curveAmount 决定使用哪种渲染
  const renderTextContent = () => {
    if (text.curveAmount && text.curveAmount > 0) {
      return renderCurvedText();
    } else {
      return renderNormalText();
    }
  };

  return (
    <>
      <group
        ref={groupRef}
        onPointerDown={handleClick}
        userData={{ isTextElement: true, textId: text.id }}
      >
        {renderTextContent()}
        {/* 7. 新增：显示旋转角度的 UI */}
        {isSelected && isRotating && mode === 'rotate' && (
          <Html position={[0, 0.2, 0]} center>
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}>
              {currentRotationDeg.toFixed(1)}°
            </div>
          </Html>
        )}
      </group>

      {isSelected && isTextEditing && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={mode}
          space="local"
          showX={mode === 'translate'}
          showY={mode === 'translate'}
          showZ={mode === 'rotate'}
          // 8. 修改：更严格的 onMouseDown 逻辑
          onMouseDown={() => {
            controls && (controls.enabled = false);
            setIsDragging(true);
            if (mode === 'rotate') {
              setIsRotating(true);
            } else {
              setIsRotating(false);
            }
          }}
          //仅在旋转时更新角度，移除 writeBackPoseToState，解决卡顿
          onObjectChange={() => {
            // writeBackPoseToState(); // <--- 移除了这行，避免每帧重渲染
            if (mode === 'rotate' && groupRef.current) {
              const rotZ = groupRef.current.rotation.z;
              let deg = (rotZ * 180) / Math.PI;
              deg = deg % 360;
              if (deg < 0) deg += 360;
              setCurrentRotationDeg(deg);
            }
          }}

          onMouseUp={() => {
            // 确保在松开鼠标时回写最终位置
            writeBackPoseToState();
            controls && (controls.enabled = true);
            setIsDragging(false);
            setIsRotating(false); // 总是重置
          }}
        />
      )}
    </>
  );
};

export default EnhancedTextElement;