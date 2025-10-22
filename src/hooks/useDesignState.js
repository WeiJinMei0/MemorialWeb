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
  textElements: [],
  currentMaterial: 'Black'
};

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

  // 默认加载monument(Tablet+Base)
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


  const addBase = useCallback(() => {
    const base = {
      id: `base-${Date.now()}`,
      type: 'base',
      polish: 'P5',
      color: designState.currentMaterial,
      modelPath: buildModelPath('base', null, null, 'P5'),
      texturePath: buildTexturePath('base', null, null, 'P5', designState.currentMaterial),
      position: [designState.bases.length * 2, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      bases: [...prev.bases, base]
    }));
  }, [designState, updateDesignState, buildModelPath, buildTexturePath]);

  const removeBase = useCallback((baseId) => {
    updateDesignState(prev => ({
      ...prev,
      bases: prev.bases.filter(base => base.id !== baseId)
    }));
  }, [updateDesignState]);


  const addSubBase = useCallback(() => {
    const subBase = {
      id: `subbase-${Date.now()}`,
      type: 'subBase',
      polish: 'P5',
      color: designState.currentMaterial,
      modelPath: buildModelPath('subBase', null, null, 'P5'),
      texturePath: buildTexturePath('subBase', null, null, 'P5', designState.currentMaterial),
      position: [designState.subBases.length * 2, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      subBases: [...prev.subBases, subBase]
    }));
  }, [designState, updateDesignState, buildModelPath, buildTexturePath]);

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
        // artElements: updateElementMaterial(prev.artElements)
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
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      vases: [...prev.vases, vase]
    }));
  }, [designState, updateDesignState]);

  
  const addArt = useCallback((artData) => {
    const art = {
      id: `art-${Date.now()}`,
      type: 'art',
      class: artData.class,
      subclass: artData.subclass,
      color: designState.currentMaterial,
      modelPath: `./models/Art/${artData.class}/${artData.subclass}/${artData.class}_${artData.subclass}.glb`,
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => ({
      ...prev,
      artElements: [...prev.artElements, art]
    }));
  }, [designState, updateDesignState]);

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
          elementToDuplicate.position[1],
          elementToDuplicate.position[2]
        ]
      };

      return {
        ...prev,
        ...setElements([...elements, duplicatedElement])
      };
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

  // 翻转元素
  const flipElement = useCallback((elementId, axis, elementType) => {
    // 翻转逻辑在3D组件中处理
    console.log(`Flip ${elementType} ${elementId} on ${axis} axis`);
  }, []);

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

  // 初始化默认Monument(Tablet+Base)
  useEffect(() => {
    loadDefaultTablet();
  }, [loadDefaultTablet]);

  return {
    designState,
    updateDesignState,
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
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    productFamilies: PRODUCT_FAMILIES,
    basePolishOptions: BASE_POLISH_OPTIONS
  };
};