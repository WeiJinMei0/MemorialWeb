import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Layout, Button, message, Space, Select, InputNumber, App, Popover, Input, Modal } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  EnvironmentOutlined,
  SaveOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Scene3D from './Scene3D';
import Toolbar from './Toolbar';
import ModelLibrary from './ModelLibrary';
import TextEditor from './TextEditor';
import MaterialPanel from './MaterialPanel';
import { useDesignState } from '../../hooks/useDesignState';
import ArtEditorPanel from './ArtEditorPanel'
import VaseEditorPanel from './VaseEditorPanel' // 新增导入
import './DesignerPage.css';
import OrderInfoModal from './Export/OrderInfoModal.jsx';
import PrintPreviewModal from "./Export/PrintPreviewModal.jsx";
import { PrinterOutlined } from '@ant-design/icons'; // 确保引入了打印图标

const { Sider, Content, Footer } = Layout;

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', url: null },
  { value: 'spring', label: 'Spring', url: './backgrounds/Spring.jpg' },
  { value: 'summer', label: 'Summer', url: './backgrounds/Summer.jpeg' },
  { value: 'winter', label: 'Winter', url: './backgrounds/Winter.jpg' }
];

const MAX_RECENTLY_SAVED = 8;

const DesignerPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const sceneRef = useRef();
  const { user } = useAuth();
  const { modal } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [currentBackground, setCurrentBackground] = useState('transparent');
  const [recentlySaved, setRecentlySaved] = useState([]);

  // Art 状态
  const [selectedArtId, setSelectedArtId] = useState(null)
  const [transformMode, setTransformMode] = useState('translate')
  const [fillColor, setFillColor] = useState('#4285F4');
  const [isFillModeActive, setIsFillModeActive] = useState(false);

  // Art Options 拖拽保存状态
  const [savedArtOptions, setSavedArtOptions] = useState([]);
  const [draggedArt, setDraggedArt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Vase 状态 (新增)
  const [selectedVaseId, setSelectedVaseId] = useState(null);
  const [vaseTransformMode, setVaseTransformMode] = useState('translate');

  // Text 和 Unit 状态
  const [selectedUnit, setSelectedUnit] = useState('feet');
  const [currentTextId, setCurrentTextId] = useState(null);
  const [isTextEditing, setIsTextEditing] = useState(false);

  // 新增状态
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderModalType, setOrderModalType] = useState('proof'); // 'proof' or 'order'
  const [proofImage, setProofImage] = useState(null);

  // 新增 Print Modal 状态
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // useDesignState 钩子
  const {
    designState,
    loadDesign,
    loadDefaultTablet,
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
    updateVaseElementState,
    undo,
    redo,
    canUndo,
    canRedo,
    productFamilies,
    basePolishOptions,
    addTablet,
    texts,
    addText,
    updateText,
    deleteText,
    setTextSelected,
    fontOptions,
    getFontPath,
    updateTextPosition,
    updateTextRotation
  } = useDesignState();

  // --- 【修改】：点击 Order 弹出确认框，直接生成 ---
  const handleGenerateOrder = useCallback(() => {
    modal.confirm({
      title: t('modals.orderTitle'), // "Confirm Generate Order?"
      icon: <FileTextOutlined />,
      content: t('modals.orderContent'), // "This will create a new order..."
      okText: t('modals.orderOkText'),
      cancelText: t('modals.orderCancelText'),
      async onOk() {
        try {
          message.loading({ content: t('modals.orderMessageOrdering'), key: 'ordering' });

          // 1. 截图
          let thumbnail = null;
          if (sceneRef.current) {
            thumbnail = await sceneRef.current.captureThumbnail();
          }

          // 2. 构造数据 (自动生成单号，Meta 留空)
          const orderData = {
            orderNumber: `ORD-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: user?.id,
            design: designState,
            thumbnail: thumbnail,
            status: 'Pending',
            meta: {} // 初始为空，去 Order History 里编辑
          };

          // 3. 保存
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          orders.push(orderData);
          localStorage.setItem('orders', JSON.stringify(orders));

          message.success({ content: t('modals.orderMessageSuccess'), key: 'ordering' });

        } catch (error) {
          console.error(error);
          message.error({ content: t('modals.orderMessageError'), key: 'ordering' });
        }
      },
    });
  }, [designState, user, t, modal]);



  // 新增：Print Design 处理函数
  const handlePrintDesign = useCallback(async () => {
    try {
      if (sceneRef.current) {
        message.loading({ content: 'Generating Preview...', key: 'print' });
        // 获取高清截图用于打印预览
        const imageBlobUrl = await sceneRef.current.captureProof();
        setProofImage(imageBlobUrl);
        setPrintModalVisible(true);
        message.success({ content: 'Ready', key: 'print' });
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to generate print preview');
    }
  }, []);

  // 新增：Email/Download 处理函数 (对应 Email Download 2.pdf)
  const handleEmailDownload = useCallback(async () => {
    try {
      if (sceneRef.current) {
        const imageBlobUrl = await sceneRef.current.captureProof();
        setProofImage(imageBlobUrl);
      }
      setOrderModalType('proof');
      setOrderModalVisible(true);
    } catch (err) {
      console.error(err);
      message.error('无法生成截图，请重试');
    }
  }, []);

  // 【新增】: 移除素材库项目的辅助函数
  const removeItemFromArtOptions = useCallback((itemToRemove) => {
    if (!itemToRemove) return;

    setSavedArtOptions(prevOptions => {
      // 1. 从 state 中过滤掉被移除的项目
      const newOptions = prevOptions.filter(item => item.id !== itemToRemove.id);

      // 2. 更新 localStorage
      try {
        const allSavedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
        // 过滤掉其他用户的项目
        const otherUsersItems = allSavedItems.filter(item => item.userId !== user?.id);
        // 保存更新后的当前用户项目列表
        const updatedAllItems = [...otherUsersItems, ...newOptions];
        localStorage.setItem('savedItems', JSON.stringify(updatedAllItems));
      } catch (error) {
        console.error("Failed to update savedItems in localStorage after removal:", error);
        message.error("更新素材库存储失败。");
      }

      // 3. 返回新的 state
      return newOptions;
    });
  }, [user, message]); // 依赖 user 和 message


  // 加载最近保存的设计和Art Options
  useEffect(() => {
    try {
      const allDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
      const userDesigns = allDesigns
        .filter(design => design.userId === user?.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, MAX_RECENTLY_SAVED);
      setRecentlySaved(userDesigns);

      // 加载保存的Art Options
      const savedItemsData = JSON.parse(localStorage.getItem('savedItems') || '[]');
      const userItems = savedItemsData.filter(item => item.userId === user?.id);
      setSavedArtOptions(userItems); // 状态名不变，但内容已更新
    } catch (error) {
      console.error("Failed to load recently saved designs:", error);
    }
  }, [user]);

  // --- 【关键修改】 ---
  // 此 useEffect 负责在加载时设置设计状态
  useEffect(() => {
    if (location.state?.loadedDesign) {
      loadDesign(location.state.loadedDesign);
      message.success(`成功加载设计: ${location.state.loadedDesign.name}`);
      // 使用 navigate 清除 state，防止刷新时重新加载
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      // 仅当 *当前* 状态为空时加载默认值
      // (这个检查现在是安全的，因为它只会在 effect 运行时触发)
      if (designState.monuments.length === 0 && designState.bases.length === 0 && designState.subBases.length === 0 && loadDefaultTablet) {
        loadDefaultTablet();
      }
    }
    // 【修复】: 移除了 'designState' 依赖，以防止无限循环
  }, [location, loadDesign, loadDefaultTablet, navigate]);
  // --- 【关键修改结束】 ---

  // 【新功能】：添加 handleLoadDesign 函数
  const handleLoadDesign = (designToLoad) => {
    if (designToLoad) {
      loadDesign(designToLoad); // 使用 useDesignState 中的 loadDesign 函数
      message.success(`成功加载设计: ${designToLoad.name}`);
    }
  };

  const recentSlots = Array.from({ length: MAX_RECENTLY_SAVED });

  // tools 数组
  const tools = [
    { key: 'art', label: t('designer.artPanels'), icon: '🎨' },
    { key: 'vases', label: t('designer.vases'), icon: '🏺' },
    { key: 'text', label: t('designer.text'), icon: '📝' },
    { key: 'shapes', label: t('designer.shapes'), icon: '🔷' },
  ];

  // handleArtElementSelect
  const handleArtElementSelect = useCallback((artId) => {
    if (artId !== null) {
      // setIsTextEditing(false);
      // setCurrentTextId(null);
      // setSelectedVaseId(null); // 取消选中花瓶
      setActiveTool(null);
      setTransformMode('translate');
    } else {
      setIsFillModeActive(false);
    }
    setSelectedArtId(artId);
  }, [setActiveTool, setTransformMode, setIsFillModeActive]);

  const handleVaseElementSelect = useCallback((vaseId) => {
    if (vaseId !== null) {
      // setIsTextEditing(false);
      // setCurrentTextId(null);
      // handleArtElementSelect(null); // 取消选中艺术图案
      setActiveTool(null);
      setVaseTransformMode('translate');
      // 更新设计状态中的选中状态
      updateVaseElementState(vaseId, { isSelected: true });
    } else {
      // 取消选中时，将所有花瓶的选中状态设为 false
      designState.vases.forEach(vase => {
        updateVaseElementState(vase.id, { isSelected: false });
      });
    }
    setSelectedVaseId(vaseId);
  }, [handleArtElementSelect, designState.vases, updateVaseElementState]);

  // handleCloseVaseEditor (新增)
  const handleCloseVaseEditor = useCallback(() => {
    if (selectedVaseId) {
      updateVaseElementState(selectedVaseId, { isSelected: false });
    }
    setSelectedVaseId(null);
  }, [selectedVaseId, updateVaseElementState]);

  // handleToolSelect
  const handleToolSelect = (key) => {
    handleArtElementSelect(null);
    handleCloseVaseEditor();
    if (activeTool === key) {
      setIsTextEditing(false);
      setCurrentTextId(null);
      // 清除所有文字的选中状态
      designState.textElements.forEach(text => {
        setTextSelected(text.id, false);
      });
    } else {
      setIsTextEditing(true);
    }

    setActiveTool(activeTool === key ? null : key)
  }

  // handleCloseArtEditor
  const handleCloseArtEditor = useCallback(() => {
    handleArtElementSelect(null);
  }, [handleArtElementSelect]);

  // selectedArt
  const selectedArt = useMemo(() => {
    const art = designState.artElements.find(art => art.id === selectedArtId);
    if (art) {
      return { ...art, properties: art.properties || {} };
    }
    return null;
  }, [designState, selectedArtId]);

  // selectedVase (新增)
  const selectedVase = useMemo(() => {
    return designState.vases.find(vase => vase.id === selectedVaseId);
  }, [designState, selectedVaseId]);

  // handleDeleteElement
  const handleDeleteElement = useCallback((elementId, elementType) => {
    deleteElement(elementId, elementType);
    if (elementType === 'art') {
      handleArtElementSelect(null);
    } else if (elementType === 'vase') {
      handleCloseVaseEditor();
    }
  }, [deleteElement, handleArtElementSelect, handleCloseVaseEditor]);

  // Art 属性处理器
  const handleLineColorChange = useCallback((artId, newColor) => {
    updateArtElementState(artId, (prevArt) => ({
      properties: { ...(prevArt.properties || {}), lineColor: newColor }
    }));
  }, [updateArtElementState]);

  const handleLineAlphaChange = useCallback((artId, newAlpha) => {
    updateArtElementState(artId, (prevArt) => ({
      properties: { ...(prevArt.properties || {}), lineAlpha: newAlpha }
    }));
  }, [updateArtElementState]);

  // Vase 操作处理器 (新增)
  const handleVaseDuplicate = useCallback((vaseId) => {
    duplicateElement(vaseId, 'vase');
    handleCloseVaseEditor();
  }, [duplicateElement, handleCloseVaseEditor]);

  const handleVaseFlip = useCallback((vaseId, axis) => {
    flipElement(vaseId, axis, 'vase');
  }, [flipElement]);

  // handleSaveDesign (包含之前的修复)
  const handleSaveDesign = useCallback(() => {
    let designName = `${t('modals.saveDefaultName')}_${new Date().toLocaleDateString()}`;
    modal.confirm({
      title: t('modals.saveTitle'),
      icon: <SaveOutlined />,
      content: (
        <div>
          <p style={{ marginTop: '8px' }}>{t('modals.saveContentLabel')}</p>
          <Input placeholder={t('modals.savePlaceholder')} defaultValue={designName} onChange={(e) => { designName = e.target.value; }} />
        </div>
      ),
      okText: t('modals.saveOkText'),
      cancelText: t('modals.saveCancelText'),
      async onOk() {
        if (!designName || designName.trim() === '') {
          message.error(t('modals.saveErrorNameEmpty'));
          return Promise.reject(new Error('Name is empty'));
        }
        try {
          message.loading({ content: t('modals.saveMessageSaving'), key: 'saving' });

          const artCanvasData = await sceneRef.current?.getArtCanvasData?.();
          const stateToSave = JSON.parse(JSON.stringify(designState));

          if (artCanvasData) {
            stateToSave.artElements = stateToSave.artElements.map(art => {
              if (artCanvasData[art.id]) {
                return { ...art, modifiedImageData: artCanvasData[art.id] };
              }
              return art;
            });
          }

          const designData = {
            ...stateToSave,
            name: designName,
            thumbnail: await sceneRef.current?.captureThumbnail?.(),
            userId: user?.id,
            timestamp: new Date().toISOString()
          };
          const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
          savedDesigns.push(designData);
          localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));
          setRecentlySaved(prev => [designData, ...prev].slice(0, MAX_RECENTLY_SAVED));
          message.success({ content: t('modals.saveMessageSuccess'), key: 'saving' });
        } catch (error) {
          message.error({ content: t('modals.saveMessageError'), key: 'saving' });
        }
      },
    });
  }, [designState, user, modal, t]);


  // handleBackgroundChange
  const handleBackgroundChange = (value) => {
    setCurrentBackground(value)
  }

  // getCurrentBackgroundUrl
  const getCurrentBackgroundUrl = () => {
    const bgOption = BACKGROUND_OPTIONS.find(bg => bg.value === currentBackground);
    return bgOption ? bgOption.url : null;
  };

  // 模型选择处理器
  const handleProductSelect = (productData) => {
    addProduct(productData)
    setActiveTool(null)
    message.success(`Selected ${productData.class}`)
  }

  const handleVaseSelect = (vaseData) => {
    addVase(vaseData)
    setActiveTool(null)
    message.success(`Added ${vaseData.name}`)
  }

  const handleArtSelect = (artData) => {
    addArt(artData)
    setActiveTool(null)
    message.success(`Added ${artData.subclass}`)
  }

  // --- 修改：透传 options 参数 ---
  const handleTextPositionChange = useCallback((textId, newPosition, options) => {
    updateTextPosition(textId, newPosition, options);
  }, [updateTextPosition]);

  const handleTextRotationChange = useCallback((textId, newRotation, options) => {
    updateTextRotation(textId, newRotation, options);
  }, [updateTextRotation]);

  const handleTextAdd = useCallback((textProperties) => {
    const targetMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
    if (!targetMonumentId) {
      message.error('请先添加一个主碑');
      return;
    }
    const newTextId = addText({
      ...textProperties,
      monumentId: targetMonumentId,
    });
    setCurrentTextId(newTextId);
    setIsTextEditing(true);
    message.success('文本添加成功');
  }, [designState.monuments, addText]);

  const handleDeleteText = useCallback((textId) => {
    deleteText(textId);
    setCurrentTextId(null);
    setIsTextEditing(false);
    message.success('文字已删除');
  }, [deleteText]);

  const handleTextSelect = useCallback((textId) => {
    // 1. 互斥逻辑：如果选中了文字，就取消选中艺术图案
    handleArtElementSelect(null);
    handleCloseVaseEditor();

    // 2. 更新当前选中的文字 ID
    setCurrentTextId(textId);

    setActiveTool('text');
    if (textId) {
      // ---【关键修改】---
      // 如果选中了文字：
      // A. 标记为正在编辑状态
      setIsTextEditing(true);
      // B. 更新设计状态中的选中标记（用于显示3D坐标轴）
      setTextSelected(textId, true);
      // C. 【新增】自动打开左侧的 "Text" 工具栏，从而显示 TextEditor 面板
      setActiveTool('text');
    } else {
      // 如果取消选中（点击空白处）：
      setIsTextEditing(false);
      // 如果当前正打开着文字面板，则关闭它，让界面更清爽
      // (使用回调函数形式以确保获取最新的 activeTool 状态)
      setActiveTool(prevTool => prevTool === 'text' ? null : prevTool);
    }
  }, [handleArtElementSelect, handleCloseVaseEditor, setTextSelected]);

  // --- 【新增】: 关闭文字编辑器的处理函数 ---
  const handleCloseTextEditor = useCallback(() => {
    // 1. 关闭工具栏
    setActiveTool(null);
    // 2. 退出编辑模式
    setIsTextEditing(false);
    // 3. 清除当前选中的文字 ID
    setCurrentTextId(null);
    // 4. 清除 3D 场景中的选中状态 (移除坐标轴)
    designState.textElements.forEach(text => {
      setTextSelected(text.id, false);
    });
  }, [setActiveTool, setIsTextEditing, setCurrentTextId, designState.textElements, setTextSelected]);

  // // Art Options 拖拽处理函数
  // const handleArtDragStart = useCallback((e, artElement) => {
  //   // 防止与点击选择冲突，只在拖拽时设置
  //   e.dataTransfer.effectAllowed = 'copy';
  //   setDraggedArt(artElement);
  //
  //   // 设置拖拽数据
  //   e.dataTransfer.setData('application/json', JSON.stringify({
  //     type: 'art-element',
  //     data: artElement
  //   }));
  // }, []);

  // 从Art Options拖拽出来的处理函数
  // 8. 修改 handleSavedArtDragStart (当从素材库开始拖拽时)
  const handleSavedItemDragStart = useCallback((e, savedItem) => {
    e.dataTransfer.effectAllowed = 'copy';
    // 9. 设置一个通用的 'saved-item' 类型
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'saved-item',
      data: savedItem
    }));
  }, []);

  // 处理拖拽到场景的逻辑
  const handleSceneDrop = useCallback((e) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));

      if (dragData.type === 'saved-item' && dragData.data) {
        const itemData = dragData.data;

        // ... (获取 targetMonumentId 的逻辑保持不变)
        const targetMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
        if (itemData.type === 'text' && !targetMonumentId) {
          message.error('请先添加一个主碑才能添加文字');
          return;
        }

        // ... (构建 itemToAdd 的逻辑保持不变)
        const itemToAdd = {
          ...itemData,
          monumentId: itemData.type === 'text' ? targetMonumentId : null,
        };

        if (itemData.type === 'text') {
          addText(itemToAdd);
          message.success(`已添加保存的文字: "${itemData.content}"`);
        } else {
          addArt(itemToAdd);
          message.success(`已添加保存的图案: ${itemData.name || itemData.subclass}`);
        }

        // --- 【在这里添加修改】 ---
        // 复用后，从素材库中移除该项目
        removeItemFromArtOptions(itemData);
        // --- 【修改结束】 ---
      }
    } catch (error) {
      console.error('拖拽添加失败:', error);
    }
    // 3. 将 removeItemFromArtOptions 添加到依赖项数组中
  }, [addArt, addText, designState.monuments, removeItemFromArtOptions]);

  const handleArtOptionSlotDragOver = useCallback((e, slotIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(slotIndex);
  }, []);

  const handleArtOptionSlotDragLeave = useCallback((e) => {
    // 只有当鼠标真正离开元素时才清除
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  }, []);

  // 修改 handleArtOptionSlotDrop (当从场景拖拽艺术图案到素材库时)
  const handleArtOptionSlotDrop = useCallback(async (e, slotIndex) => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dragData.type === 'art-element' && dragData.data) {
        const artCanvasData = await sceneRef.current?.getArtCanvasData?.();
        const currentArt = designState.artElements.find(art => art.id === dragData.data.id);
        const artToSave = {
          ...currentArt,
          id: `saved-art-${Date.now()}`,
          type: 'art', // 11. 明确设置类型为 'art'
          modifiedImageData: artCanvasData?.[currentArt.id] || null,
          userId: user?.id,
          timestamp: new Date().toISOString(),
          slotIndex: slotIndex
        };

        setSavedArtOptions(prev => {
          const newOptions = [...prev];
          const filteredOptions = newOptions.filter(art => art.slotIndex !== slotIndex);
          filteredOptions.push(artToSave);

          // 12. 保存到新的 'savedItems' key
          const allSavedArt = JSON.parse(localStorage.getItem('savedItems') || '[]');
          const otherUsersArt = allSavedArt.filter(art => art.userId !== user?.id);
          const updatedAllArt = [...otherUsersArt, ...filteredOptions];
          localStorage.setItem('savedItems', JSON.stringify(updatedAllArt));

          return filteredOptions;
        });
        message.success('艺术图案已保存到素材库');
      }
    } catch (error) {
      console.error('拖拽保存失败:', error);
      message.error('保存失败');
    }
    setDraggedArt(null);
  }, [user, designState.artElements]);

  // 【已修改】：更新 handleSavedItemClick
  const handleSavedItemClick = useCallback((savedItem) => {

    // ... (获取 targetMonumentId 的逻辑保持不变)
    const targetMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
    if (savedItem.type === 'text' && !targetMonumentId) {
      message.error('请先添加一个主碑才能添加文字');
      return;
    }

    // ... (构建 itemToAdd 的逻辑保持不变)
    const itemToAdd = {
      ...savedItem,
      monumentId: savedItem.type === 'text' ? targetMonumentId : null,
    };

    if (savedItem.type === 'text') {
      addText(itemToAdd);
      message.success(`已添加保存的文字: "${itemToAdd.content}"`);
    } else {
      addArt(itemToAdd);
      message.success(`已添加保存的图案: ${savedItem.name || savedItem.subclass}`);
    }

    // --- 【在这里添加修改】 ---
    // 复用后，从素材库中移除该项目
    removeItemFromArtOptions(savedItem);
    // --- 【修改结束】 ---

    // 3. 将 removeItemFromArtOptions 添加到依赖项数组中
  }, [addArt, addText, designState.monuments, removeItemFromArtOptions]);

  // 修改 handleSaveArtToOptions (当在 ArtEditorPanel 中点击保存时)
  const handleSaveArtToOptions = useCallback(async (artElement) => {
    const usedSlots = savedArtOptions.map(art => art.slotIndex);
    const emptySlot = Array.from({ length: MAX_RECENTLY_SAVED }, (_, i) => i)
      .find(i => !usedSlots.includes(i));
    if (emptySlot === undefined) {
      message.warning('素材库已满');
      return;
    }
    try {
      const artCanvasData = await sceneRef.current?.getArtCanvasData?.();
      const currentArt = designState.artElements.find(art => art.id === artElement.id);
      const artToSave = {
        ...currentArt,
        id: `saved-art-${Date.now()}`,
        type: 'art', // 18. 明确设置类型为 'art'
        modifiedImageData: artCanvasData?.[currentArt.id] || null,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        slotIndex: emptySlot
      };

      setSavedArtOptions(prev => {
        const newOptions = [...prev, artToSave];

        // 19. 保存到 'savedItems' key
        const allSavedArt = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const otherUsersArt = allSavedArt.filter(art => art.userId !== user?.id);
        const updatedAllArt = [...otherUsersArt, ...newOptions];
        localStorage.setItem('savedItems', JSON.stringify(updatedAllArt));

        return newOptions;
      });
      message.success('艺术图案已保存到素材库');
    } catch (error) {
      console.error('保存艺术图案失败:', error);
      message.error('保存失败');
    }
  }, [savedArtOptions, user, designState.artElements]);

  // 20. 新增 handleSaveTextToOptions (当在 TextEditor 中点击保存时)
  const handleSaveTextToOptions = useCallback(async (textElement) => {
    const usedSlots = savedArtOptions.map(item => item.slotIndex);
    const emptySlot = Array.from({ length: MAX_RECENTLY_SAVED }, (_, i) => i)
      .find(i => !usedSlots.includes(i));

    if (emptySlot === undefined) {
      message.warning('素材库已满');
      return;
    }

    try {
      // 21. 创建要保存的 text 对象
      const textToSave = {
        ...textElement, // 复制所有属性 (content, font, size, color, engraveType...)
        id: `saved-text-${Date.now()}`,
        type: 'text', // 明确设置类型为 'text'
        userId: user?.id,
        timestamp: new Date().toISOString(),
        slotIndex: emptySlot
      };

      // 22. 更新状态和 localStorage
      setSavedArtOptions(prev => {
        const newOptions = [...prev, textToSave];

        const allSavedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const otherUsersItems = allSavedItems.filter(item => item.userId !== user?.id);
        const updatedAllItems = [...otherUsersItems, ...newOptions];
        localStorage.setItem('savedItems', JSON.stringify(updatedAllItems));

        return newOptions;
      });
      message.success('文字已保存到素材库');
    } catch (error) {
      console.error('保存文字失败:', error);
      message.error('保存失败');
    }
  }, [savedArtOptions, user]);

  // 1. 新增：处理文字旋转 90 度
  const handleRotateText90 = useCallback(() => {
    if (currentTextId) {
      const text = designState.textElements.find(t => t.id === currentTextId);
      if (text) {
        const currentRotation = text.rotation || [0, 0, 0];
        // Z轴旋转 +90度 (π/2)
        const newRotation = [
          currentRotation[0],
          currentRotation[1],
          currentRotation[2] + Math.PI / 2 + Math.PI
        ];
        updateTextRotation(currentTextId, newRotation);
      }
    }
  }, [currentTextId, designState.textElements, updateTextRotation]);

  // renderToolContent
  const renderToolContent = () => {
    switch (activeTool) {
      case 'shapes':
        return (
          <ModelLibrary
            type="shapes"
            onSelect={handleProductSelect}
            productFamilies={productFamilies}
          />
        );
      case 'vases':
        return (
          <ModelLibrary
            type="vases"
            onSelect={handleVaseSelect}
          />
        );
      case 'art':
        return (
          <ModelLibrary
            type="art"
            onSelect={handleArtSelect}
          />
        );
      case 'text':
        return (
          <TextEditor
            onAddText={handleTextAdd}
            onUpdateText={updateText}
            onDeleteText={handleDeleteText}
            currentTextId={currentTextId}
            existingTexts={texts}
            transformMode={transformMode} // 传入当前模式
            setTransformMode={setTransformMode} // 传入设置模式的函数
            onRotate90={handleRotateText90} // 传入旋转90度函数
            monuments={designState.monuments}
            isEditing={isTextEditing}
            fontOptions={fontOptions}
            onClose={() => {
              setActiveTool(null);
              setIsTextEditing(false);
              setCurrentTextId(null);
              // 清除所有文字的选中状态
              designState.textElements.forEach(text => {
                setTextSelected(text.id, false);
              });
            }}
            onSaveTextToOptions={handleSaveTextToOptions} // <-- 传递 prop
            onClose={handleCloseTextEditor}
          />
        );
      default:
        return null
    }
  }

  // UnitSelector
  const UnitSelector = (unit) => {
    switch (unit) {
      case 'feet':
        return 3.281
      case 'inches':
        return 39.370
      default:
        return 3.281;
    }
  }


  // DimensionControl
  // DimensionControl 组件 - 支持分数输入（修复版）
  const DimensionControl = ({ element, elementType, label }) => {
    const getPolishOptions = () => {
      switch (elementType) {
        case 'monument': return productFamilies[element.family]?.polishOptions || ['P5'];
        case 'base':
        case 'subBase': return basePolishOptions || ['P5'];
        default: return [];
      }
    };

    const polishOptions = getPolishOptions();
    const unitMultiplier = UnitSelector(selectedUnit);

    // 解析分数输入
    const parseFractionInput = (input) => {
      if (!input || input.trim() === '') return 0;

      const str = input.trim();

      // 匹配带分数格式 (如 "2 1/2")
      const mixedFractionRegex = /^(\d+)\s+(\d+)\/(\d+)$/;
      const mixedMatch = str.match(mixedFractionRegex);
      if (mixedMatch) {
        const integer = parseInt(mixedMatch[1]);
        const numerator = parseInt(mixedMatch[2]);
        const denominator = parseInt(mixedMatch[3]);
        if (denominator === 0) return NaN;
        return integer + (numerator / denominator);
      }

      // 匹配分数格式 (如 "3/4")
      const fractionRegex = /^(\d+)\/(\d+)$/;
      const fractionMatch = str.match(fractionRegex);
      if (fractionMatch) {
        const numerator = parseInt(fractionMatch[1]);
        const denominator = parseInt(fractionMatch[2]);
        if (denominator === 0) return NaN;
        return numerator / denominator;
      }

      // 匹配小数或整数
      const number = parseFloat(str);
      if (!isNaN(number)) {
        return number;
      }

      return NaN;
    };

    // 将数值转换为分数显示格式
    const formatValueAsFraction = (value) => {
      // 如果是整数，直接显示
      if (Number.isInteger(value)) {
        return value.toString();
      }

      // 尝试转换为分数
      const tolerance = 1.0E-6;
      let h1 = 1, h2 = 0;
      let k1 = 0, k2 = 1;
      let b = value;

      do {
        const a = Math.floor(b);
        let aux = h1;
        h1 = a * h1 + h2;
        h2 = aux;
        aux = k1;
        k1 = a * k1 + k2;
        k2 = aux;
        b = 1 / (b - a);
      } while (Math.abs(value - h1 / k1) > value * tolerance);

      // 如果分母为1，显示为整数
      if (k1 === 1) {
        return h1.toString();
      }

      // 如果分子大于分母，转换为带分数
      if (h1 > k1) {
        const whole = Math.floor(h1 / k1);
        const remainder = h1 % k1;
        if (remainder === 0) {
          return whole.toString();
        }
        return `${whole} ${remainder}/${k1}`;
      }

      return `${h1}/${k1}`;
    };

    // 处理尺寸输入变化
    const handleDimensionChange = (dim, value) => {
      const parsedValue = parseFractionInput(value);

      if (isNaN(parsedValue) || parsedValue < 0) {
        message.error('请输入有效的尺寸值（如：1/2、3/4、2 1/2）');
        return;
      }

      // 转换为米并更新
      updateDimensions(element.id, {
        ...element.dimensions,
        [dim]: parsedValue / unitMultiplier
      }, elementType);
    };

    // 获取当前显示值（转换为当前单位并格式化为分数）
    const getDisplayValue = (dim) => {
      const value = element.dimensions[dim] * unitMultiplier;
      return formatValueAsFraction(Math.round(value * 16) / 16); // 四舍五入到最接近的1/16
    };

    return (
      <div className="dimension-control">
        <label>{label}</label>
        <div className="dimension-inputs">
          {['length', 'width', 'height'].map((dim) => (
            <div key={dim} className="dimension-input">
              <Input
                size="small"
                defaultValue={getDisplayValue(dim)}
                placeholder="如: 1/2"
                onBlur={(e) => handleDimensionChange(dim, e.target.value)}
                onPressEnter={(e) => {
                  handleDimensionChange(dim, e.target.value);
                }}
                style={{ width: '80px' }}
                className="fraction-input"
              />
            </div>
          ))}
        </div>
        {element.polish && polishOptions.length > 0 && (
          <div className="polish-control">
            <Select
              value={element.polish}
              size="small"
              style={{ width: 80 }}
              onChange={(value) => updatePolish(element.id, value, elementType)}
            >
              {polishOptions.map(polish => (
                <Select.Option key={polish} value={polish}>{polish}</Select.Option>
              ))}
            </Select>
          </div>
        )}
        <div className="weight-display">{Math.round(element.weight)} lbs</div>
      </div>
    );
  };


  // --- 渲染 ---
  return (
    <Layout className="main-content-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={280} className="toolbar-sider">
        <Toolbar tools={tools} activeTool={activeTool} onToolSelect={handleToolSelect} />
        {!collapsed && (
          <div className="material-section">
            <MaterialPanel currentMaterial={designState.currentMaterial} onMaterialChange={updateMaterial} compact={true} />
          </div>
        )}
      </Sider>
      <Layout className="scene-footer-layout">
        <Content className="designer-content">
          <div className="scene-container">
            <div className="scene-controls-top">
              <Space.Compact>
                {/* 撤销/重做/背景选择 */}
                <Button icon={<UndoOutlined />} size="small" disabled={!canUndo} onClick={undo}>{t('designer.undo')}</Button>
                <Button icon={<RedoOutlined />} size="small" disabled={!canRedo} onClick={redo}>{t('designer.redo')}</Button>
                <div className="custom-select-with-left-icon">
                  <EnvironmentOutlined className="select-left-icon" />
                  <Select value={currentBackground} onChange={handleBackgroundChange} style={{ height: '44px', display: 'flex', alignItems: 'center', width: '140px' }} className="background-select-custom" size="small">
                    {BACKGROUND_OPTIONS.map(bg => (<Select.Option key={bg.value} value={bg.value}>{bg.label}</Select.Option>))}
                  </Select>
                </div>
                {/* 1. 保存设计 (Save Design) */}
                <Button type="primary" icon={<SaveOutlined />} size="small" onClick={handleSaveDesign}>{t('designer.save')}</Button>

                {/* 2. 打印设计 (Print Design - 新增) */}
                <Button type="default" icon={<PrinterOutlined />} size="small" onClick={handlePrintDesign}>Print Design</Button>

                {/* 3. 生成订单 (Generate Order - 仅保存数据) */}
                <Button type="primary" icon={<FileTextOutlined />} size="small" onClick={handleGenerateOrder}>{t('designer.generateOrder')}</Button>

                {/* 4. 邮件/下载 (Email/Download - 新增) */}
                <Button type="default" icon={<SaveOutlined />} size="small" onClick={handleEmailDownload}>Email/Download</Button>
              </Space.Compact>
            </div>
            <div className="scene-wrapper">
              <Scene3D
                ref={sceneRef}
                designState={designState}
                background={getCurrentBackgroundUrl()}
                onDimensionsChange={updateDimensions}
                onDuplicateElement={duplicateElement}
                onDeleteElement={deleteElement}
                onFlipElement={flipElement}

                // Art Props
                onArtElementSelect={handleArtElementSelect}
                selectedElementId={selectedArtId}
                transformMode={transformMode}
                onUpdateArtElementState={updateArtElementState}
                fillColor={fillColor}
                isFillModeActive={isFillModeActive}
                onModelFillClick={() => { }}

                // Text Props
                onTextSelect={handleTextSelect}
                onTextPositionChange={handleTextPositionChange}
                onTextRotationChange={handleTextRotationChange}
                onDeleteText={handleDeleteText}
                currentTextId={currentTextId}
                isTextEditing={isTextEditing}
                getFontPath={getFontPath}

                // Vase Props (新增)
                onVaseSelect={handleVaseElementSelect}
                selectedVaseId={selectedVaseId}
                vaseTransformMode={vaseTransformMode}
                onUpdateVaseElementState={updateVaseElementState}
                onTextContentChange={(textId, newContent) => {
                  updateTextContent(textId, newContent);
                }}

                // Drag and Drop Props
                onSceneDrop={handleSceneDrop}
              />

              {/* 工具面板 */}
              {activeTool && !selectedArt && !selectedVase && (
                <div className="tool-panel">
                  {renderToolContent()}
                </div>
              )}

              {/* 艺术图案编辑面板 */}
              {selectedArt && (
                <ArtEditorPanel
                  art={selectedArt}
                  onClose={handleCloseArtEditor}
                  onDelete={handleDeleteElement}
                  onFlip={flipElement}
                  setTransformMode={setTransformMode}
                  transformMode={transformMode}
                  fillColor={fillColor}
                  setFillColor={setFillColor}
                  onLineColorChange={handleLineColorChange}
                  onLineAlphaChange={handleLineAlphaChange}
                  isFillModeActive={isFillModeActive}
                  setIsFillModeActive={setIsFillModeActive}
                  onSaveToArtOptions={handleSaveArtToOptions}
                />
              )}
              {/* 花瓶编辑面板 (新增) */}
              {selectedVase && (
                <VaseEditorPanel
                  vase={selectedVase}
                  onClose={handleCloseVaseEditor}
                  onDelete={handleDeleteElement}
                  onDuplicate={handleVaseDuplicate}
                  onFlip={flipElement}
                />
              )}
            </div>
          </div>
        </Content>

        {/* 【已修改】：更新 Footer 结构 */}
        <Footer className="designer-footer">
          {/* 1. 添加新的 footer-content-wrapper 以启用 flex 布局 */}
          <div className="footer-content-wrapper">

            {/* 2. 将现有的控件包裹在 footer-controls div 中 (作为 Flex 的左侧部分) */}
            <div className="footer-controls">
              <div className="control-rows-container">
                {designState.monuments.map(monument => (
                  <DimensionControl
                    key={monument.id}
                    element={monument}
                    elementType="monument"
                    label={t('designer.tablet')}
                  />
                ))}
                {designState.bases.map(base => (
                  <DimensionControl
                    key={base.id}
                    element={base}
                    elementType="base"
                    label={t('designer.base')}
                  />
                ))}
                {designState.subBases.map(subBase => (
                  <DimensionControl
                    key={subBase.id}
                    element={subBase}
                    elementType="subBase"
                    label={t('designer.subBase')}
                  />
                ))}
              </div>
              <div className="base-buttons-container">
                <Space>
                  <Button size="small" onClick={addTablet}>
                    {t('designer.addTablet')}
                  </Button>
                  <Button size="small" onClick={addBase}>{t('designer.addBase')}</Button>
                  <Button size="small" onClick={addSubBase}>{t('designer.addSubBase')}</Button>
                  <p> {t('designer.format')}</p>
                  <select
                    value={selectedUnit || 'feet'}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    id="size-selection"
                  >
                    <option value="feet">{t('designer.Feet')}</option>
                    <option value="inches">{t('designer.Inches')}</option>
                  </select>
                </Space>
              </div>
            </div>

            {/* 3. 添加 Art Options 拖拽保存功能 (作为 Flex 的右侧部分) */}
            <div className="art-options-container">
              <h4 className="recently-saved-title">Art Options</h4>
              <div className="recent-designs-grid">
                {/* 渲染Art Options方框 */}
                {Array.from({ length: MAX_RECENTLY_SAVED }).map((_, i) => {
                  const savedItem = savedArtOptions.find(art => art.slotIndex === i);
                  const isDropTarget = dragOverSlot === i;

                  // --- 【已修改】：艺术图案的 thumbStyle 逻辑，增加了旋转 ---
                  let thumbStyle = {};
                  if (savedItem && savedItem.type !== 'text') {
                    // 1. 获取缩放 (翻转)
                    const scaleX = savedItem.scale ? Math.sign(savedItem.scale[0] || 1) : 1;
                    const scaleY = savedItem.scale ? Math.sign(savedItem.scale[1] || 1) : 1;

                    // 2. 获取旋转 (Z轴)
                    //    art.rotation 是一个 [x, y, z] 格式的弧度数组
                    const rotationInRadians = (savedItem.rotation && savedItem.rotation[2]) ? savedItem.rotation[2] : 0;
                    //    CSS transform 需要角度 (degrees)
                    const rotationInDegrees = rotationInRadians * (180 / Math.PI);

                    // 3. 组合变换
                    //    注意: 顺序很重要，先缩放(翻转)，再旋转
                    thumbStyle = {
                      transform: `scale(${scaleX}, ${scaleY}) rotate(${rotationInDegrees}deg)`,
                    };
                  }

                  // --- 【新增】：为文字卡片准备样式 ---
                  let textPreviewStyle = {};
                  if (savedItem && savedItem.type === 'text') {
                    // 1. 查找字体对象
                    const font = fontOptions.find(f => f.name === savedItem.font);
                    if (font && font.cssFamily) {
                      // 2. 应用 CSS 字体
                      textPreviewStyle.fontFamily = font.cssFamily;
                    }

                    // 3. 应用颜色
                    //    优先使用 V-Cut 颜色，如果不是 V-Cut，则使用保存的通用 'color' 属性
                    if (savedItem.engraveType === 'vcut' && savedItem.vcutColor) {
                      textPreviewStyle.color = savedItem.vcutColor;
                    } else if (savedItem.color) {
                      textPreviewStyle.color = savedItem.color;
                    } else {
                      textPreviewStyle.color = '#333'; // 默认
                    }
                  }
                  // --- 结束新增逻辑 ---

                  return (
                    <div
                      key={`item-slot-${i}`}
                      className={`art-option-slot ${isDropTarget ? 'drag-over' : ''} ${savedItem ? (savedItem.type === 'text' ? 'has-text' : 'has-art') : 'empty'}`}
                      onDragOver={(e) => handleArtOptionSlotDragOver(e, i)}
                      onDragLeave={handleArtOptionSlotDragLeave}
                      onDrop={(e) => handleArtOptionSlotDrop(e, i)}
                      title={savedItem ? (savedItem.type === 'text' ? `点击复用文字: "${savedItem.content}"` : `点击复用图案: ${savedItem.name}`) : '可将图案拖拽至此保存'}
                    >
                      {/* 27. 检查 savedItem 是否存在 */}
                      {savedItem ? (

                        // 28. 如果是文字，渲染文字卡片
                        savedItem.type === 'text' ? (
                          <div
                            className="saved-item-slot-text"
                            draggable={true}
                            onDragStart={(e) => handleSavedItemDragStart(e, savedItem)}
                            onClick={() => handleSavedItemClick(savedItem)}
                            title={`点击复用文字: "${savedItem.content}"`}
                          >
                            <span
                              className="saved-item-text-content"
                              style={textPreviewStyle} // <-- 4. 在这里应用样式
                            >
                              {savedItem.content.length > 20 ? savedItem.content.substring(0, 18) + '...' : savedItem.content}
                            </span>
                            <span className="saved-item-text-label">文字</span>
                          </div>
                        ) : (

                          // 29. 否则，渲染艺术图案卡片 (旧逻辑)
                          <Popover
                            placement="top"
                            title={null}
                            content={
                              <div className="popover-preview-content">
                                <img
                                  src={savedItem.modifiedImageData || savedItem.thumbnail || savedItem.imagePath || '/images/placeholder.png'}
                                  alt={savedItem.name || savedItem.subclass}
                                  className="popover-preview-img"
                                  style={thumbStyle}
                                />
                                <p className="popover-preview-name">{savedItem.name || savedItem.subclass}</p>
                                <p className="popover-preview-hint">拖拽到场景或点击复用</p>
                              </div>
                            }
                          >
                            <img
                              src={savedItem.modifiedImageData || savedItem.thumbnail || savedItem.imagePath || '/images/placeholder.png'}
                              alt={savedItem.name || savedItem.subclass}
                              className="saved-art-thumb"
                              draggable={true}
                              onDragStart={(e) => handleSavedItemDragStart(e, savedItem)} // 30. 更新 handler
                              onClick={() => handleSavedItemClick(savedItem)} // 30. 更新 handler
                              title="拖拽到场景或点击复用"
                              style={thumbStyle}
                            />
                          </Popover>
                        )
                      ) : (
                        // 31. 渲染空插槽
                        <div className="empty-slot-content"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. 添加 Recently Saved (新功能) (作为 Flex 的右侧部分) */}
            <div className="recently-saved-container">
              <h4 className="recently-saved-title">Recently Saved</h4>
              <div className="recent-designs-grid">
                {/* 渲染已保存的设计 */}
                {recentlySaved.map(design => (
                  <Popover
                    key={design.timestamp}
                    placement="top"
                    title={null} // 移除默认标题
                    content={
                      <div className="popover-preview-content">
                        <img
                          src={design.thumbnail || '/images/placeholder.png'}
                          alt={design.name}
                          className="popover-preview-img"
                        />
                        <p className="popover-preview-name">{design.name}</p>
                      </div>
                    }
                  >
                    <img
                      src={design.thumbnail || '/images/placeholder.png'}
                      alt={design.name}
                      className="recent-design-thumb"
                      onClick={() => handleLoadDesign(design)}
                    />
                  </Popover>
                ))}
                {/* 渲染剩余的占位符方框 */}
                {recentSlots.slice(recentlySaved.length).map((_, index) => (
                  <div key={`placeholder-${index}`} className="recent-design-placeholder" />
                ))}
              </div>
            </div>

          </div>
        </Footer>
      </Layout>
      {/* 4. 渲染 PrintPreviewModal */}
      <PrintPreviewModal
        visible={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        designState={designState}
        proofImage={proofImage}
      />
      <OrderInfoModal
        visible={orderModalVisible}
        type={orderModalType}
        onCancel={() => setOrderModalVisible(false)}
        designState={designState} // 传入当前设计数据
        proofImage={proofImage}   // 传入3D截图
      />
    </Layout>
  )
}

export default DesignerPage
