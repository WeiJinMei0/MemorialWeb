// src/components/Designer/3d/EnhancedTextElement.jsx
import React, { useRef, useState, useEffect, useCallback, useMemo,useLayoutEffect } from 'react';
import { getFontFamilyForLanguage,FONT_OPTIONS  } from '../../../hooks/useDesignState';
import { useThree } from '@react-three/fiber';
import { Text3D, TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { extend } from '@react-three/fiber';
import { ReloadOutlined, DeleteOutlined, CheckOutlined, EditOutlined, } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

extend({ TextGeometry });

const DEFAULT_FONT_OPTION = {
  family: 'Cambria', 
  variant: 'regular', 
  name: 'Cambria_Regular', 
  path: '/fonts/Cambria_Regular.json', 
  cssFamily: 'serif' 
};


// 高清
function shapeToPath(shape, offsetX, offsetY) {
  let d = '';

  // 外轮廓
  const contour = shape.getPoints();
  contour.forEach((p, i) => {
    d += `${i === 0 ? 'M' : 'L'}${p.x + offsetX},${p.y + offsetY} `;
  });
  d += 'Z ';

  // 内部洞
  shape.holes.forEach(hole => {
    const pts = hole.getPoints();
    pts.forEach((p, i) => {
      d += `${i === 0 ? 'M' : 'L'}${p.x + offsetX},${p.y + offsetY} `;
    });
    d += 'Z ';
  });

  return d;
}


const useSVGTexture = (textContent, options = {}) => {
  const {
    fillColor = '#5D4037',
    fontSize = 64,
    fontOption,
    fontWeight = '900', // 仅用于语义，不再参与测量
    padding = 20,
    kerning = 0,
  } = options;

  const textureScale = 4; // 提高清晰度
  const textureScale2 = 1; 
  const [result, setResult] = useState(null);

  const BASE_FONT_SIZE = 76; 
  const shadowScale = fontSize / BASE_FONT_SIZE / 4;
  useEffect(() => {
    const realFontOption = fontOption?.path
      ? fontOption
      : DEFAULT_FONT_OPTION;

    if (!textContent) return;


    const loader = new FontLoader();
    let revokedUrl = null;

    loader.load(realFontOption.path, (font) => {
      /* 1️⃣ 生成 shapes（真实字体几何） */
      const shapes = font.generateShapes(
        textContent,
        fontSize * textureScale,
        { letterSpacing: kerning }
      );

      const geometry = new THREE.ShapeGeometry(shapes);
      geometry.computeBoundingBox();

      const box = geometry.boundingBox;

      const textWidth  = box.max.x - box.min.x;
      const textHeight = box.max.y - box.min.y;

      const pad = padding * textureScale;

      const svgWidth  = Math.ceil(textWidth  + pad * 2);
      const svgHeight = Math.ceil(textHeight + pad * 2);

      /* 2️⃣ path 数据（注意：直接用 shapes，不重新算） */
      let d = '';

      shapes.forEach(shape => {
        d += shapeToPath(
          shape,
          -box.min.x + pad,
          -box.min.y + pad
        );
      });


      geometry.dispose();

      /* 3️⃣ SVG */
      const svg = `
      <svg xmlns="http://www.w3.org/2000/svg"
        width="${svgWidth}"
        height="${svgHeight}"
        viewBox="0 0 ${svgWidth} ${svgHeight}">
        <defs>
          <filter id="innerShadow"
            x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">

            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation="${16 * shadowScale}"
              result="blur"/>

            <feOffset
              in="blur"
              dx="${-20 * shadowScale}" 
              dy="${20 * shadowScale}" 
              result="darkOffset"/>

            <feComposite
              in="darkOffset"
              in2="SourceAlpha"
              operator="in"
              result="darkCut"/>

            <feFlood
              flood-color="black"
              flood-opacity="0.98"
              result="floodDark"/>

            <feComposite
              in="floodDark"
              in2="darkCut"
              operator="in"
              result="dark"/>
        
            <feOffset
              in="blur"
              dx="${24 * shadowScale}"
              dy="${-20 * shadowScale}"
              result="lightOffset"/>

            <feComposite
              in="lightOffset"
              in2="SourceAlpha"
              operator="in"
              result="lightCut"/>

            <feFlood
              flood-color="${fillColor}"
              flood-opacity="1"
              result="floodLight"/>

            <feComposite
              in="floodLight"
              in2="lightCut"
              operator="in"
              result="light"/>

            <feMerge>
              <feMergeNode in="SourceGraphic"/>
              <feMergeNode in="dark"/>        
              <feMergeNode in="light"/>       
            </feMerge>
          </filter>
        </defs>
        <path
          d="${d}"
          fill="${fillColor}"
          fill-opacity="1"
          fill-rule="evenodd"
          clip-rule="evenodd"
          transform="translate(0, ${svgHeight}) scale(1,-1)"
          filter="url(#innerShadow)"
        />
      </svg>
      `;


      /* 4️⃣ SVG → Canvas → Texture */
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      revokedUrl = url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = svgWidth;
        canvas.height = svgHeight;

        const ctx = canvas.getContext('2d');
        // 确保背景透明
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        setResult({
          texture,
          widthPx: svgWidth / textureScale,
          heightPx: svgHeight / textureScale,
        });

        URL.revokeObjectURL(url);
      };

      img.src = url;
    });

    return () => {
      if (result?.texture) result.texture.dispose();
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [textContent, fontSize, fillColor, fontOption, padding]);

  return result;
};


function VcutLineMesh({
  text,
  vcutColor,
  fontOption,
  fontSize,
  position,
  kerning
}) {
  const result = useSVGTexture(text, {
    fillColor: vcutColor,
    fontSize,
    fontOption,
    kerning
  });

  if (!result) return null;

  const { texture, widthPx, heightPx } = result;
  const scale = 0.001;

  return (
    <mesh position={position}>
      <planeGeometry args={[widthPx * scale, heightPx * scale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        depthWrite={true}
        color={0xffffff}
      />
    </mesh>
  );
}

function VcutCurvedGlyph({
  char,
  fontSize,
  fontOption,
  position,
  rotationZ,
  vcutColor
}) {
  const result = useSVGTexture(char, {
    fillColor: vcutColor,
    fontSize,
    fontOption
  });

  if (!result) return null;

  const { texture, widthPx, heightPx } = result;
  const scale = 0.001;

  return (
    <mesh position={position} rotation={[0, 0, rotationZ]}>
      <planeGeometry args={[widthPx * scale, heightPx * scale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={true}
        color={0xffffff}
      />
    </mesh>
  );
}



/**
 * 独立的隐藏输入组件
 * 添加光标位置监听和焦点状态管理
 */
const HiddenTextarea = ({
  initialValue,
  onUpdate,
  onCursorChange,
  onFocusChange
}) => {
  const [value, setValue] = useState(initialValue);
  const [hasFocus, setHasFocus] = useState(false);
  const isComposing = useRef(false);
  const inputRef = useRef(null);

  // 挂载时自动聚焦
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
        if (onCursorChange) onCursorChange(len);
        setHasFocus(true);
        if (onFocusChange) onFocusChange(true);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 监听外部初始值变化
  useEffect(() => {
    if (!isComposing.current && initialValue !== value) {
      setValue(initialValue);
    }
  }, [initialValue]);

  // 处理光标移动
  const handleCursorMove = () => {
    if (onCursorChange && inputRef.current) {
      onCursorChange(inputRef.current.selectionStart);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);

    setTimeout(() => {
      if (onCursorChange && inputRef.current) {
        onCursorChange(inputRef.current.selectionStart);
      }
    }, 0);

    if (!isComposing.current) {
      onUpdate(newValue);
    }
  };

  const handleKeyDown = (e) => {
    setTimeout(() => handleCursorMove(), 10);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e) => {
    isComposing.current = false;
    onUpdate(e.target.value);
    setTimeout(() => handleCursorMove(), 10);
  };

  const handleFocus = () => {
    setHasFocus(true);
    if (onFocusChange) onFocusChange(true);
  };

  const handleBlur = () => {
    setHasFocus(false);
    if (onFocusChange) onFocusChange(false);
    onUpdate(value);
  };

  const handleClick = () => {
    setTimeout(() => handleCursorMove(), 10);
  };

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      style={{
        width: 200,
        height: 100,
        overflow: 'visible',
        pointerEvents: 'auto'
      }}
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onPointerMove={stopPropagation}
      onClick={(e) => {
        e.stopPropagation();
        inputRef.current?.focus();
        handleClick();
      }}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleCursorMove}
        onSelect={handleCursorMove}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: -100,
          opacity: 0.01,
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'transparent',
          fontSize: '16px',
          zIndex: 999999
        }}
        autoFocus
      />
    </div>
  );
};

/**
 * 主组件
 */
const EnhancedTextElement = ({
  text,
  monument,
  onTextContentChange,
  onTextPositionChange,
  onTextRotationChange,
  onTextSelect,
  onDeleteText,
  isSelected,
  isTextEditing,
  getFontPath,
  modelRefs,
  globalTransformMode,
  surfaceZ
}) => {
  const ART_RENDER_ORDER = 1;
  const TEXT_SHADOW_RENDER_ORDER = ART_RENDER_ORDER + 1;
  const TEXT_RENDER_ORDER = ART_RENDER_ORDER + 2;
  const { t } = useTranslation();
  const groupRef = useRef();


  const { controls } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [monumentMaterial, setMonumentMaterial] = useState(null);
  const [hasInitPosition, setHasInitPosition] = useState(false);
  const rafWriteRef = useRef(null);

  const mode = globalTransformMode || 'translate';
  const textDirection = text.textDirection || 'horizontal';

  
  // 旋转状态
  const [currentRotationDeg, setCurrentRotationDeg] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // --- 光标和焦点状态 ---
  const [cursorIndex, setCursorIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [inputHasFocus, setInputHasFocus] = useState(false); // 新增：输入框焦点状态

  // UI 边界状态
  const [uiPos, setUiPos] = useState({
    topLeft: [0, 0, 0],
    topRight: [0, 0, 0],
    bottomCenter: [0, 0, 0],
    width: 0,
    height: 0
  });

  // 处理焦点状态变化
  const handleFocusChange = (hasFocus) => {
    setInputHasFocus(hasFocus);
  };

  // 分离：只用于3D文本渲染的内容
  const textContentFor3D = useMemo(() => {
    const rawText = text.content || '';

    if (!isSelected || !isTextEditing) {
      return rawText || 'Enter Text';
    }

    // 只有当输入框有焦点且showCursor为true时才显示光标
    if (!inputHasFocus || !showCursor) {
      return rawText || 'Enter Text';
    }

    const safeIndex = Math.min(Math.max(0, cursorIndex), rawText.length);
    const before = rawText.slice(0, safeIndex);
    const after = rawText.slice(safeIndex);

    return before + '|' + after;
  }, [text.content, isSelected, isTextEditing, inputHasFocus, showCursor, cursorIndex]);

  // 分离：用于UI包围盒计算的内容（不需要光标）
  const textContentForBounds = useMemo(() => {
    return text.content || 'Enter Text';
  }, [text.content]);

  // 光标位置更新回调
  const handleCursorChange = (newIndex) => {
    setCursorIndex(newIndex);
  };

  //  计算 UI 包围盒（使用不含光标的文本）
  // 3. 计算 UI 包围盒 (增加 padding)  
  const recalculateBounds = useCallback(() => {
    // 简单的估算逻辑，用于定位 UI    
    const fontSize = text.size * 0.0254;
    const charWidth = 0.6; // 估算平均字宽比例    
    const content = text.content || 'Enter Text';
    const lines = textDirection === 'horizontal' ? content.split('\n') : content.split('');
    let maxWidth = 0;
    lines.forEach(line => {
      const w = line.length * fontSize * charWidth + (line.length * fontSize * (text.kerning || 0) * 0.001);
      if (w > maxWidth) maxWidth = w;
    });
    const totalHeight = lines.length * fontSize * (text.lineSpacing || 1.2);
    // 计算边界 (假设文字中心在原点附近)    
    const halfW = maxWidth / 2;
    const halfH = totalHeight / 2;
    // --- 调整这里来控制 UI 距离 ---    
    const paddingX = 0.15; // 左右额外的间距    
    const paddingY = 0.10; // 上下额外的间距
    setUiPos({
      // 左上角：向左上偏移      
      topLeft: [-halfW - paddingX, halfH + paddingY, 0],
      // 右上角：向右上偏移      
      topRight: [halfW + paddingX, halfH + paddingY, 0],
      // 底部中心：向下偏移，确保不遮挡      
      bottomCenter: [0.1, -halfH - 0.02, 0]
    });
  }, [text.content, text.size, text.kerning, text.lineSpacing, textDirection]);


  // 内容变化后重新计算包围盒
  useEffect(() => {
    const timer = setTimeout(recalculateBounds, 100);
    return () => clearTimeout(timer);
  }, [recalculateBounds]);

  // 材质逻辑 
  // 自动根据字符和语言切换字体 family
  // language 可根据实际项目国际化或内容自动推断，这里假设 text.language 或 'zh'/'en'/'ko'，如无则默认 'en'
  // 简单字符语言检测：中文、韩文、英文
  const detectCharLanguage = (char) => {
    if (/^[\u4e00-\u9fff]$/.test(char)) return 'zh'; // 中文
    if (/^[\uac00-\ud7af]$/.test(char)) return 'ko'; // 韩文
    if (/^[A-Za-z0-9\u0020-\u007E]$/.test(char)) return 'en'; // 英文及常用符号
    return 'en'; // 其它默认英文
  }

  // 获取渲染用字体 family（优先选中字体，若不支持则 fallback）
  const getRenderFontFamily = (selectedFamily, char) => {
    const lang = detectCharLanguage(char);
    return getFontFamilyForLanguage(selectedFamily, lang);
  };

  // 获取渲染用字体路径
  const localGetFontPath = useCallback((selectedFamily, char) => {
    const family = getRenderFontFamily(selectedFamily, char);
    return getFontPath ? getFontPath(family) : (family || '/fonts/helvetiker_regular.typeface.json');
  }, [getFontPath]);

  const textMaterial = useMemo(() => {
    if (text.engraveType === 'polish' && monumentMaterial) return monumentMaterial;
    try {
      const materialProps = { transparent: true, side: THREE.DoubleSide };
      switch (text.engraveType) {
        case 'vcut':
          return new THREE.MeshPhysicalMaterial({
            ...materialProps,
            color: text.vcutColor || '#5D4037',
            roughness: 0.9,
            metalness: 0.05,
            clearcoat: 0.1,
            clearcoatRoughness: 0.2,
            opacity: 0.95
          });
          
        
        case 'frost':
          return new THREE.MeshPhysicalMaterial({
            ...materialProps,
            color: 0xF8F8F8,
            roughness: Math.max(0.6, text.frostIntensity || 0.8),
            metalness: 0.02,
            transmission: 0.1,
            thickness: 0.01,
            opacity: 0.85 - ((text.frostIntensity || 0.8) * 0.2)
          });
        case 'polish':
          return new THREE.MeshPhysicalMaterial({
            ...materialProps,
            color: 0x7A7A7A,
            roughness: 0.1 + ((text.polishBlend || 0.5) * 0.4),
            metalness: 0.5 - ((text.polishBlend || 0.5) * 0.2),
            clearcoat: 0.5,
            clearcoatRoughness: 0.1 + ((text.polishBlend || 0.5) * 0.3),
            opacity: 0.98
          });
        default:
          return new THREE.MeshStandardMaterial({
            ...materialProps,
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
          });
      }
    } catch (e) {
      return new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    }
  }, [monumentMaterial, text.engraveType, text.vcutColor, text.frostIntensity, text.polishBlend]);

  const shadowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.5, side: THREE.FrontSide
  }), []);

  //  材质同步 (polish 材质)
  useEffect(() => {
    if (!monument) {
      setMonumentMaterial(null);
      return;
    }

    let rafId;
    const trySetMaterial = () => {
      if (text.engraveType !== 'polish') {
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


  //  对齐偏移计算 (保留 left, center, right)
  const lineRefs = useRef([]);
  const [lineOffsets, setLineOffsets] = useState([]);

  // 更新行偏移计算
  useEffect(() => {
    const refs = lineRefs.current;
    if (!refs || refs.length === 0) return;

    if (textDirection === 'horizontal') {
      const metrics = refs.map((mesh) => {
        if (!mesh || !mesh.geometry) return { width: 0, centerX: 0 };
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (!bb) return { width: 0, centerX: 0 };
        return {
          width: bb.max.x - bb.min.x,
          centerX: (bb.max.x + bb.min.x) / 2
        };
      });

      const maxWidth = metrics.reduce((m, v) => Math.max(m, v.width), 0);
      const newOffsets = metrics.map((m) => {
        let desiredCenter = 0;
        if (text.alignment === 'left') {
          desiredCenter = -maxWidth / 2 + m.width / 2;
        } else if (text.alignment === 'right') {
          desiredCenter = maxWidth / 2 - m.width / 2;
        } else {
          desiredCenter = 0;
        }
        const x = desiredCenter - m.centerX;
        return { x };
      });
      setLineOffsets(newOffsets);
    } else {
      const metrics = refs.map((mesh) => {
        if (!mesh || !mesh.geometry) return { height: 0, centerY: 0 };
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (!bb) return { height: 0, centerY: 0 };
        return {
          height: bb.max.y - bb.min.y,
          centerY: (bb.max.y + bb.min.y) / 2
        };
      });

      const maxHeight = metrics.reduce((m, v) => Math.max(m, v.height), 0);
      const newOffsets = metrics.map((m) => {
        let desiredY = 0;
        if (text.alignment === 'left') {
          desiredY = -maxHeight / 2 + m.height / 2;
        } else if (text.alignment === 'right') {
          desiredY = maxHeight / 2 - m.height / 2;
        } else {
          desiredY = 0;
        }
        const y = desiredY - m.centerY;
        return { y };
      });
      setLineOffsets(newOffsets);
    }
  }, [textContentFor3D, text.size, text.kerning, text.lineSpacing, text.alignment, textDirection]);

  const lines = useMemo(() => {
    const content = text.content || 'Enter Text';
    return textDirection === 'horizontal'
      ? content.split('\n')
      : content.split('');
  }, [text.content, textDirection]);

  const lineFontFamilies = useMemo(() => {
    return lines.map((ln) => {
      const firstNonEnChar = ln.match(/[^A-Za-z0-9\u0020-\u007E]/)?.[0];
      if (!firstNonEnChar) return text.font;
      const lang = detectCharLanguage(firstNonEnChar);
      return getFontFamilyForLanguage(text.font, lang);
    });
  }, [lines, text.font]);

  const lineFontOptions = useMemo(() => {
    return lineFontFamilies.map(f =>
      FONT_OPTIONS.find(opt => opt.name === f) || DEFAULT_FONT_OPTION
    );
  }, [lineFontFamilies]);
  

  // 渲染函数：弯曲文字
  const renderCurvedText = () => {
    if (!textContentFor3D) return null;
    const characters = textContentFor3D.split('');
    const fontSize = text.size * 0.0254;
    const kerningUnit = (text.kerning || 0) * 0.001;
    const curveAmount = text.curveAmount || 0;
    const curveDirection = curveAmount >= 0 ? 1 : -1;
    const curveIntensity = Math.min(Math.abs(curveAmount) / 100, 0.8);

    const calculateCharacterWidth = (char) => {
      if (char === '|') return 0.05;
      const widthMap = { 'i': 0.3, 'l': 0.3, 'I': 0.4, '1': 0.4, '!': 0.3, '.': 0.2, ',': 0.2, 't': 0.4, 'f': 0.4, 'r': 0.5, 'j': 0.3, 'm': 0.9, 'w': 0.9, 'M': 1.0, 'W': 1.0, ' ': 0.4 };
      return widthMap[char] || 0.7;
    };

    const charWidths = characters.map(char => calculateCharacterWidth(char) * fontSize);
    const totalWidth = charWidths.reduce((a, b) => a + b, 0) + (Math.max(0, characters.length - 1) * fontSize * kerningUnit);

    const minArcAngle = Math.PI * 0.2;
    const maxArcAngle = Math.PI * 1.2;
    const arcAngle = curveIntensity > 0 ? (minArcAngle + (maxArcAngle - minArcAngle) * curveIntensity) : 0;
    const radius = arcAngle > 1e-6 ? Math.max(totalWidth / arcAngle, totalWidth * 0.5) : 1e6;

    let currentAngle = -arcAngle / 2;
    const baseOffsetY = -fontSize * 0.5;

    return characters.map((char, index) => {
      const rotationZ = -currentAngle * curveDirection;
      const x = Math.sin(currentAngle) * radius;
      const y = (Math.cos(currentAngle) - 1) * radius * curveDirection + baseOffsetY;
      const charW = charWidths[index];
      currentAngle += (charW + fontSize * kerningUnit) / radius;

      if (text.engraveType === 'vcut') {
        return (
          <VcutCurvedGlyph
            key={index}
            char={char}
            fontSize={fontSize * 1000}
            fontOption={FONT_OPTIONS.find(f => f.name === text.font)}
            vcutColor={text.vcutColor}
            position={[x, y, 0]}
            rotationZ={rotationZ}
          />
        );
      }
      return (
        <group key={index} position={[x, y, 0]} rotation={[0, 0, rotationZ]}>
          <Text3D
            font={localGetFontPath(text.font, char)}
            size={fontSize}
            height={text.thickness || 0.02}
            material={textMaterial}
            renderOrder={TEXT_RENDER_ORDER}
            bevelEnabled
            bevelSize={0.002}
            bevelThickness={0.002}
          >
            {char}
          </Text3D>
        </group>
      );
    });
  };

  const renderNormalText = () => {
    const fontSize = text.size * 0.0254;
    const lineGap = fontSize * (text.lineSpacing || 1.2);
    const isVcut = text.engraveType === 'vcut';

    return (
      <group>
        {lines.map((ln, idx) => {
          const offsetX = lineOffsets[idx]?.x || 0;
          const offsetY = lineOffsets[idx]?.y || 0;
          const positionX = textDirection === 'horizontal' ? offsetX : offsetY;
          const positionY = textDirection === 'horizontal' ? -idx * lineGap : -idx * lineGap + offsetX;

          // vcut 模式使用 SVG 内阴影
          if (isVcut) {
            const fontOption = lineFontOptions[idx] || DEFAULT_FONT_OPTION;
            return (
              <VcutLineMesh
                key={idx}
                text={ln}
                fontSize={fontSize * 1000}
                vcutColor={text.vcutColor}
                fontOption={fontOption}
                position={[positionX, positionY, 0]}
                kerning={(text.kerning || 0) * 0.001}
              />
            );
          }

          // 检查整行是否包含非英文字符
          const hasNonEnglish = /[^A-Za-z0-9\u0020-\u007E]/.test(ln);
          let lineFontFamily = text.font || 'Cambria_Regular';
          if (hasNonEnglish) {
            // 检查当前字体是否支持该字符类型（如中文/韩文）
            // 取第一个非英文字符，检测其语言
            const firstNonEnChar = ln.match(/[^A-Za-z0-9\u0020-\u007E]/)?.[0];
            if (firstNonEnChar) {
              const lang = detectCharLanguage(firstNonEnChar);
              const fallbackFamily = getFontFamilyForLanguage(text.font, lang)
              lineFontFamily = fallbackFamily || 'Cambria_Regular';
            }
          }

          return (
            <group key={idx} position={[positionX, positionY, 0]}>
              <Text3D
                ref={(el) => {
                  if (!el) return;
                  lineRefs.current[idx] = el;
                  if (el.geometry) {
                    el.geometry.computeBoundingBox();
                    const box = el.geometry.boundingBox;
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    // 只修正 X / Y，不动 Z
                    el.geometry.translate(
                      -center.x,
                      -center.y,
                      0
                    );
                    el.geometry.computeBoundingSphere();
                  }
                }}
                font={localGetFontPath(lineFontFamily, ln)}
                size={fontSize}
                height={text.thickness || 0.02}
                letterSpacing={(text.kerning || 0) * 0.001}
                material={textMaterial}
                bevelEnabled
                bevelSize={0.002}
                bevelThickness={0.002}
              >
                {ln}
              </Text3D>

            </group>
          );
        })}
      </group>
    );
  };

  const renderTextContent = () => {
    return Math.abs(text.curveAmount) > 0 ? renderCurvedText() : renderNormalText();
  };



  // 事件处理

  const handleInputUpdate = (newVal) => {
    if (onTextContentChange) {
      onTextContentChange(text.id, newVal);
    }
  };

  const handleRotate90 = (e) => {
    e.stopPropagation();

    // 记录当前的旋转
    const currentRot = text.rotation || [0, 0, 0];
    const newRotation = [currentRot[0], currentRot[1], (currentRot[2] || 0) + Math.PI / 2];

    // 更新旋转
    onTextRotationChange?.(text.id, newRotation);

    // 延迟重新计算边界
    setTimeout(() => {
      recalculateBounds();
    }, 100);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDeleteText?.(text.id);
    if (onTextSelect) {
      onTextSelect(null);
    }
  };

  const handleDone = (e) => {
    e.stopPropagation();
    onTextSelect?.(null);
  };

  const handleGroupClick = (e) => {
    e.stopPropagation();
    if (onTextSelect) {
      onTextSelect(text.id);
    }
  };


  //  位置同步
  const computeSurfaceZ = useCallback((sizeZ, engraveType) => {
    const surfaceZ = -sizeZ / 2;
    if (engraveType === 'vcut' || engraveType === 'frost') return surfaceZ + 0.021;
    if (engraveType === 'polish') return surfaceZ + 0.01;
    return surfaceZ + 0.002;
  }, []);

  const writeBackPoseToState = useCallback(() => {
    // If no monument, write back position directly without transformation
    if (!groupRef.current) return;

    if (!monument) {
      // Write position and rotation directly in world coordinates
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      groupRef.current.getWorldPosition(worldPosition);
      groupRef.current.getWorldQuaternion(worldQuaternion);
      const euler = new THREE.Euler().setFromQuaternion(worldQuaternion, 'XYZ');

      const doWrite = () => {
        onTextPositionChange && onTextPositionChange(text.id, [worldPosition.x, worldPosition.y, worldPosition.z]);
        onTextRotationChange && onTextRotationChange(text.id, [euler.x, euler.y, euler.z]);
        rafWriteRef.current = null;
      };
      if (!rafWriteRef.current) rafWriteRef.current = requestAnimationFrame(doWrite);
      return;
    }

    // Original monument-dependent code
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
    if (!groupRef.current) return;

    // If no monument, position text directly in world coordinates
    if (!monument) {
      const x = Array.isArray(text.position) ? (text.position[0] || 0) : 0;
      const y = Array.isArray(text.position) ? (text.position[1] || 0.3) : 0.3;
      const z = Array.isArray(text.position) ? (text.position[2] || 0) : 0;

      const localPoint = new THREE.Vector3(x, y, z);
      groupRef.current.position.copy(localPoint);

      const localEuler = new THREE.Euler(...(text.rotation || [0, 0, 0]), 'XYZ');
      const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
      groupRef.current.quaternion.copy(localQuat);
      return;
    }

    // Original monument-dependent positioning
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

    // CS新增
    if (text.engraveType === 'vcut') {

      // 需要补偿的距离
      const bias = -0.0001;
      const zOffset = -0.02 + bias;

      // 将补偿距离应用到世界坐标上
      // 注意：这里需要沿着墓碑的局部 Z 轴方向进行补偿
      // 所以我们创建一个局部空间的偏移向量，然后将其转换到世界空间
      const localOffset = new THREE.Vector3(0, 0, zOffset);
      const worldOffset = localOffset.clone().applyQuaternion(worldQuaternion); // 注意：使用 clone() 避免修改原向量

      // 将世界空间的偏移量加到最终位置上
      worldPoint.add(worldOffset);
    }

    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const localEuler = new THREE.Euler(...(text.rotation || [0, 0, 0]), 'XYZ');
    const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
    const worldQuat = worldQuaternion.clone().multiply(flipQuat).multiply(localQuat);

    if (!isDragging) {
      groupRef.current.position.copy(worldPoint);
      groupRef.current.quaternion.copy(worldQuat);
    }
    
  }, [monument, text.position, text.rotation, modelRefs, isDragging, text.engraveType, text.thickness]);

  useEffect(() => {
    // Skip initial positioning if no monument
    if (!monument) return;

    const isDefault = Array.isArray(text.position)
      ? (text.position[0] === 0 && text.position[1] === 0 && text.position[2] === 0)
      : true;

    if (isDefault && !hasInitPosition && monument && onTextPositionChange) {
      onTextPositionChange(text.id, [0, 0.3, 0.02], { replaceHistory: true });
      setHasInitPosition(true);
    }
  }, [text.id, text.position, monument, hasInitPosition]);

  useEffect(() => {
    // Skip Z-sync if no monument
    if (!monument) return;

    if (surfaceZ !== null && surfaceZ !== undefined) {
      const monumentMesh = modelRefs.current[monument.id]?.getMesh();
      if (!monumentMesh) return;

      monumentMesh.updateWorldMatrix(true, false);
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      monumentMesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);

      const currentLocal = Array.isArray(text.position) ? [...text.position] : [0, 0, 0];
      const currentLocalVec = new THREE.Vector3(currentLocal[0] || 0, currentLocal[1] || 0, currentLocal[2] || 0);

      const currentWorldVec = currentLocalVec.clone()
        .multiply(worldScale)
        .applyQuaternion(worldQuat)
        .add(worldPos);

      const thickness = text.thickness || 0.02;
      const manualOffset = 0.005;
      const targetWorldZ = surfaceZ + thickness + manualOffset;

      if (Math.abs(currentWorldVec.z - targetWorldZ) > 0.001) {
        const targetWorldVec = currentWorldVec.clone();
        targetWorldVec.z = targetWorldZ;

        const targetLocalVec = targetWorldVec.clone()
          .sub(worldPos)
          .applyQuaternion(worldQuat.clone().invert())
          .divide(worldScale);

        if (onTextPositionChange) {
          onTextPositionChange(text.id, [currentLocal[0], currentLocal[1], targetLocalVec.z]);
        }
      }
      return;
    }

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

  }, [monument, text.id, text.position, text.engraveType, text.thickness, onTextPositionChange, modelRefs, computeSurfaceZ, surfaceZ]);

  // 渲染

  const btnStyle = {
    background: '#556B2F',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'transform 0.1s'
  };

  // 使用 useMemo 来缓存 UI 组件，防止重新渲染
  const controlButtons = useMemo(() => {
    if (!isSelected || !isTextEditing) return null;

    return (
      <>
        {/* 1. 隐形输入组件 */}
        <Html
          position={uiPos.bottomCenter}
          //zIndexRange={[999, 0]}
          zIndexRange={[1, 100]}  // 最低层级
          style={{ pointerEvents: 'none' }}
        >
          <HiddenTextarea
            initialValue={text.content}
            onUpdate={handleInputUpdate}
            onCursorChange={handleCursorChange}
            onFocusChange={handleFocusChange}
          />
        </Html>

        {/* 2. 左上角：旋转 */}
        <Html position={uiPos.topLeft} center zIndexRange={[1000, 2000]}>
          <div
            style={{ ...btnStyle, width: 28, height: 28 }}
            onClick={handleRotate90}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ReloadOutlined style={{ transform: 'scaleX(-1)' }} />
          </div>
        </Html>

        {/* 3. 右上角：删除 */}
        <Html position={uiPos.topRight} center zIndexRange={[1000, 2000]}>
          <div
            style={{ ...btnStyle, width: 28, height: 28, background: '#8B0000' }}
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DeleteOutlined />
          </div>
        </Html>

        {/* 4. 底部：根据焦点状态显示不同的按钮 */}
        <Html position={uiPos.bottomCenter} center zIndexRange={[100, 0]}>
          <div style={{ transform: 'translate(-50%, 50%)' }}>
            <div
              style={{
                ...btnStyle,
                padding: '4px 12px',
                fontSize: '14px',
                gap: '6px',
                background: inputHasFocus ? '#2F4F4F' : '#556B2F' // 根据焦点状态改变颜色
              }}
              onClick={handleDone}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {inputHasFocus ? (
                <>
                  <EditOutlined /> {t('textEditor.editing')}
                </>
              ) : (
                <>
                  <CheckOutlined />{t('textEditor.done')}
                </>
              )}
            </div>
          </div>
        </Html>
      </>
    );
  }, [isSelected, isTextEditing, uiPos, text.content, inputHasFocus]); // 依赖 inputHasFocus

  return (
    <>
      <group
        ref={groupRef}
        onClick={handleGroupClick}
        onPointerDown={(e) => e.stopPropagation()}
        userData={{ isTextElement: true, textId: text.id }}
      >
          {renderTextContent()}
        {controlButtons}
      </group>

      {isSelected && isTextEditing && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={mode}
          space="local"
          anchor="center"
          showX={mode === 'translate'}
          showY={mode === 'translate'}
          showZ={mode === 'rotate'}
          size={0.6}
          onMouseDown={() => {
            if (controls) controls.enabled = false;
            setIsDragging(true);
          }}
          onMouseUp={() => {
            writeBackPoseToState();
            if (controls) controls.enabled = true;
            setIsDragging(false);
          }}
        />
      )}
    </>
  );
};

export default EnhancedTextElement;