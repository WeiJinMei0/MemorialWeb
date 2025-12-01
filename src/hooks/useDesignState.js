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
    polishOptions: ['P5'],
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
  bases: [],
  subBases: [],
  vases: [],
  artElements: [],
  textElements: [], // <-- 合并点：添加了 textElements
  currentMaterial: 'Black'
};

// --- 合并点：从同事的 useDesignState.js 添加了 FONT_OPTIONS ---
const FONT_OPTIONS = [
  // 英文/拉丁字体 (English/Latin Fonts)
  { name: 'Helvetiker', path: '/fonts/helvetiker_regular.typeface.json', cssFamily: 'Helvetica, Arial, sans-serif' },
  { name: 'Arial Regular', path: '/fonts/Arial_Regular.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Bold', path: '/fonts/Arial_Bold.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Italic', path: '/fonts/Arial_Italic.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Bold Italic', path: '/fonts/Arial_Bold Italic.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { name: 'Times New Roman Regular', path: '/fonts/Times New Roman_Regular.json', cssFamily: 'Times New Roman, Times, serif' },
  { name: 'Times New Roman Bold', path: '/fonts/Times New Roman_Bold.json', cssFamily: 'Times New Roman, Times, serif' },
  { name: 'Times New Roman Italic', path: '/fonts/Times New Roman_Italic.json', cssFamily: 'Times New Roman, Times, serif' },
  { name: 'Times New Roman Bold Italic', path: '/fonts/Times New Roman_Bold Italic.json', cssFamily: 'Times New Roman, Times, serif' },
  { name: 'Calibri Regular', path: '/fonts/Calibri_Regular.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Calibri Bold', path: '/fonts/Calibri_Bold.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Calibri Italic', path: '/fonts/Calibri_Italic.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Calibri Bold Italic', path: '/fonts/Calibri_Bold Italic.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Calibri Light Regular', path: '/fonts/Calibri Light_Regular.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Calibri Light Italic', path: '/fonts/Calibri Light_Italic.json', cssFamily: 'Calibri, Arial, sans-serif' },
  { name: 'Comic Sans MS Regular', path: '/fonts/Comic Sans MS_Regular.json', cssFamily: 'Comic Sans MS, cursive' },
  { name: 'EnglishScriptEF_Bold', path: '/fonts/EnglishScriptEF_Bold.json', cssFamily: 'EnglishScriptEF,sans-serif' },
  { name: 'Palatino Linotype Regular', path: '/fonts/Palatino Linotype_Regular.json', cssFamily: 'Palatino, serif' },
  //{ name: 'Palatino Linotype Bold', path: '/fonts/Palatino Linotype_Bold.json', cssFamily: 'Palatino, serif' },
  //{ name: 'Palatino Linotype Italic', path: '/fonts/Palatino Linotype_Italic.json', cssFamily: 'Palatino, serif' },
  //{ name: 'Palatino Linotype Bold Italic', path: '/fonts/Palatino Linotype_Bold Italic.json', cssFamily: 'Palatino, serif' },
  { name: 'Bookman Old Style Regular', path: '/fonts/Bookman Old Style_Regular.json', cssFamily: 'serif' },
  { name: 'Bookman Old Style Bold', path: '/fonts/Bookman Old Style_Bold.json', cssFamily: 'serif' },
  { name: 'Bookman Old Style Italic', path: '/fonts/Bookman Old Style_Italic.json', cssFamily: 'serif' },
  { name: 'Bookman Old Style Bold Italic', path: '/fonts/Bookman Old Style_Bold Italic.json', cssFamily: 'serif' },
  { name: 'Bookman Profi Regular', path: '/fonts/Bookman Profi_Regular.json', cssFamily: 'serif' },

  // 手写体/艺术字体 (Handwriting/Artistic Fonts)
  { name: 'Lucida Calligraphy Italic', path: '/fonts/Lucida Calligraphy_Italic.json', cssFamily: '"Lucida Calligraphy", cursive' },
  { name: 'Lucida Handwriting Italic', path: '/fonts/Lucida Handwriting_Italic.json', cssFamily: '"Lucida Handwriting", cursive' },
  { name: 'Script MT Bold Regular', path: '/fonts/Script MT Bold_Regular.json', cssFamily: 'cursive' },
  { name: 'SnellRoundhand Script Regular', path: '/fonts/SnellRoundhand Script_Regular.json', cssFamily: 'cursive' },
  //{ name: 'EnglishScriptEF Regular', path: '/fonts/EnglishScriptEF_Regular.json', cssFamily: 'cursive' },
  { name: 'Magnolia Script Regular', path: '/fonts/Magnolia Script_Regular.json', cssFamily: 'cursive' },
  { name: 'Lynda Cursive Normal', path: '/fonts/Lynda Cursive_Normal.json', cssFamily: 'cursive' },
  { name: 'Lynda Cursive Bold', path: '/fonts/Lynda Cursive_Bold.json', cssFamily: 'cursive' },
  { name: 'Spring Beauty Regular', path: '/fonts/Spring Beauty_Regular.json', cssFamily: 'cursive' },
  { name: 'Madina Regular', path: '/fonts/Madina_Regular.json', cssFamily: 'cursive' },

  // 古典/装饰字体 (Classical/Decorative Fonts)
  { name: 'Old English Text MT Regular', path: '/fonts/Old English Text MT_Regular.json', cssFamily: 'serif' },
  { name: 'Old English Regular', path: '/fonts/Old-English_Normal.json', cssFamily: 'serif' },
  { name: 'OldEnglishD Regular', path: '/fonts/OldEnglishD_Regular.json', cssFamily: 'serif' },
  { name: 'Colonna MT Regular', path: '/fonts/Colonna MT_Regular.json', cssFamily: 'serif' },
  { name: 'Copperplate Gothic Light Regular', path: '/fonts/Copperplate Gothic Light_Regular.json', cssFamily: 'serif' },
  { name: 'Copperplate Gothic Bold Regular', path: '/fonts/Copperplate Gothic Bold_Regular.json', cssFamily: 'serif' },
  { name: 'Algerian Regular', path: '/fonts/AlgerianBasDEE_Regular.json', cssFamily: 'serif' },
  { name: 'Gauranga Normal', path: '/fonts/Gauranga_Normal.json', cssFamily: 'serif' },
  { name: 'Grantham Roman', path: '/fonts/Grantham_Roman.json', cssFamily: 'serif' },
  { name: 'Roman Regular', path: '/fonts/Roman_Regular.json', cssFamily: 'serif' },
  { name: 'Romantic_Medium', path: '/fonts/Romantic_Medium.json', cssFamily: 'serif' },
  { name: 'MuseumClassic Bold Regular', path: '/fonts/MuseumClassic Bold_Regular.json', cssFamily: 'serif' },
  { name: 'Mythica Medium', path: '/fonts/MythicaW01-Medium_Regular.json', cssFamily: 'serif' },
  { name: 'OldeWorld Bold', path: '/fonts/OldeWorld-Bold_Regular.json', cssFamily: 'serif' },
  { name: 'Cheltenham Bold Condensed', path: '/fonts/CheltenhamW01-BoldCondensed_Regular.json', cssFamily: 'serif' },

  // 技术/等宽字体 (Technical/Monospace Fonts)
  { name: 'Square721 BT Roman', path: '/fonts/Square721 BT_Roman.json', cssFamily: 'sans-serif' },
  { name: 'Square721 BT Bold', path: '/fonts/Square721 BT_Bold.json', cssFamily: 'sans-serif' },
  { name: 'Adobe Gothic Std Bold', path: '/fonts/Adobe Gothic Std B_Bold.json', cssFamily: 'sans-serif' },
  { name: 'City Medium', path: '/fonts/CityDEEMed_Regular.json', cssFamily: 'sans-serif' },

  // 中文/汉字字体 (Chinese Fonts)
  { name: '方正楷体', path: '/fonts/FZCuKaiS-R-GB_Regular.json', isChinese: true },
  { name: '方正楷体-Z03', path: '/fonts/FZKai-Z03S_Regular.json', isChinese: true },
  { name: '方正隶书', path: '/fonts/FZLiShu II-S06T_Regular.json', isChinese: true },
  { name: '黑体', path: '/fonts/SimHei_Regular.json', isChinese: true },
  { name: '华文隶书', path: '/fonts/STLiti_Regular.json', isChinese: true },
  { name: '华文中宋', path: '/fonts/STZhongsong_Regular.json', isChinese: true },
  { name: '华文中宋 粗体', path: '/fonts/STZhongsong_Bold.json', isChinese: true },
  { name: "華康特粗楷體", path: '/fonts/DFKaiXBold-B5_Regular.json', isChinese: true },
  { name: " 腾祥伯当行楷简繁", path: '/fonts/Tensentype XingKaiF_Regular.json', isChinese: true },

  // 韩文/谚文字体 (Korean Fonts)
  { name: '고인돌B', path: '/fonts/(한)고인돌B_Regular.json' },
  { name: '볼펜체C', path: '/fonts/(한)볼펜체C_Regular.json' },
  { name: '판화체B', path: '/fonts/(한)판화체B_Regular.json' },
  { name: '가을잎체 굵은', path: '/fonts/(환)가을잎체(굵은)_Regular.json' },
  { name: '(환)궁서체_Regular', path: '/fonts/(환)궁서체_Regular.json' },
  { name: '(환)예서(중간)_Regular', path: '/fonts/(환)예서(중간)_Regular.json' },
  { name: '(환)진체(가는)_Regular', path: '/fonts/(환)진체(가는)_Regular.json' },

  // 其他语言字体 (Other Language Fonts)
  { name: 'AmharicGeèzEdit', path: '/fonts/GeèzEdit Amharic P_Regular.json' },
  { name: 'Amharic Nyala', path: '/fonts/Nyala_Regular.json' },
  { name: 'Russian Dusha', path: '/fonts/Dusha V5_Regular.json' },
  { name: 'Italian DRome', path: '/fonts/DRome_Regular.json' },
  { name: 'Japanese zktskt', path: '/fonts/zktskt_Regular.json' },

  // 特殊用途字体 (Special Purpose Fonts)
  { name: 'MLC Common Gothic', path: '/fonts/MLC Common Gothic SKS_Regular.json', cssFamily: 'sans-serif' },
  { name: 'MLC Condensed Roman', path: '/fonts/MLC Condensed Roman SKS .75in-1.25in_Regular.json', cssFamily: 'serif' },
  { name: 'MLC Government Extended', path: '/fonts/MLC Government SKS Extended_Regular.json', cssFamily: 'sans-serif' },
  { name: 'MLC Government Regulation', path: '/fonts/MLC Government SKS Regulation_Regular.json', cssFamily: 'sans-serif' },
  { name: 'MLC Modified Roman Raised', path: '/fonts/MLC Modified Roman Raised CR_Regular.json', cssFamily: 'serif' },
  { name: 'MLC Raised Modified Roman', path: '/fonts/MLC Raised Modified Roman SKS_Regular.json', cssFamily: 'serif' },
  { name: 'MLC Vermarco', path: '/fonts/MLC Vermarco PC_Regular.json', cssFamily: 'sans-serif' },
  { name: 'MDSol Regular', path: '/fonts/MDSol_Regular.json' },
  { name: 'SW Italic', path: '/fonts/SWItalc_Regular.json' },
  { name: 'TR Comic Sans MS', path: '/fonts/TR Comic Sans MS_Regular.json', cssFamily: 'Comic Sans MS, cursive' },

  // 花体/Zapf字体 (Zapf Fonts)
  { name: 'Zapf Chancery Medium Italic', path: '/fonts/Zapf Chancery BT_Medium Italic.json', cssFamily: 'serif' },
  { name: 'Zapf Chancery Demi', path: '/fonts/ZapfChan Dm BT_Demi.json', cssFamily: 'serif' },
  { name: 'ZapfChancery Medium Italic Ex', path: '/fonts/ZapfChancery-MediumItalic Ex_Regular.json', cssFamily: 'serif' },

  // 未分类字体 (Uncategorized Fonts)
  { name: 'Times Roman', path: '/fonts/Times-Roman_Regular.json', cssFamily: 'Times, serif' },
  { name: 'Undefined Regular', path: '/fonts/undefined_Regular.json' }
];

// --- 在这里添加缺失的 getFontPath 函数 ---
const getFontPath = (nameOrPath) => {
  if (!nameOrPath) return '/fonts/helvetiker_regular.typeface.json';
  if (nameOrPath.startsWith('/fonts/') || nameOrPath.endsWith('.json')) return nameOrPath;
  const font = FONT_OPTIONS.find(f => f.name === nameOrPath);
  return font ? font.path : '/fonts/helvetiker_regular.typeface.json';
};
// --- 添加结束 ---

export const useDesignState = () => {
  const [designState, setDesignState] = useState(initialDesignState)
  const historyRef = useRef([JSON.parse(JSON.stringify(initialDesignState))])
  const historyIndexRef = useRef(0)

  // --- 修改 addHistory 支持 replace ---
  const addHistory = useCallback((newState, replace = false) => {
    // 如果是 replace 模式，且历史记录不为空，则替换当前最新的一条
    if (replace && historyIndexRef.current >= 0) {
      const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      currentHistory[historyIndexRef.current] = JSON.parse(JSON.stringify(newState));
      historyRef.current = currentHistory;
    } else {
      // 正常模式：截断并追加
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(JSON.parse(JSON.stringify(newState)));
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
    }
  }, []);

  // --- 修改 updateDesignState 支持 options ---
  const updateDesignState = useCallback((updater, options = {}) => {
    setDesignState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      // 检查 options.replaceHistory
      addHistory(newState, options.replaceHistory);
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


  // --- 【V_MODIFICATION】: 移除了 buildModelPath 和 buildTexturePath ---
  // 它们代表旧的逻辑，新逻辑在 Scene3D.jsx 中处理


  // --- 这是您文件中的 loadDefaultTablet (现在它被正确包含了) ---
  const loadDefaultTablet = useCallback(() => {
    console.log("加载初始模型")
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
      // 【V_MODIFICATION】: 使用 Scene3D.jsx 期望的静态路径
      modelPath: "/models/Shapes/Tablet/Serp Top.glb",
      texturePath: "", // 不再需要，由 Scene3D.jsx 处理
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };
    // console.log(monument)

    const base = {
      id: 'base-1',
      type: 'base',
      polish: 'PT',
      color,
      // 【V_MODIFICATION】: 使用 Scene3D.jsx 期望的静态路径
      modelPath: "/models/Bases/Base.glb",
      texturePath: "", // 不再需要，由 Scene3D.jsx 处理
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    console.log("更新历史记录")
    updateDesignState(prev => ({
      ...prev,
      monuments: [monument],
      bases: [base],
      subBases: [],
      currentMaterial: color
    }));
  }, [updateDesignState]); // 移除了 buildModelPath, buildTexturePath

  const addProduct = useCallback((productData) => {
    const { family, class: productClass, polish = 'P5' } = productData;
    const color = designState.currentMaterial;
    const familyConfig = PRODUCT_FAMILIES[family];

    if (!familyConfig) return;

    // 1. 创建新的碑体
    const monument = {
      id: `monument-${Date.now()}`,
      type: 'monument',
      family,
      class: productClass,
      polish,
      color,
      modelPath: productData.modelPath, // (来自 ModelLibrary.jsx)
      texturePath: "",
      position: [0, 0, 0],
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    };

    updateDesignState(prev => {
      // 2. 从现有 state 开始 (保留 vases, art, text, subBases 等)
      const newState = { ...prev };

      // 3. 【V_MODIFICATION】: 替换碑体数组
      newState.monuments = [monument];

      // 4. 【V_MODIFICATION】: 替换底座数组
      if (familyConfig.needsBase) { //
        const base = {
          id: `base-${Date.now()}`,
          type: 'base',
          polish: 'PT',
          color,
          modelPath: "/models/Bases/Base.glb", //
          texturePath: "", //
          position: [0, 0, 0], // 重置位置
          dimensions: { length: 0, width: 0, height: 0 },
          weight: 0
        };
        // 替换，而不是附加
        newState.bases = [base];
      } else {
        // 如果新产品不需要底座，则清空底座和地基 (遵循原始逻辑)
        newState.bases = []; //
        newState.subBases = []; //
      }

      return newState;
    });
  }, [designState, updateDesignState]); //

  // --- 合并点：从同事的 DesignerPage.jsx 中添加 addTablet ---
  const addTablet = useCallback(() => {
    // 【V_MODIFICATION】: 我们需要模拟 ModelLibrary 提供的 productData 对象
    addProduct({
      family: 'Tablet',
      class: 'Serp Top',
      polish: 'P5',
      modelPath: "/models/Shapes/Tablet/Serp Top.glb" // 添加缺失的 modelPath
    });
  }, [addProduct]);


  const addBase = useCallback(() => {
    updateDesignState(prev => {
      const base = {
        id: `base-${Date.now()}`,
        type: 'base',
        polish: 'PT',
        color: prev.currentMaterial,
        // 【V_MODIFICATION】: 使用 Scene3D.jsx 期望的静态路径
        modelPath: "/models/Bases/Base.glb",
        texturePath: "", // 不再需要，由 Scene3D.jsx 处理
        position: [prev.bases.length * 2, 0, 0],
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      };

      return {
        ...prev,
        bases: [...prev.bases, base]
      };
    });
  }, [updateDesignState]); // 移除了 buildModelPath, buildTexturePath

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
        polish: 'PT',
        color: prev.currentMaterial,
        // 【V_MODIFICATION】: 使用 Scene3D.jsx 期望的静态路径
        modelPath: "/models/Bases/Base.glb",
        texturePath: "", // 不再需要，由 Scene3D.jsx 处理
        position: [prev.subBases.length * 2, 0, 0],
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      };

      return {
        ...prev,
        subBases: [...prev.subBases, subBase]
      };
    });
  }, [updateDesignState]); // 移除了 buildModelPath, buildTexturePath

  const removeSubBase = useCallback((subBaseId) => {
    updateDesignState(prev => ({
      ...prev,
      subBases: prev.subBases.filter(subBase => subBase.id !== subBaseId)
    }));
  }, [updateDesignState]);


  const updateMaterial = useCallback((color) => {
    updateDesignState(prev => {
      // 【V_MODIFICATION】:
      // 碑体、底座使用新逻辑 (isMultiTextureBase=true)
      // 它们只需要 color 属性
      const updateMultiTextureElements = (elements) =>
        elements.map(element => ({
          ...element,
          color, // 只更新 color
        }));

      // 花瓶使用旧逻辑 (isMultiTextureBase=false)
      // 它们需要更新 texturePath
      const updateVaseMaterial = (elements) =>
        elements.map(element => ({
          ...element,
          color,
          // (这个逻辑来自您的原始文件，是正确的)
          texturePath: element.texturePath.replace(/_[^_]+\.jpg$/, `_${color}.jpg`)
        }));

      return {
        ...prev,
        currentMaterial: color,
        monuments: updateMultiTextureElements(prev.monuments),
        bases: updateMultiTextureElements(prev.bases),
        subBases: updateMultiTextureElements(prev.subBases),
        vases: updateVaseMaterial(prev.vases), // 花瓶保留旧逻辑
      };
    });
  }, [updateDesignState]);


  const updatePolish = useCallback((elementId, newPolish, elementType) => {
    updateDesignState(prev => {
      const updateElement = (elements) =>
        elements.map(element => {
          if (element.id === elementId) {
            // 【V_MODIFICATION】: 
            // 这是新逻辑的核心。
            // 我们只更新 'polish' 属性。
            // 我们*不*触碰 modelPath 或 texturePath。
            // Scene3D.jsx 会检测到这个 'polish' 属性的变化并自动切换贴图。
            return {
              ...element,
              polish: newPolish,
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
  }, [updateDesignState]); // 移除了 buildModelPath, buildTexturePath


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
              weight: calculateWeight(newDims)
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
    // 【V_MODIFICATION】: 
    // 花瓶的逻辑保持不变，因为它们使用 (isMultiTextureBase=false)
    // 它们确实需要唯一的 modelPath 和 texturePath。
    const vase = {
      id: `vase-${Date.now()}`,
      type: 'vase',
      class: vaseData.class,
      name: vaseData.name,
      color: designState.currentMaterial,
      modelPath: vaseData.modelPath,
      texturePath: `./textures/Vases/${vaseData.class}/${vaseData.name.replace(/\.glb$/, '')}_${designState.currentMaterial}.jpg`,
      position: [-0.5, -0.5, -0.5],
      dimensions: { length: 0.5, width: 0.5, height: 0.5 },
      weight: 0,
      rotation: vaseData.rotation || [0, 0, 0],
      scale: vaseData.scale || [1, 1, 1],
      isSelected: false,
      isVaseModel: true
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

  // --- 修改：让 updateArtElementState 接受 options ---
  const updateArtElementState = useCallback((artId, updater, options = {}) => {
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
    }), options); // 传递 options
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
      } else if (elementType === 'vase') {
        // 花瓶翻转
        return {
          ...prev,
          vases: prev.vases.map(vase => {
            if (vase.id === elementId) {
              const currentScale = vase.scale || [1, 1, 1];
              let newScale = [...currentScale];

              if (axis === 'x') {
                newScale[0] *= -1;
              } else if (axis === 'y') {
                newScale[1] *= -1;
              } else if (axis === 'z') {
                newScale[2] *= -1;
              }

              return { ...vase, scale: newScale };
            }
            return vase;
          })
        };
      }
      return prev;
    });
  }, [updateDesignState]);

  // 计算重量
  const calculateWeight = (dimensions) => {
    const volume = (dimensions.length * dimensions.width * dimensions.height * 39.37 * 39.37 * 39.37 * 0.000589934 * 85 * 2.2);
    //const density = MATERIAL_DENSITY[material] || 2700;
    return Math.round(volume * 100) / 100;
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

  // 【已修改】：更新 addText 函数以正确还原已保存的属性
  const addText = useCallback((textData) => {

    // 1. 首先，从 textData (即
    //    我们保存的对象) 复制所有属性。
    //    这包括 content, font, size, engraveType, vcutColor,
    //    frostIntensity, polishBlend, curveAmount, thickness,
    //    alignment, kerning, lineSpacing 等。
    const newText = {
      ...textData,

      // 2. 然后，覆盖那些 *必须* 被重置的属性
      id: `text-${Date.now()}`,              // 始终生成一个全新的 ID
      monumentId: textData.monumentId,      // 这个 ID 由 DesignerPage.jsx 传入（确保是当前碑体）
      position: [0, 0, 0],              // 始终将位置重置为默认值
      rotation: [0, 0, 0],              // 始终将旋转重置为默认值
      isSelected: true,                 // 始终选中新添加的文字
      isDragging: false,

      // 3. 移除来自 localStorage 的、不应存在于 designState 中的属性
      userId: undefined,
      slotIndex: undefined,
      timestamp: undefined,
      type: 'text' // 确保 type 正确
    };

    // 4. (可选) 清理掉值为 undefined 的键
    Object.keys(newText).forEach(key => {
      if (newText[key] === undefined) {
        delete newText[key];
      }
    });

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

  // --- 修改：让 updateTextPosition 接受 options ---
  const updateTextPosition = useCallback((textId, newPosition, options = {}) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        text.id === textId ? { ...text, position: newPosition } : text
      )
    }), options); // 传递 options
  }, [updateDesignState]);

  // --- 修改：让 updateTextRotation 接受 options ---
  const updateTextRotation = useCallback((textId, newRotation, options = {}) => {
    updateDesignState(prev => ({
      ...prev,
      textElements: prev.textElements.map(text =>
        text.id === textId ? { ...text, rotation: newRotation } : text
      )
    }), options); // 传递 options
  }, [updateDesignState]);

  // ---------------- 结束合并文本函数 ----------------
  const updateVaseElementState = useCallback((vaseId, updater, options = {}) => {
    updateDesignState(prev => ({
      ...prev,
      vases: prev.vases.map(vase => {
        if (vase.id === vaseId) {
          const newPartialState = typeof updater === 'function'
            ? updater(vase)
            : updater;
          return { ...vase, ...newPartialState };
        }
        return vase;
      })
    }), options);
  }, [updateDesignState]);


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
    updateVaseElementState, // 新增：统一的花瓶状态更新函数
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