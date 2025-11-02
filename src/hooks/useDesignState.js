import { useState, useCallback, useRef, useEffect } from 'react'

const PRODUCT_FAMILIES = {
  'Tablet': {
    needsBase: true,
    defaultPolish: 'P5',
    polishOptions: ['P2', 'P3', 'P5'],
    // basePolishOptions: ['PT', 'P5', 'PM2'],
    defaultClass: 'Serp Top'
  },
  'Bench': {
    needsBase: false,
    defaultPolish: 'P5',
    polishOptions: ['P5'],
    defaultClass: 'Smith Cremation Bench'
  },
  'Rock': {
    needsBase: false,
    defaultPolish: 'P5',
    polishOptions: ['P5'],
    defaultClass: 'Triangle Rock'
  },
  'Pedestal': {
    needsBase: false,
    defaultPolish: 'P5',
    polishOptions: [ 'P5'],
    defaultClass: 'Cremation Pedestal'
  },
  'Columbarium': {
    needsBase: false,
    defaultPolish: 'P5',
    polishOptions: ['P5'],
    defaultClass: 'Hampton - 2 unit'
  }
}

const BASE_POLISH_OPTIONS = ['PT', 'P5', 'PM2'];

const MATERIAL_DENSITY = {
  'Black': 2700,
  'Grey': 2650,
  'Red': 2600,
  'Blue': 2750,
  'Green': 2720
}

const initialDesignState = {
  monuments: [],
  bases:[],
  subBases: [],
  vases: [],
  artElements: [],
  textElements: [], // <-- 合并点：添加了 textElements
  currentMaterial: 'Black'
};

// --- 合并点：从同事的 useDesignState.js 添加了 FONT_OPTIONS ---
const FONT_OPTIONS = [
  { name: 'Helvetiker', path: '/fonts/helvetiker_regular.typeface.json' },
  { name: 'Arial', path: '/fonts/Arial_Regular.json' },
  { name: 'Arial Bold', path: '/fonts/Arial_Bold.json' },
  { name: 'Arial Italic', path: '/fonts/Arial_Italic (1).json' },
  { name: 'Roman', path: '/fonts/Adobe Myungjo Std M_Regular.json' },
  { name: 'Times-Roman', path: '/fonts/Calisto MT_Regular.json' },
  { name: 'Script MT Bold', path: '/fonts/AlgerianBasDEE_Regular.json' },
  { name: 'EnglishScriptEF-BoldArbor', path: '/fonts/Arkipelago_Regular.json' },
  { name: 'Gauranga', path: '/fonts/Adobe Gothic Std B_Bold.json' },
  { name: 'FZLiShu', path: '/fonts/Arial Unicode MS_Regular.json' },
  { name: 'Arkipelago', path: '/fonts/Arkipelago_Regular.json' },
  { name: 'Calibri', path: '/fonts/Calibri_Regular.json' },
  { name: 'Calibri Bold', path: '/fonts/Calibri_Bold.json' },
  { name: 'Calibri Italic', path: '/fonts/Calibri_Italic.json' },
  { name: 'Calibri Light', path: '/fonts/Calibri Light_Regular.json' },
];


