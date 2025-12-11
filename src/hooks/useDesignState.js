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
  // --- 韩文字体 (Korean Fonts) ---
  // 假设这些都是独立的 Regular 字体，如果它们有家族关系，请按照下文英文部分的方式合并
  { family: '(한)고인돌B', variant: 'regular', name: '(한)고인돌B_Regular', path: '/fonts/(한)고인돌B_Regular.json' },
  { family: '(한)볼펜체C', variant: 'regular', name: '(한)볼펜체C_Regular', path: '/fonts/(한)볼펜체C_Regular.json' },
  { family: '(한)판화체B', variant: 'regular', name: '(한)판화체B_Regular', path: '/fonts/(한)판화체B_Regular.json' },
  { family: '(환)가을잎체(굵은)', variant: 'regular', name: '(환)가을잎체(굵은)_Regular', path: '/fonts/(환)가을잎체(굵은)_Regular.json' },
  { family: '(환)궁서체', variant: 'regular', name: '(환)궁서체_Regular', path: '/fonts/(환)궁서체_Regular.json' },
  { family: '(환)예서(중간)', variant: 'regular', name: '(환)예서(중간)_Regular', path: '/fonts/(환)예서(중간)_Regular.json' },
  { family: '(환)진체(가는)', variant: 'regular', name: '(환)진체(가는)_Regular', path: '/fonts/(환)진체(가는)_Regular.json' },
  { family: 'MuseumClassic', variant: 'bold', name: 'MuseumClassic Bold_Regular', path: '/fonts/MuseumClassic Bold_Regular.json', cssFamily: 'serif' }, // 注意：原名带 Bold，这里可以视为该家族的 Bold 变体，或者如果它是唯一的，就视为 Regular
  { family: '태-물감오R', variant: 'regular', name: '태-물감오R_Regular', path: '/fonts/태-물감오R_Regular.json' },
  { family: '조선궁서체', variant: 'regular', name: '조선궁서체_Regular', path: '/fonts/조선궁서체_Regular.json' },
  { family: 'MDSol', variant: 'regular', name: 'MDSol_Regular', path: '/fonts/MDSol_Regular.json' },

  // --- 英文字体 (English/Latin Fonts) ---

  // Algerian
  { family: 'AlgerianBasDEE', variant: 'regular', name: 'AlgerianBasDEE_Regular', path: '/fonts/AlgerianBasDEE_Regular.json', cssFamily: 'serif' },

  // Arial (最完整的家族示例)
  { family: 'Arial', variant: 'regular', name: 'Arial_Regular', path: '/fonts/Arial_Regular.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { family: 'Arial', variant: 'bold', name: 'Arial_Bold', path: '/fonts/Arial_Bold.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { family: 'Arial', variant: 'italic', name: 'Arial_Italic', path: '/fonts/Arial_Italic.json', cssFamily: 'Arial, Helvetica, sans-serif' },
  { family: 'Arial', variant: 'boldItalic', name: 'Arial_Bold Italic', path: '/fonts/Arial_Bold Italic.json', cssFamily: 'Arial, Helvetica, sans-serif' },

  // Arial Unicode
  { family: 'Arial Unicode MS', variant: 'regular', name: 'Arial Unicode MS_Regular', path: '/fonts/Arial Unicode MS_Regular.json', cssFamily: 'Arial, sans-serif' },

  // Andale
  { family: 'Andale Sans UI', variant: 'regular', name: 'Andale Sans UI_Regular', path: '/fonts/Andale Sans UI_Regular.json', cssFamily: 'sans-serif' },

  // Bookman Old Style
  { family: 'Bookman Old Style', variant: 'regular', name: 'Bookman Old Style_Regular', path: '/fonts/Bookman Old Style_Regular.json', cssFamily: 'serif' },
  { family: 'Bookman Old Style', variant: 'bold', name: 'Bookman Old Style_Bold', path: '/fonts/Bookman Old Style_Bold.json', cssFamily: 'serif' },
  { family: 'Bookman Old Style', variant: 'italic', name: 'Bookman Old Style_Italic', path: '/fonts/Bookman Old Style_Italic.json', cssFamily: 'serif' },
  { family: 'Bookman Old Style', variant: 'boldItalic', name: 'Bookman Old Style_Bold Italic', path: '/fonts/Bookman Old Style_Bold Italic.json', cssFamily: 'serif' },

  // Bookman Profi
  { family: 'Bookman Profi', variant: 'regular', name: 'Bookman Profi_Regular', path: '/fonts/Bookman Profi_Regular.json', cssFamily: 'serif' },

  // Calibri
  { family: 'Calibri', variant: 'regular', name: 'Calibri_Regular', path: '/fonts/Calibri_Regular.json', cssFamily: 'Calibri, sans-serif' },
  { family: 'Calibri', variant: 'bold', name: 'Calibri_Bold', path: '/fonts/Calibri_Bold.json', cssFamily: 'Calibri, sans-serif' },
  { family: 'Calibri', variant: 'italic', name: 'Calibri_Italic', path: '/fonts/Calibri_Italic.json', cssFamily: 'Calibri, sans-serif' },
  { family: 'Calibri', variant: 'boldItalic', name: 'Calibri_Bold Italic', path: '/fonts/Calibri_Bold Italic.json', cssFamily: 'Calibri, sans-serif' },

  // Calibri Light
  { family: 'Calibri Light', variant: 'regular', name: 'Calibri Light_Regular', path: '/fonts/Calibri Light_Regular.json', cssFamily: 'Calibri, sans-serif' },
  { family: 'Calibri Light', variant: 'italic', name: 'Calibri Light_Italic', path: '/fonts/Calibri Light_Italic.json', cssFamily: 'Calibri, sans-serif' },

  // Calisto MT
  { family: 'Calisto MT', variant: 'regular', name: 'Calisto MT_Regular', path: '/fonts/Calisto MT_Regular.json', cssFamily: 'serif' },
  { family: 'Calisto MT', variant: 'bold', name: 'Calisto MT_Bold', path: '/fonts/Calisto MT_Bold.json', cssFamily: 'serif' },
  { family: 'Calisto MT', variant: 'italic', name: 'Calisto MT_Italic', path: '/fonts/Calisto MT_Italic.json', cssFamily: 'serif' },
  { family: 'Calisto MT', variant: 'boldItalic', name: 'Calisto MT_Bold Italic', path: '/fonts/Calisto MT_Bold Italic.json', cssFamily: 'serif' },

  // Cambria
  { family: 'Cambria', variant: 'regular', name: 'Cambria_Regular', path: '/fonts/Cambria_Regular.json', cssFamily: 'serif' },
  { family: 'Cambria', variant: 'bold', name: 'Cambria_Bold', path: '/fonts/Cambria_Bold.json', cssFamily: 'serif' },
  { family: 'Cambria', variant: 'italic', name: 'Cambria_Italic', path: '/fonts/Cambria_Italic.json', cssFamily: 'serif' },
  { family: 'Cambria', variant: 'boldItalic', name: 'Cambria_Bold Italic', path: '/fonts/Cambria_Bold Italic.json', cssFamily: 'serif' },

  // Cheltenham
  { family: 'CheltenhamW01-BoldCondensed', variant: 'regular', name: 'CheltenhamW01-BoldCondensed_Regular', path: '/fonts/CheltenhamW01-BoldCondensed_Regular.json', cssFamily: 'serif' },

  // CityDEEMed
  { family: 'CityDEEMed', variant: 'regular', name: 'CityDEEMed_Regular', path: '/fonts/CityDEEMed_Regular.json', cssFamily: 'sans-serif' },

  // Colonna MT
  { family: 'Colonna MT', variant: 'regular', name: 'Colonna MT_Regular', path: '/fonts/Colonna MT_Regular.json', cssFamily: 'serif' },

  // Comic Sans
  { family: 'Comic Sans MS', variant: 'regular', name: 'Comic Sans MS_Regular', path: '/fonts/Comic Sans MS_Regular.json', cssFamily: 'Comic Sans MS, cursive' },
  { family: 'TR Comic Sans MS', variant: 'regular', name: 'TR Comic Sans MS_Regular', path: '/fonts/TR Comic Sans MS_Regular.json', cssFamily: 'Comic Sans MS, cursive' }, // 这里的 TR 版本如果是一样的，可以合并，不一样可以视为另一个家族

  // Copperplate Gothic
  { family: 'Copperplate Gothic', variant: 'bold', name: 'Copperplate Gothic Bold_Regular', path: '/fonts/Copperplate Gothic Bold_Regular.json', cssFamily: 'serif' },
  { family: 'Copperplate Gothic', variant: 'light', name: 'Copperplate Gothic Light_Regular', path: '/fonts/Copperplate Gothic Light_Regular.json', cssFamily: 'serif' }, // Light 可以视为 regular 或 thin

  // DRome
  { family: 'DRome', variant: 'regular', name: 'DRome_Regular', path: '/fonts/DRome_Regular.json', cssFamily: 'serif' },

  // Dusha
  { family: 'Dusha V5', variant: 'regular', name: 'Dusha V5_Regular', path: '/fonts/Dusha V5_Regular.json', cssFamily: 'serif' },
  { family: 'Dusha V5', variant: 'regular', name: 'Russian Dusha', path: '/fonts/Dusha V5_Regular.json', cssFamily: 'serif' }, // 看起来是重复引用

  // EnglishScriptEF
  { family: 'EnglishScriptEF', variant: 'bold', name: 'EnglishScriptEF_Bold', path: '/fonts/EnglishScriptEF_Bold.json', cssFamily: 'cursive' },

  // Gauranga
  { family: 'Gauranga', variant: 'regular', name: 'Gauranga_Normal', path: '/fonts/Gauranga_Normal.json', cssFamily: 'serif' },

  // GeèzEdit
  { family: 'GeèzEdit Amharic P', variant: 'regular', name: 'GeèzEdit Amharic P_Regular', path: '/fonts/GeèzEdit Amharic P_Regular.json' },

  // Grantham
  { family: 'Grantham', variant: 'regular', name: 'Grantham_Roman', path: '/fonts/Grantham_Roman.json', cssFamily: 'serif' },

  // Helvetica / Helvetiker
  { family: 'Helvetica', variant: 'regular', name: 'Helvetiker_Regular', path: '/fonts/helvetiker_regular.typeface.json', cssFamily: 'Helvetica, Arial, sans-serif' },
  { family: 'Helvetica', variant: 'medium', name: 'Helvetica Medium_Regular', path: '/fonts/Helvetica Medium_Regular.json', cssFamily: 'Helvetica, Arial, sans-serif' }, // Medium 可视为 bold 或 regular

  // Lucida
  { family: 'Lucida Calligraphy', variant: 'italic', name: 'Lucida Calligraphy_Italic', path: '/fonts/Lucida Calligraphy_Italic.json', cssFamily: 'cursive' }, // 这种字体通常天生就是斜体
  { family: 'Lucida Handwriting', variant: 'italic', name: 'Lucida Handwriting_Italic', path: '/fonts/Lucida Handwriting_Italic.json', cssFamily: 'cursive' },

  // Lynda Cursive
  { family: 'Lynda Cursive', variant: 'regular', name: 'Lynda Cursive_Normal', path: '/fonts/Lynda Cursive_Normal.json', cssFamily: 'cursive' },
  { family: 'Lynda Cursive', variant: 'bold', name: 'Lynda Cursive_Bold', path: '/fonts/Lynda Cursive_Bold.json', cssFamily: 'cursive' },

  // Madina
  { family: 'Madina', variant: 'regular', name: 'Madina_Regular', path: '/fonts/Madina_Regular.json', cssFamily: 'cursive' },

  // Magnolia Script
  { family: 'Magnolia Script', variant: 'regular', name: 'Magnolia Script_Regular', path: '/fonts/Magnolia Script_Regular.json', cssFamily: 'cursive' },

  // MLC 系列 (保持原名作为家族名，除非它们是一组)
  { family: 'MLC Common Gothic SKS', variant: 'regular', name: 'MLC Common Gothic SKS_Regular', path: '/fonts/MLC Common Gothic SKS_Regular.json', cssFamily: 'sans-serif' },
  { family: 'MLC Condensed Roman SKS', variant: 'regular', name: 'MLC Condensed Roman SKS .75in-1.25in_Regular', path: '/fonts/MLC Condensed Roman SKS .75in-1.25in_Regular.json', cssFamily: 'serif' },
  { family: 'MLC Government SKS Extended', variant: 'regular', name: 'MLC Government SKS Extended_Regular', path: '/fonts/MLC Government SKS Extended_Regular.json', cssFamily: 'sans-serif' },
  { family: 'MLC Government SKS Regulation', variant: 'regular', name: 'MLC Government SKS Regulation_Regular', path: '/fonts/MLC Government SKS Regulation_Regular.json', cssFamily: 'sans-serif' },
  { family: 'MLC Modified Roman Raised CR', variant: 'regular', name: 'MLC Modified Roman Raised CR_Regular', path: '/fonts/MLC Modified Roman Raised CR_Regular.json', cssFamily: 'serif' },
  { family: 'MLC Raised Modified Roman SKS', variant: 'regular', name: 'MLC Raised Modified Roman SKS_Regular', path: '/fonts/MLC Raised Modified Roman SKS_Regular.json', cssFamily: 'serif' },
  { family: 'MLC Vermarco PC', variant: 'regular', name: 'MLC Vermarco PC_Regular', path: '/fonts/MLC Vermarco PC_Regular.json', cssFamily: 'sans-serif' },

  // Mythica
  { family: 'MythicaW01', variant: 'medium', name: 'MythicaW01-Medium_Regular', path: '/fonts/MythicaW01-Medium_Regular.json', cssFamily: 'serif' },

  // Nyala
  { family: 'Nyala', variant: 'regular', name: 'Nyala_Regular', path: '/fonts/Nyala_Regular.json' },

  // Old English (归类整理)
  { family: 'Old English Text MT', variant: 'regular', name: 'Old English Text MT_Regular', path: '/fonts/Old English Text MT_Regular.json', cssFamily: 'serif' },
  { family: 'Old English', variant: 'regular', name: 'Old-English_Normal', path: '/fonts/Old-English_Normal.json', cssFamily: 'serif' },
  { family: 'OldEnglishD', variant: 'regular', name: 'OldEnglishD_Regular', path: '/fonts/OldEnglishD_Regular.json', cssFamily: 'serif' },
  { family: 'OldeWorld', variant: 'bold', name: 'OldeWorld-Bold_Regular', path: '/fonts/OldeWorld-Bold_Regular.json', cssFamily: 'serif' },

  // Palatino Linotype
  // { family: 'Palatino Linotype', variant: 'regular', name: 'Palatino Linotype_Regular2', path: '/fonts/Palatino Linotype_Regular2.json', cssFamily: 'Palatino, serif' },

  // Roman
  { family: 'Roman', variant: 'regular', name: 'Roman_Regular', path: '/fonts/Roman_Regular.json', cssFamily: 'serif' },

  // Romantic
  { family: 'Romantic', variant: 'medium', name: 'Romantic_Medium', path: '/fonts/Romantic_Medium.json', cssFamily: 'serif' },

  // Script MT
  { family: 'Script MT', variant: 'bold', name: 'Script MT Bold_Regular', path: '/fonts/Script MT Bold_Regular.json', cssFamily: 'cursive' },

  // SnellRoundhand
  { family: 'SnellRoundhand Script', variant: 'regular', name: 'SnellRoundhand Script_Regular', path: '/fonts/SnellRoundhand Script_Regular.json', cssFamily: 'cursive' },

  // Spring Beauty
  { family: 'Spring Beauty', variant: 'regular', name: 'Spring Beauty_Regular', path: '/fonts/Spring Beauty_Regular.json', cssFamily: 'cursive' },

  // Square721
  { family: 'Square721 BT', variant: 'regular', name: 'Square721 BT_Roman', path: '/fonts/Square721 BT_Roman.json', cssFamily: 'sans-serif' },
  { family: 'Square721 BT', variant: 'bold', name: 'Square721 BT_Bold', path: '/fonts/Square721 BT_Bold.json', cssFamily: 'sans-serif' },

  // SWItalc
  { family: 'SWItalc', variant: 'italic', name: 'SWItalc_Regular', path: '/fonts/SWItalc_Regular.json' },

  // Times New Roman (完整家族)
  { family: 'Times New Roman', variant: 'regular', name: 'Times New Roman_Regular', path: '/fonts/Times New Roman_Regular.json', cssFamily: 'Times New Roman, serif' },
  { family: 'Times New Roman', variant: 'bold', name: 'Times New Roman_Bold', path: '/fonts/Times New Roman_Bold.json', cssFamily: 'Times New Roman, serif' },
  { family: 'Times New Roman', variant: 'italic', name: 'Times New Roman_Italic', path: '/fonts/Times New Roman_Italic.json', cssFamily: 'Times New Roman, serif' },
  { family: 'Times New Roman', variant: 'boldItalic', name: 'Times New Roman_Bold Italic', path: '/fonts/Times New Roman_Bold Italic.json', cssFamily: 'Times New Roman, serif' },

  // Times-Roman (老式命名)
  { family: 'Times-Roman', variant: 'regular', name: 'Times-Roman_Regular', path: '/fonts/Times-Roman_Regular.json', cssFamily: 'Times, serif' },

  // Zapf
  { family: 'Zapf Chancery BT', variant: 'italic', name: 'Zapf Chancery BT_Medium Italic', path: '/fonts/Zapf Chancery BT_Medium Italic.json', cssFamily: 'serif' },
  { family: 'ZapfChan Dm BT', variant: 'bold', name: 'ZapfChan Dm BT_Demi', path: '/fonts/ZapfChan Dm BT_Demi.json', cssFamily: 'serif' },
  { family: 'ZapfChancery', variant: 'italic', name: 'ZapfChancery-MediumItalic Ex_Regular', path: '/fonts/ZapfChancery-MediumItalic Ex_Regular.json', cssFamily: 'serif' },

  // --- 中文字体 (Chinese Fonts) ---
  { family: '標構體', variant: 'regular', name: '標構體', path: '/fonts/DFKai-SB_Regular.json', isChinese: true },
  { family: '方正粗楷', variant: 'regular', name: '方正粗楷简体', path: '/fonts/FZCuKaiS-R-GB_Regular.json', isChinese: true },
  { family: '方正楷体', variant: 'regular', name: '方正楷体简体', path: '/fonts/FZKai-Z03S_Regular.json', isChinese: true },
  { family: '方正隶二', variant: 'regular', name: '方正隶二繁体', path: '/fonts/FZLiShu II-S06T_Regular.json', isChinese: true },
  { family: '华文隶书', variant: 'regular', name: '华文隶书', path: '/fonts/STLiti_Regular.json', isChinese: true },
  { family: '隶书', variant: 'regular', name: '隶书', path: '/fonts/LiSu_Regular.json', isChinese: true },
  { family: '华文新魏', variant: 'regular', name: '华文新魏', path: '/fonts/STXinwei_Regular.json', isChinese: true },
  // 华文中宋家族
  { family: '华文中宋', variant: 'regular', name: '华文中宋', path: '/fonts/STZhongsong_Regular.json', isChinese: true },
  { family: '华文中宋', variant: 'bold', name: '华文中宋 粗体', path: '/fonts/STZhongsong_Bold.json', isChinese: true },

  { family: '華康特粗楷體', variant: 'regular', name: '華康特粗楷體', path: '/fonts/DFKaiXBold-B5_Regular.json', isChinese: true },
  { family: '经典繁毛楷', variant: 'regular', name: '经典繁毛楷', path: '/fonts/undefined_Regular.json', isChinese: true },
  { family: '黑体', variant: 'regular', name: '黑体', path: '/fonts/SimHei_Regular.json', isChinese: true },
  { family: '楷体', variant: 'regular', name: '楷体', path: '/fonts/KaiTi_Regular.json', isChinese: true },
  { family: '腾祥伯当行楷', variant: 'regular', name: '腾祥伯当行楷简繁', path: '/fonts/Tensentype XingKaiF_Regular.json', isChinese: true },
  { family: '文鼎特毛楷', variant: 'regular', name: '文鼎特毛楷简繁', path: '/fonts/AR MaoKaiGBJF HV_Regular.json', isChinese: true },
  { family: '微软雅黑', variant: 'regular', name: '微软雅黑', path: '/fonts/微软雅黑_Regular.json', isChinese: true },
  { family: '字酷堂石刻体', variant: 'regular', name: '字酷堂石刻体', path: '/fonts/zktskt_Regular.json', isChinese: true },
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
    const newMonumentId = `monument-${Date.now()}`; // 记录新 ID
    // 1. 创建新的碑体
    const monument = {
      id: newMonumentId,
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

      // 2. 获取旧的主碑 ID (假设通常只有一个主碑)
      const oldMonumentId = prev.monuments.length > 0 ? prev.monuments[0].id : null;
      // 3. 【V_MODIFICATION】: 替换碑体数组
      newState.monuments = [monument];

      // 如果之前有文字绑定在旧碑体上，将它们“过继”给新碑体
      if (oldMonumentId && newState.textElements.length > 0) {
        newState.textElements = newState.textElements.map(text => {
          if (text.monumentId === oldMonumentId) {
            return { ...text, monumentId: newMonumentId };
          }
          return text;
        });
      }

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
        case 'monument':
          return { ...prev, monuments: prev.monuments.filter(monument => monument.id !== elementId) };
        case 'base':
          return { ...prev, bases: prev.bases.filter(base => base.id !== elementId) };
        case 'subBase':
          return { ...prev, subBases: prev.subBases.filter(subBase => subBase.id !== elementId) };
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
    const volume = (dimensions.length * dimensions.width * dimensions.height * 39.3700787 * 39.3700787 * 39.3700787 * 0.000589934 * 85 * 2.2);
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