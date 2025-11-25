// src/components/Designer/3d/EnhancedTextElement.jsx
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Text3D, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { extend } from '@react-three/fiber';

extend({ TextGeometry });

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
  modelRefs
}) => {
  const textRef = useRef();
  const transformControlsRef = useRef();
  const groupRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const { scene, controls } = useThree();
  const [monumentMaterial, setMonumentMaterial] = useState(null);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [hasInitPosition, setHasInitPosition] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const lineRefs = useRef([]);
  const [lineOffsets, setLineOffsets] = useState([]);
  const rafWriteRef = useRef(null);

  const localGetFontPath = useCallback((nameOrPath) => {
    if (getFontPath) {
      return getFontPath(nameOrPath);
    }
    return nameOrPath || '/fonts/helvetiker_regular.typeface.json';
  }, [getFontPath]);

  const computeSurfaceZ = useCallback((sizeZ, engraveType) => {
    const surfaceZ = -sizeZ / 2;
    if (engraveType === 'vcut' || engraveType === 'frost') return surfaceZ + 0.021;
    if (engraveType === 'polish') return surfaceZ + 0.01;
    return surfaceZ + 0.002;
  }, []);

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
  }, [monument, text.id, text.position, text.engraveType, onTextPositionChange, modelRefs, computeSurfaceZ]);

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

  useEffect(() => {
    const refs = lineRefs.current;
    if (!refs || refs.length === 0) return;
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
  }, [text.content, text.size, text.kerning, text.lineSpacing, text.alignment]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    if (onTextSelect) {
      onTextSelect(text.id);
    }
  }, [text.id, onTextSelect]);

  const renderCurvedText = () => {
    if (!text.content) return null;

    const characters = text.content.split('');
    const fontSize = text.size * 0.01;
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

  const renderNormalText = () => {
    const content = text.content || 'Text';
    const lines = content.split('\n');
    const fontSize = text.size * 0.01;
    const lineGap = fontSize * (text.lineSpacing || 1.2);
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
  };

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
      </group>

      {isSelected && isTextEditing && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          space="local"
          showX={transformMode === 'translate'}
          showY={transformMode === 'translate'}
          showZ={transformMode === 'rotate'}
          onMouseDown={() => { controls && (controls.enabled = false); setIsDragging(true); }}
          onObjectChange={writeBackPoseToState}
          onMouseUp={() => { writeBackPoseToState(); controls && (controls.enabled = true); setIsDragging(false); }}
        />
      )}
    </>
  );
};

export default EnhancedTextElement;