export const useDesignState = () => {
  const [designState, setDesignState] = useState(initialDesignState)
  const historyRef = useRef([JSON.parse(JSON.stringify(initialDesignState))])
  const historyIndexRef = useRef(0)

  const addHistory = useCallback((newState) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(newState)));
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const updateDesignState = useCallback((updater) => {
    setDesignState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      addHistory(newState);
      return newState;
    });
  }, [addHistory]);

  // --- 这是您文件中的 loadDesign (现在它被正确包含了) ---
  const loadDesign = useCallback((designToLoad) => {
    const parsedDesign = JSON.parse(JSON.stringify(designToLoad));
    setDesignState(parsedDesign);
    historyRef.current = [parsedDesign];
    historyIndexRef.current = 0;
  }, []);


  // 构建模型路径
  const buildModelPath = useCallback((type, family, productClass, polish) => {
    if (type === 'base' || type === 'subBase') {
      return `./models/Bases/${polish}/Base_${polish}.glb`;
    } else {
      return `./models/Shapes/${family}/${productClass}/${polish}/${family}_${productClass}_${polish}.glb`;
    }
  }, []);

  // 构建纹理路径
  const buildTexturePath = useCallback((type, family, productClass, polish, color) => {
    if (type === 'base' || type === 'subBase') {
      return `./textures/Bases/${polish}/Base_${polish}_${color}.jpg`;
    } else {
      return `./textures/Shapes/${family}/${productClass}/${polish}/${family}_${productClass}_${polish}_${color}.jpg`;
    }
  }, []);

  // --- 这是您文件中的 loadDefaultTablet (现在它被正确包含了) ---
  const loadDefaultTablet = useCallback(() => {
    const family = 'Tablet';
    const productClass = 'Serp Top';
    const polish = 'P5';
    const color = 'Black';

    const monument = {
      id: 'monument-1',
      type: 'monument',
      family,
      class: productClass,
      polish,
      color,
      modelPath: buildModelPath('monument', family, productClass, polish),
      texturePath: buildTexturePath('monument', family, productClass, polish, color),
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    const base = {
      id: 'base-1',
      type: 'base',
      polish: 'P5',
      color,
      modelPath: buildModelPath('base', null, null, 'P5'),
      texturePath: buildTexturePath('base', null, null, 'P5', color),
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      monuments: [monument],
      bases: [base],
      subBases: [],
      currentMaterial: color
    }));
  }, [updateDesignState, buildModelPath, buildTexturePath]);

  const addProduct = useCallback((productData) => {
    const { family, class: productClass, polish = 'P5' } = productData;
    const color = designState.currentMaterial;
    const familyConfig = PRODUCT_FAMILIES[family];

    if (!familyConfig) return;

    const monument = {
      id: `monument-${Date.now()}`,
      type: 'monument',
      family,
      class: productClass,
      polish,
      color,
      modelPath: buildModelPath('monument', family, productClass, polish),
      texturePath: buildTexturePath('monument', family, productClass, polish, color),
      position: [designState.monuments.length * 2, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => {
      const newState = { ...prev, monuments: [...prev.monuments, monument] };

      if (familyConfig.needsBase) {
        const base = {
          id: `base-${Date.now()}`,
          type: 'base',
          polish: 'P5',
          color,
          modelPath: buildModelPath('base', null, null, 'P5'),
          texturePath: buildTexturePath('base', null, null, 'P5', color),
          position: [prev.bases.length * 2, 0, 0],
          dimensions: { length: 0, width: 0, height: 0 },
          weight: 0
        };
        newState.bases = [...prev.bases, base];
      } else {
        newState.bases = [];
        newState.subBases = [];
      }

      return newState;
    });
  }, [designState, updateDesignState, buildModelPath, buildTexturePath]);

  // --- 合并点：从同事的 DesignerPage.jsx 中添加 addTablet ---
  const addTablet = useCallback(() => {
    addProduct({
      family: 'Tablet',
      class: 'Serp Top',
      polish: 'P5'
    });
  }, [addProduct]);


  const addBase = useCallback(() => {
    updateDesignState(prev => {
      const base = {
        id: `base-${Date.now()}`,
        type: 'base',
        polish: 'P5',
        color: prev.currentMaterial,
        modelPath: buildModelPath('base', null, null, 'P5'),
        texturePath: buildTexturePath('base', null, null, 'P5', prev.currentMaterial),
        position: [prev.bases.length * 2, 0, 0],
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      };

      return {
        ...prev,
        bases: [...prev.bases, base]
      };
    });
  }, [updateDesignState, buildModelPath, buildTexturePath]);

  const removeBase = useCallback((baseId) => {
    updateDesignState(prev => ({
      ...prev,
      bases: prev.bases.filter(base => base.id !== baseId)
    }));
  }, [updateDesignState]);


  const addSubBase = useCallback(() => {
    updateDesignState(prev => {
      const subBase = {
        id: `subbase-${Date.now()}`,
        type: 'subBase',
        polish: 'P5',
        color: prev.currentMaterial,
        modelPath: buildModelPath('subBase', null, null, 'P5'),
        texturePath: buildTexturePath('subBase', null, null, 'P5', prev.currentMaterial),
        position: [prev.subBases.length * 2, 0, 0],
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      };

      return {
        ...prev,
        subBases: [...prev.subBases, subBase]
      };
    });
  }, [updateDesignState, buildModelPath, buildTexturePath]);

  const removeSubBase = useCallback((subBaseId) => {
    updateDesignState(prev => ({
      ...prev,
      subBases: prev.subBases.filter(subBase => subBase.id !== subBaseId)
    }));
  }, [updateDesignState]);


  const updateMaterial = useCallback((color) => {
    updateDesignState(prev => {
      const updateElementMaterial = (elements) =>
        elements.map(element => ({
          ...element,
          color,
          texturePath: element.texturePath.replace(/_[^_]+\.jpg$/, `_${color}.jpg`)
        }));

      return {
        ...prev,
        currentMaterial: color,
        monuments: updateElementMaterial(prev.monuments),
        bases: updateElementMaterial(prev.bases),
        subBases: updateElementMaterial(prev.subBases),
        vases: updateElementMaterial(prev.vases),
      };
    });
  }, [updateDesignState]);


  const updatePolish = useCallback((elementId, newPolish, elementType) => {
    updateDesignState(prev => {
      const updateElement = (elements) =>
        elements.map(element => {
          if (element.id === elementId) {
            let newModelPath, newTexturePath;

            if (elementType === 'monument') {
              newModelPath = buildModelPath('monument', element.family, element.class, newPolish);
              newTexturePath = buildTexturePath('monument', element.family, element.class, newPolish, element.color);
            } else {
              newModelPath = buildModelPath(elementType, null, null, newPolish);
              newTexturePath = buildTexturePath(elementType, null, null, newPolish, element.color);
            }

            return {
              ...element,
              polish: newPolish,
              modelPath: newModelPath,
              texturePath: newTexturePath
            };
          }
          return element;
        });

      let updatedState = { ...prev };

      switch (elementType) {
        case 'monument':
          updatedState.monuments = updateElement(prev.monuments);
          break;
        case 'base':
          updatedState.bases = updateElement(prev.bases);
          break;
        case 'subBase':
          updatedState.subBases = updateElement(prev.subBases);
          break;
        default:
          break;
      }

      return updatedState;
    });
  },[updateDesignState, buildModelPath, buildTexturePath]);


  const updateDimensions = useCallback((elementId, newDimensions, elementType) => {
    updateDesignState(prev => {
      const updateElement = (elements) =>
        elements.map(element => {
          if (element.id === elementId) {
            const currentDims = element.dimensions;
            const newDims = {
              length: Number(newDimensions.length) || 1,
              width: Number(newDimensions.width) || 1,
              height: Number(newDimensions.height) || 1
            };
            if (
              currentDims.length === newDims.length &&
              currentDims.width === newDims.width &&
              currentDims.height === newDims.height
            ) {
              return element;
            }
            return {
              ...element,
              dimensions: newDims,
              weight: calculateWeight(newDims, element.color)
            };
          }
          return element;
        });

      let updatedState = { ...prev };

      switch (elementType) {
        case 'monument':
          updatedState.monuments = updateElement(prev.monuments);
          break;
        case 'base':
          updatedState.bases = updateElement(prev.bases);
          break;
        case 'subBase':
          updatedState.subBases = updateElement(prev.subBases);
          break;
        case 'vase':
          updatedState.vases = updateElement(prev.vases);
          break;
        case 'art':
          // 您的代码 (src/hooks/useDesignState.js) 没有这个 case,
          // 同事的 (useDesignState.js) 有。
          // 您的 art (InteractiveArtPlane) 使用 updateArtElementState (scale)
          // 所以这个 case 可能是旧的，但保留它以防万一
          updatedState.artElements = updateElement(prev.artElements);
          break;
        default:
          break;
      }

      return updatedState;
    });
  }, [updateDesignState]);


  const addVase = useCallback((vaseData) => {
    const vase = {
      id: `vase-${Date.now()}`,
      type: 'vase',
      class: vaseData.class,
      name: vaseData.name,
      color: designState.currentMaterial,
      modelPath: `./models/Vases/${vaseData.class}/${vaseData.name}.glb`,
      texturePath: `./textures/Vases/${vaseData.class}/${vaseData.name}_${designState.currentMaterial}.jpg`,
      position: [0, 0, 0],
      dimensions: { length: 0.5, width: 0.5, height: 0.5 }, // 您的版本有默认尺寸
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      vases: [...prev.vases, vase]
    }));
  }, [designState, updateDesignState]);


  // 这是您的 addArt (for InteractiveArtPlane)
  const addArt = useCallback((artData) => {
    const art = {
      id: `art-${Date.now()}`,
      type: 'art',
      class: artData.class,
      subclass: artData.subclass,
      color: designState.currentMaterial,
      imagePath: artData.imagePath, // 您的版本使用 imagePath

      // --- 修改开始 ---
      // 检查 artData (来自保存的图案) 是否已有这些属性，如果有，则使用它；否则，使用默认值
      position: artData.position || [0, 0, -0.205],
      dimensions: artData.dimensions || { length: 0.2, width: 0.01, height: 0.2 },
      scale: artData.scale || [0.2, 0.2, 1],
      rotation: artData.rotation || [0, 0, 0],
      weight: artData.weight || 0,
      // --- 修改结束 ---

      // 【关键修复】：将 artData 中的 modifiedImageData 和 properties 也复制过来
      modifiedImageData: artData.modifiedImageData || null,
      properties: artData.properties || {}
    };

    updateDesignState(prev => ({
      ...prev,
      artElements: [...prev.artElements, art]
    }));
  }, [designState, updateDesignState]);

  // 这是您的 updateArtElementState
  const updateArtElementState = useCallback((artId, updater) => {
    updateDesignState(prev => ({
      ...prev,
      artElements: prev.artElements.map(art => {
        if (art.id === artId) {
          const newPartialState = typeof updater === 'function'
            ? updater(art)
            : updater;
          return { ...art, ...newPartialState };
        }
        return art;
      })
    }));
  }, [updateDesignState]);

  // 复制元素
  const duplicateElement = useCallback((elementId, elementType) => {
    updateDesignState(prev => {
      const getElements = () => {
        switch (elementType) {
          case 'vase': return prev.vases;
          case 'art': return prev.artElements;
          default: return [];
        }
      };

      const setElements = (elements) => {
        switch (elementType) {
          case 'vase': return { vases: elements };
          case 'art': return { artElements: elements };
          default: return {};
        }
      };

      const elements = getElements();
      const elementToDuplicate = elements.find(el => el.id === elementId);
      if (!elementToDuplicate) return prev;

      const duplicatedElement = {
        ...elementToDuplicate,
        id: `${elementType}-${Date.now()}`,
        position: [
          elementToDuplicate.position[0] + 0.5,
          elementToDuplicate.position[1] + 0.1, // 您的版本有 0.1Y 偏移
          elementToDuplicate.position[2]
        ]
      };

      return { ...prev, ...setElements([...elements, duplicatedElement]) };
    });
  }, [updateDesignState]);

  // 删除元素
  const deleteElement = useCallback((elementId, elementType) => {
    updateDesignState(prev => {
      switch (elementType) {
        case 'vase':
          return { ...prev, vases: prev.vases.filter(vase => vase.id !== elementId) };
        case 'art':
          return { ...prev, artElements: prev.artElements.filter(art => art.id !== elementId) };
        default:
          return prev;
      }
    });
  }, [updateDesignState]);

  // 翻转元素 (您的版本)
  const flipElement = useCallback((elementId, axis, elementType) => {
    updateDesignState(prev => {
      if (elementType === 'art') {
        return {
          ...prev,
          artElements: prev.artElements.map(art => {
            if (art.id === elementId) {
              const currentScale = art.scale || [1, 1, 1];
              let newScale = [...currentScale];

              if (axis === 'x') {
                newScale[0] *= -1;
              } else if (axis === 'y') {
                newScale[1] *= -1;
              } else if (axis === 'z') {
                newScale[2] *= -1;
              }

              return { ...art, scale: newScale };
            }
            return art;
          })
        };
      }
      return prev;
    });
  }, [updateDesignState]);

  // 计算重量
  const calculateWeight = (dimensions, material) => {
    const volume = (dimensions.length * dimensions.width * dimensions.height) ;
    const density = MATERIAL_DENSITY[material] || 2700;
    return Math.round(volume * density * 100) / 100;
  };

  // 撤销/重做
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setDesignState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setDesignState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  // --- 合并点：添加所有文本函数 (来自同事的 useDesignState.js) ---
  const getFontPath = (nameOrPath) => {
    if (!nameOrPath) return '/fonts/helvetiker_regular.typeface.json';
    if (nameOrPath.startsWith('/fonts/') || nameOrPath.endsWith('.json')) return nameOrPath;
    const font = FONT_OPTIONS.find(f => f.name === nameOrPath);
    return font ? font.path : '/fonts/helvetiker_regular.typeface.json';
  };

  const addText = useCallback((textData) => {
    const newText = {
      id: `text-${Date.now()}`,
      monumentId: textData.monumentId,
      content: textData.content,
      font: textData.font || 'Arial',
      size: textData.size || 16,
      color: textData.color || '#000000',
      alignment: textData.alignment || 'center',
      kerning: textData.kerning || 0,
      lineSpacing: textData.lineSpacing || 1.2,
      engraveType: textData.engraveType || 'vcut',
      thickness: textData.thickness || 0.02,
      curveAmount: textData.curveAmount || 0,
      vcutColor: textData.vcutColor || '#000000',
      frostIntensity: textData.frostIntensity || 0.8,
      polishBlend: textData.polishBlend || 0.5,
      isSelected: true,
      isDragging: false,
      position: [0, 0, 0], // 添加默认 position
      rotation: [0, 0, 0]  // 添加默认 rotation
    };
    updateDesignState(prev => ({
      ...prev,
      textElements: [...prev.textElements, newText]
    }));
    return newText.id;
  }, [updateDesignState]);

  const updateText = useCallback((textId, updates) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        text.id === textId ? { ...text, ...updates } : text
      )
    }));
  }, [updateDesignState]);

  const deleteText = useCallback((textId) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.filter(text => text.id !== textId)
    }));
  }, [updateDesignState]);

  const setTextSelected = useCallback((textId, isSelected) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        // 如果我们正在选中这个 textId，把它设为 true
        text.id === textId ? { ...text, isSelected: isSelected } :
          // 否则 (如果我们正在选中另一个，或者 textId 为 null)，把其他所有都设为 false
          { ...text, isSelected: false }
      )
    }));
  }, [updateDesignState]);

  const updateTextPosition = useCallback((textId, newPosition) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        text.id === textId ? { ...text, position: newPosition } : text
      )
    }));
  }, [updateDesignState]);

  const updateTextRotation = useCallback((textId, newRotation) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        text.id === textId ? { ...text, rotation: newRotation } : text
      )
    }));
  }, [updateDesignState]);

  // ---------------- 结束合并文本函数 ----------------

  // ***** 移除了您文件中的 "无限循环" useEffect (您的原文件已经移除了它) *****

  return {
    designState,
    updateDesignState,
    loadDesign, // <-- 修正：正确导出
    loadDefaultTablet, // <-- 修正：正确导出
    updateDimensions,
    updatePolish,
    updateMaterial,
    addProduct,
    addBase,
    removeBase,
    addSubBase,
    removeSubBase,
    addVase,
    addArt,
    duplicateElement,
    deleteElement,
    flipElement,
    updateArtElementState,
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    productFamilies: PRODUCT_FAMILIES,
    basePolishOptions: BASE_POLISH_OPTIONS,

    // --- 合并点：添加所有文本和同事的返回 ---
    addTablet,
    texts: designState.textElements,
    addText,
    updateText,
    deleteText,
    setTextSelected,
    fontOptions: FONT_OPTIONS,
    getFontPath,
    updateTextPosition,
    updateTextRotation,
    // (来自同事 useDesignState.js 的额外函数，以防万一)
    // transformText,
    // updateTextRelativePosition
  };
};