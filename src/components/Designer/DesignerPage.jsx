import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Layout, Button, Space, Select, Tooltip, InputNumber, App, Popover, Input, Modal, Dropdown } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  EnvironmentOutlined,
  SaveOutlined,
  FileTextOutlined,
  CloseOutlined,
  TableOutlined,
  RotateLeftOutlined,
  EyeOutlined
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
import VaseEditorPanel from './待删VaseEditorPanel.jsx' // 新增导入
import './DesignerPage.css';
import OrderInfoModal from './Export/OrderInfoModal.jsx';
import PrintPreviewModal from "./Export/PrintPreviewModal.jsx";
import { PrinterOutlined } from '@ant-design/icons'; // 确保引入了打印图标
import { AimOutlined, CopyOutlined, DownOutlined } from '@ant-design/icons'; // 复位图标
import designService from '../../services/designService';
import designCache from '../../services/designCache'; // Design cache manager

const { Sider, Content, Footer } = Layout;

const MAX_RECENTLY_SAVED = 8;



const DesignerPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const sceneRef = useRef();
  const { user } = useAuth();
  const { modal, message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [currentBackground, setCurrentBackground] = useState('transparent');

  const [isGridEnabled, setIsGridEnabled] = useState(false);

  const [recentlySaved, setRecentlySaved] = useState([]);

  // Art 状态
  const [selectedArtId, setSelectedArtId] = useState(null)
  const [transformMode, setTransformMode] = useState('translate')
  const [fillColor, setFillColor] = useState('#4285F4');
  const [isFillModeActive, setIsFillModeActive] = useState(false);
  const [isPartialFill, setIsPartialFill] = useState(false);

  // Art Options 拖拽保存状态
  const [savedArtOptions, setSavedArtOptions] = useState([]);
  const [draggedArt, setDraggedArt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Vase 状态 (新增)
  const [selectedVaseId, setSelectedVaseId] = useState(null);
  const [vaseTransformMode, setVaseTransformMode] = useState('translate');

  // Text 和 Unit 状态
  const [selectedUnit, setSelectedUnit] = useState('inches');
  const [currentTextId, setCurrentTextId] = useState(null);
  const [isTextEditing, setIsTextEditing] = useState(false);

  // 新增状态
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderModalType, setOrderModalType] = useState('proof'); // 'proof' or 'order'
  const [proofImage, setProofImage] = useState(null);

  // 新增 Print Modal 状态
  const [printModalVisible, setPrintModalVisible] = useState(false);

  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]); // 存储选中元素数组
  // 获取当前是否有元素被选中（用于某些判断）
  const hasSelectedElements = selectedElements.length > 0;

  //  添加 useRef 和 useEffect
  const ctrlKeyPressedRef = useRef(false);

  // 新增：旋转控制状态
  const [isViewRotatable, setIsViewRotatable] = useState(false);

  // Current design info (for loaded designs)
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [currentDesignName, setCurrentDesignName] = useState(null);

  const BACKGROUND_OPTIONS = useMemo(() => [
    { value: 'transparent', label: t('backgrounds.transparent'), url: null },
    { value: 'spring', label: t('backgrounds.spring'), url: './backgrounds/Spring.jpg' },
    { value: 'summer', label: t('backgrounds.summer'), url: './backgrounds/Summer.jpeg' },
    { value: 'winter', label: t('backgrounds.winter'), url: './backgrounds/Winter.jpg' }
  ], [t])

  // useDesignState 钩子
  const {
    designState,
    loadDesign,
    loadDefaultTablet,
    updateDimensions,
    updatePolish,
    updateMaterial,
    updateModelPosition,
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
    updateTextRotation,
    selectElement,
    clearAllSelection,
    resetSelectedTabletPosition,
  } = useDesignState();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 处理 Ctrl 键
      if (e.key === 'Control') {
        ctrlKeyPressedRef.current = true;
      }
      // 处理 Mac 的 Command 键
      if (e.key === 'Meta') {
        ctrlKeyPressedRef.current = true;
      }
      // 可选：处理 Alt 键等其他修饰键
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        ctrlKeyPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getSelectedElement = (designState) => {
    const sources = [
      ['text', designState.texts],
      ['art', designState.artElements],
      ['vase', designState.vases],
      ['monument', designState.monuments],
      ['base', designState.bases],
      ['subBase', designState.subBases],
    ];

    for (const [type, list] of sources) {
      if (!Array.isArray(list)) continue;
      const item = list.find(el => el.isSelected);
      if (item) return { item, type };
    }
    return null;
  };

  // 添加处理函数
  const handleResetPosition = useCallback(() => {
    // console.log('=== 开始复位操作 ===');
    // console.log('当前选中的所有元素:', selectedElements);
    // console.log('designState.monuments:', designState.monuments);

    // 从 selectedElements 中提取选中的元素
    const selectedTablets = selectedElements.filter(el => el.type === 'monument');
    const selectedBases = selectedElements.filter(el => el.type === 'base');
    const selectedSubBases = selectedElements.filter(el => el.type === 'subBase');

    // console.log('选中的墓碑:', selectedTablets);
    // console.log('选中的底座:', selectedBases);
    // console.log('选中的副底座:', selectedSubBases);

    // 检查墓碑的 isSelected 状态
    if (selectedTablets.length > 0) {
      const tabletId = selectedTablets[0].id;
      const tabletInState = designState.monuments.find(m => m.id === tabletId);
      // console.log('墓碑在 designState 中的状态:', tabletInState);
      // console.log('墓碑的 isSelected:', tabletInState?.isSelected);
      // console.log('墓碑的 family:', tabletInState?.family);
    }

    // 验证选中条件
    if (selectedTablets.length !== 1) {
      // console.warn('请选中一个墓碑进行操作', { selectedTablets });
      message.warning('请选中一个墓碑进行操作');
      return;
    }

    if ((selectedBases.length !== 1 && selectedSubBases.length !== 1) ||
      (selectedBases.length > 0 && selectedSubBases.length > 0)) {
      // console.warn('请同时选中一个底座或一个副底座', { selectedBases, selectedSubBases });
      message.warning('请同时选中一个底座或一个副底座（不能同时选中两者）');
      return;
    }

    // 检查选中的墓碑是否为Tablet类型
    const selectedTabletId = selectedTablets[0].id;
    const selectedTablet = designState.monuments.find(m => m.id === selectedTabletId);

    // console.log('选中的墓碑详情:', selectedTablet);

    if (!selectedTablet) {
      // console.error('墓碑不存在:', selectedTabletId);
      message.error('墓碑不存在');
      return;
    }

    if (selectedTablet.family !== 'Tablet') {
      // console.warn('选中的墓碑不是Tablet类型:', selectedTablet.family);
      message.warning('选中的墓碑必须是Tablet类型');
      return;
    }

    // console.log('✅ 所有条件满足，开始复位...');

    // 执行复位操作
    try {
      resetSelectedTabletPosition();
      // message.success('墓碑已复位到底座位置');
    } catch (error) {
      // console.error('复位失败:', error);
      // message.error('复位失败，请重试');
    }
  }, [selectedElements, designState.monuments, resetSelectedTabletPosition, message]);


  const dimensionElements = useMemo(() => {
    const list = [];

    designState.monuments.forEach(el =>
      list.push({ element: el, type: 'monument' })
    );

    designState.bases.forEach(el =>
      list.push({ element: el, type: 'base' })
    );

    designState.subBases.forEach(el =>
      list.push({ element: el, type: 'subBase' })
    );

    return list;
  }, [
    designState.monuments,
    designState.bases,
    designState.subBases,
  ]);

  // 排序 dimensionElements，把选中的尺寸类产品放在最前面
  const sortedDimensionElements = useMemo(() => {
    // 没有选中任何产品 → 原顺序
    if (!selectedModelId || !selectedModelType) {
      return dimensionElements;
    }

    const selectedIndex = dimensionElements.findIndex(
      item =>
        item.element.id === selectedModelId &&
        item.type === selectedModelType
    );

    // 选中的不是尺寸类产品（比如 Art / Text）
    if (selectedIndex === -1) {
      return dimensionElements;
    }

    // 把选中的提到最前
    const selectedItem = dimensionElements[selectedIndex];
    const rest = dimensionElements.filter((_, i) => i !== selectedIndex);

    return [selectedItem, ...rest];
  }, [dimensionElements, selectedModelId, selectedModelType]);


  const handleToggleRotatable = useCallback(() => {
    setIsViewRotatable(!isViewRotatable);
  }, [isViewRotatable]);

  // 新增：重置到正面视图
  const handleResetView = useCallback(() => {
    if (sceneRef.current && sceneRef.current.resetCameraToFront) {
      sceneRef.current.resetCameraToFront();
      message.success('已重置到正面视图');
    }
  }, []);

  // --- 【修改】：点击 Order 弹出确认框，直接生成 ---
  const handleGenerateOrder = useCallback(async () => {
    try {
      // =========== Step 1: 保存设计 ===========
      let designNameForSave = currentDesignName;
      let saveSuccessful = false;

      if (currentDesignId && currentDesignName) {
        // 情况1：已加载的设计 → 直接更新，不弹窗
        message.loading({ content: 'Saving design...', key: 'autoSave', duration: 0 });
        
        try {
          const { stateToSave, thumbnail } = await prepareDesignData();

          // 更新现有设计
          await designService.update(currentDesignId, {
            name: currentDesignName,
            type: 'memorial',
            data: stateToSave,
            previewUrl: thumbnail
          });

          // 更新缓存
          if (designCache.cache.detailMap[currentDesignId]) {
            designCache.cache.detailMap[currentDesignId] = {
              ...designCache.cache.detailMap[currentDesignId],
              ...stateToSave,
              thumbnail
            };
          }
          const listIndex = designCache.cache.designs.findIndex(d => d.id === currentDesignId);
          if (listIndex >= 0) {
            designCache.cache.designs[listIndex].thumbnail = thumbnail;
            designCache.cache.designs[listIndex].timestamp = new Date().toISOString();
          }
          designCache.persistCache();

          message.success({ content: 'Design saved!', key: 'autoSave', duration: 1 });
          saveSuccessful = true;
        } catch (error) {
          console.error('Failed to save design:', error);
          message.error({ content: 'Failed to save design', key: 'autoSave' });
          return; // 如果保存失败，中止生成订单
        }
      } else {
        // 情况2：新设计 → 弹窗输入名称后保存
        await new Promise((resolve, reject) => {
          let inputName = `Design_${new Date().toLocaleDateString()}`;
          
          modal.confirm({
            title: 'Save Design First',
            icon: <SaveOutlined />,
            content: (
              <div>
                <p style={{ marginBottom: '16px', color: '#666' }}>
                  Please save your design before generating an order.
                </p>
                <p style={{ marginTop: '8px', marginBottom: '8px', fontSize: '12px', color: '#999' }}>
                  Design name:
                </p>
                <Input 
                  placeholder="Enter design name" 
                  defaultValue={inputName}
                  onChange={(e) => { inputName = e.target.value; }}
                  style={{ marginBottom: '16px' }}
                />
              </div>
            ),
            okText: 'Save & Generate Order',
            cancelText: 'Cancel',
            centered: true,
            async onOk() {
              if (!inputName || inputName.trim() === '') {
                message.error('Design name cannot be empty');
                reject(new Error('Name is empty'));
                return;
              }

              message.loading({ content: 'Saving design...', key: 'autoSave', duration: 0 });
              
              try {
                const { stateToSave, thumbnail } = await prepareDesignData();

                // 创建新设计
                const { localId } = await designCache.saveDesign({
                  ...stateToSave,
                  name: inputName,
                  type: 'memorial',
                  thumbnail: thumbnail
                });

                // 更新当前设计信息
                setCurrentDesignId(localId);
                setCurrentDesignName(inputName);
                designNameForSave = inputName;

                // 更新最近保存的设计列表
                const cachedDesigns = designCache.getDesigns();
                setRecentlySaved(cachedDesigns.slice(0, MAX_RECENTLY_SAVED).map(item => ({
                  id: item.id,
                  name: item.name,
                  thumbnail: item.thumbnail,
                  timestamp: item.timestamp,
                  isSynced: item.isSynced
                })));

                message.success({ content: 'Design saved!', key: 'autoSave', duration: 1 });
                saveSuccessful = true;
                resolve(); // 保存成功，继续
              } catch (error) {
                console.error('Failed to save design:', error);
                message.error({ content: 'Failed to save design', key: 'autoSave' });
                reject(error); // 保存失败，中止
              }
            },
            onCancel() {
              reject(new Error('User cancelled')); // 用户取消，中止生成订单
            }
          });
        }).catch((error) => {
          console.log('Design save cancelled or failed:', error.message);
          return; // 保存失败或用户取消，中止
        });
      }

      // =========== Step 2: 设计保存成功后，显示订单信息填写表单 ===========
      // 此时设计已保存，现在显示 OrderInfoModal 让用户填写订单信息
      if (saveSuccessful || (currentDesignId && currentDesignName)) {
        setOrderModalType('order');
        setOrderModalVisible(true);
      }

    } catch (error) {
      console.error('Order generation error:', error);
      message.error({ content: t('modals.orderMessageError'), key: 'ordering', duration: 3 });
    }
  }, [currentDesignId, currentDesignName, designState, user, t, modal, sceneRef]);

  // 处理订单表单提交
  const handleOrderSubmit = useCallback(async (formData) => {
    try {
      message.loading({ content: 'Creating order...', key: 'ordering', duration: 0 });

      // 构造订单数据（不保存 design 和 thumbnail，只保存引用和元数据）
      const orderData = {
        orderNumber: `ORD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        designId: currentDesignId,
        designName: currentDesignName,
        status: 'Pending',
        meta: formData // 将填写的订单表单数据保存到 meta
      };

      // 保存订单到 localStorage，并清理过期数据
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      
      // 保存前检查存储空间，如果接近限制则删除最旧的 10 个订单
      try {
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));
      } catch (quotaError) {
        if (quotaError.name === 'QuotaExceededError') {
          // 空间不足，删除最旧的订单
          console.warn('Storage quota exceeded, cleaning up old orders...');
          
          // 按时间戳排序，删除最旧的 10 个订单
          const sortedOrders = orders.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const cleanedOrders = sortedOrders.slice(10); // 保留最新的，删除最旧的 10 个
          
          cleanedOrders.push(orderData);
          localStorage.setItem('orders', JSON.stringify(cleanedOrders));
          
          message.warning('Old orders have been cleaned up to make space', 2);
        } else {
          throw quotaError;
        }
      }

      message.success({ content: 'Order created successfully!', key: 'ordering', duration: 2 });

      // 关闭 modal
      setOrderModalVisible(false);
    } catch (error) {
      console.error('Order submission error:', error);
      message.error({ content: 'Failed to create order', key: 'ordering', duration: 3 });
    }
  }, [currentDesignId, currentDesignName, user, sceneRef]);
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

  const confirmDeleteSavedItem = useCallback((item) => {
    if (!item) return;

    const label = item.type === 'text'
      ? (item.content ? `"${item.content}"` : t('designer.library.deleteThisText'))
      : (item.name || item.subclass || t('designer.library.deleteThisPattern'));

    modal.confirm({
      title: t('designer.library.deleteConfirmTitle'),
      content: t('designer.library.deleteConfirmContent', { label }),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => removeItemFromArtOptions(item),
    });
  }, [modal, removeItemFromArtOptions, t]);


  // Load recent designs and Art Options using cache
  useEffect(() => {
    const loadRecentDesigns = async () => {
      try {
        if (user?.id) {
          // Initialize cache and sync from server on first load
          await designCache.init();
          const designs = await designCache.syncFromServer();
          
          // Get recent designs from cache
          const recentDesigns = designs.slice(0, MAX_RECENTLY_SAVED).map(item => ({
            id: item.id,
            name: item.name,
            thumbnail: item.thumbnail,
            timestamp: item.timestamp,
            isSynced: item.isSynced
          }));
          setRecentlySaved(recentDesigns);
        }

        // Load saved Art Options (still using localStorage)
        const savedItemsData = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const userItems = savedItemsData.filter(item => item.userId === user?.id);
        setSavedArtOptions(userItems);
      } catch (error) {
        console.error("Failed to load recently saved designs:", error);
        // Fallback to cache if server fails
        const cachedDesigns = designCache.getDesigns();
        if (cachedDesigns.length > 0) {
          setRecentlySaved(cachedDesigns.slice(0, MAX_RECENTLY_SAVED));
        }
      }
    };

    loadRecentDesigns();
  }, [user]);

  // --- 【关键修改】 ---
  // 此 useEffect 负责在加载时设置设计状态
  useEffect(() => {
    if (location.state?.loadedDesign) {
      const designToLoad = location.state.loadedDesign;
      
      // Validate design data before loading
      if (designToLoad && (designToLoad.monuments || designToLoad.bases || designToLoad.artElements)) {
        loadDesign(designToLoad);
        // Set current design info
        setCurrentDesignId(designToLoad.id || null);
        setCurrentDesignName(designToLoad.name || null);
        // Note: Success message already shown by SavedDesignsPage
      } else {
        console.error('Invalid loadedDesign data:', designToLoad);
        message.error('Failed to load design: Invalid data format');
      }
      
      // 使用 navigate 清除 state，防止刷新时重新加载
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      // 仅当 *当前* 状态为空时加载默认值
      // (这个检查现在是安全的，因为它只会在 effect 运行时触发)
      if (designState.monuments.length === 0 && designState.bases.length === 0 && designState.subBases.length === 0 && loadDefaultTablet) {
        loadDefaultTablet();
        // Clear design info for new design
        setCurrentDesignId(null);
        setCurrentDesignName(null);
      }
    }
    // 【修复】: 移除了 'designState' 依赖，以防止无限循环
  }, [location, loadDesign, loadDefaultTablet, navigate]);
  // --- 【关键修改结束】 ---

  // handleLoadDesign - Load design from cache first, fallback to server
  const handleLoadDesign = async (designToLoad) => {
    if (!designToLoad || !designToLoad.id) {
      message.error('Invalid design data');
      return;
    }

    try {
      message.loading({ content: 'Loading design...', key: 'loading' });
      
      // Try to load from cache first
      const fullDesignData = await designCache.getDetail(designToLoad.id);
      
      // Validate design data has required fields
      if (fullDesignData && (fullDesignData.monuments || fullDesignData.bases || fullDesignData.artElements)) {
        loadDesign(fullDesignData); // Use loadDesign from useDesignState
        // Set current design info
        setCurrentDesignId(fullDesignData.id || designToLoad.id);
        setCurrentDesignName(fullDesignData.name || designToLoad.name);
        message.success({ content: `Design loaded: ${fullDesignData.name}`, key: 'loading' });
      } else {
        console.error('Invalid design data:', fullDesignData);
        message.error({ content: 'Invalid design data format', key: 'loading' });
      }
    } catch (error) {
      console.error('Failed to load design:', error);
      message.error({ content: 'Failed to load design, please try again', key: 'loading' });
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
      setSelectedElements([]);
      // 取消文本选中
      handleTextSelect(null);
      // setIsTextEditing(false);
      // setCurrentTextId(null);
      // setSelectedVaseId(null); // 取消选中花瓶
      setSelectedModelId(null);
      setSelectedModelType(null);
      if (clearAllSelection) clearAllSelection();
      setActiveTool(null);
      setTransformMode('translate');

      // 【关键修复】：选中新图案时，恢复保存的填充状态
      const art = designState.artElements.find(a => a.id === artId);
      if (art && art.properties) {
        setIsFillModeActive(art.properties.isFillModeActive ?? false);
        setIsPartialFill(art.properties.isPartialFill ?? false);
        setFillColor(art.properties.fillColor || '#4285F4');
      } else {
        // 如果没有保存的状态，则重置为默认
        setIsFillModeActive(false);
        setIsPartialFill(false);
        setFillColor('#4285F4');
      }

    } else {
      setIsFillModeActive(false);
    }
    setSelectedArtId(artId);
  }, [setActiveTool, setTransformMode, setIsFillModeActive, clearAllSelection, designState.artElements]);

  const handleVaseElementSelect = useCallback((vaseId) => {
    if (vaseId !== null) {
      setSelectedElements([]);
      // 取消文本选中
      handleTextSelect(null);
      // setIsTextEditing(false);
      // setCurrentTextId(null);
      // handleArtElementSelect(null); // 取消选中艺术图案
      setSelectedModelId(null);
      setSelectedModelType(null);
      if (clearAllSelection) clearAllSelection();
      setActiveTool(null);
      setVaseTransformMode('translate');
      // 使用 selectElement 来同步选中状态和 currentMaterial
      if (selectElement) {
        selectElement(vaseId, 'vase');
      }
    } else {
      // 取消选中时，将所有花瓶的选中状态设为 false
      designState.vases.forEach(vase => {
        updateVaseElementState(vase.id, { isSelected: false });
      });
    }
    setSelectedVaseId(vaseId);
  }, [designState.vases, updateVaseElementState, clearAllSelection, selectElement]);


  // handleCloseVaseEditor (新增)
  const handleCloseVaseEditor = useCallback(() => {
    if (selectedVaseId) {
      updateVaseElementState(selectedVaseId, { isSelected: false });
    }
    setSelectedVaseId(null);
  }, [selectedVaseId, updateVaseElementState]);

  const handleSelectElement = useCallback((elementId, elementType, event) => {
    // 如果点击 null 或 undefined，清除所有选中
    if (!elementId || !elementType) {
      setSelectedElements([]);
      if (selectElement) {
        // 清除设计状态中的所有选中
        designState.monuments.forEach(m => selectElement(m.id, 'monument', false));
        designState.bases.forEach(b => selectElement(b.id, 'base', false));
        designState.subBases.forEach(sb => selectElement(sb.id, 'subBase', false));
      }
      // 取消文本选中
      handleTextSelect(null);
      return;
    }

    // 获取是否按住了 Ctrl 键
    const isCtrlPressed = ctrlKeyPressedRef.current;

    // console.log('=== handleSelectElement 被调用 ===');
    // console.log('elementId:', elementId);
    // console.log('elementType:', elementType);
    // console.log('isCtrlPressed:', isCtrlPressed);
    // console.log('event对象:', event);
    // console.log('event.ctrlKey:', event?.ctrlKey);
    // console.log('event.metaKey:', event?.metaKey);
    // console.log('当前 selectedElements（调用前）:', selectedElements);
    // console.log('当前 selectedElements 长度:', selectedElements.length);

    const elementKey = `${elementType}:${elementId}`;

    if (selectElement) {
      // 调用 useDesignState 中的 selectElement，传入 Ctrl 键状态
      selectElement(elementId, elementType, isCtrlPressed);
    }

    // 更新本地选中状态
    setSelectedElements(prev => {
      // console.log('=== setSelectedElements 内部 ===');
      // console.log('prev（之前的选中列表）:', prev);
      // console.log('prev 长度:', prev.length);

      const alreadySelected = prev.some(item =>
        item.id === elementId && item.type === elementType
      );
      // console.log('alreadySelected（元素是否已存在）:', alreadySelected);
      if (isCtrlPressed) {
        if (!alreadySelected) {
          const result = [...prev, { id: elementId, type: elementType }];
          // console.log('👉 多选：添加元素');
          // console.log('Ctrl模式 - 最终结果:', result);
          // console.log('Ctrl模式 - 最终结果长度:', result.length);
          return result;
        }
        // console.log('👉 多选：元素已存在，保持');
        // console.log('Ctrl模式 - 最终结果:', prev);
        // console.log('Ctrl模式 - 最终结果长度:', prev.length);
        return prev;

      } else {
        // console.log('普通点击模式 - 单选:', [{ id: elementId, type: elementType }]);
        return [{ id: elementId, type: elementType }];
      }
    });

    // 清除其他类型元素的选中状态（保持类型互斥，可选）
    if (elementType !== 'art') handleArtElementSelect(null);
    if (elementType !== 'vase') handleCloseVaseEditor();
    if (elementType !== 'text') {
      setCurrentTextId(null);
      setIsTextEditing(false);
      designState.textElements.forEach(text => {
        setTextSelected(text.id, false);
      });
    }

    // 同时更新旧的单一选中状态（用于兼容性）
    setSelectedModelId(elementId);
    setSelectedModelType(elementType);
  }, [selectElement, handleArtElementSelect, handleCloseVaseEditor, designState.textElements, setTextSelected]);

  // handleToolSelect
  // 1. 修改 handleToolSelect 逻辑
  const handleToolSelect = (key) => {
    handleArtElementSelect(null);
    handleCloseVaseEditor();
    handleTextSelect(null); // 清除文本选中状态

    // 如果点击的是 Text 工具
    if (key === 'text') {
      // 如果当前没有选中的文字，且没有打开过文本工具
      if (activeTool !== 'text') {
        // 自动添加一个默认文字
        const targetMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
        if (targetMonumentId) {
          const newTextId = addText({
            content: 'Enter Text', // 默认文案
            // font: '/fonts/Cambria_Regular.json',
            size: 3,
            monumentId: targetMonumentId,
            alignment: 'center',
            lineSpacing: 1.2,
            kerning: 0,
            curveAmount: 0,
            engraveType: 'vcut',
            vcutColor: '#FFFFFF',
            frostIntensity: 0.8,
            polishBlend: 0.5,
            textDirection: 'horizontal'
          });
          // 立即选中该文字
          setCurrentTextId(newTextId);
          setIsTextEditing(true);
          setTextSelected(newTextId, true);
          message.success('Text added. Click "Edit" to type.');
        } else {
          message.warning('Please add a tablet first.');
          return; // 没碑不打开工具栏
        }
      }
    }

    if (activeTool === key) {
      // 如果再次点击同一个图标 -> 关闭工具栏
      setIsTextEditing(false);
      setCurrentTextId(null);
      designState.textElements.forEach(text => setTextSelected(text.id, false));
      setActiveTool(null);
    } else {
      // 切换到新工具
      setActiveTool(key);
      if (key === 'text') {
        setIsTextEditing(true);
      } else {
        setIsTextEditing(false);
        setCurrentTextId(null);
      }
    }
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

  // 【新增】填充状态同步保存
  const handleSetFillColor = useCallback((color, artIdOverride = null) => {
    setFillColor(color);
    const targetArtId = artIdOverride ?? selectedArtId;
    if (targetArtId !== null && targetArtId !== undefined) {
      updateArtElementState(targetArtId, (prev) => ({
        properties: { ...(prev.properties || {}), fillColor: color }
      }));
    }
  }, [selectedArtId, updateArtElementState]);

  const handleSetIsFillModeActive = useCallback((isActive, artIdOverride = null) => {
    setIsFillModeActive(isActive);
    const targetArtId = artIdOverride ?? selectedArtId;
    if (targetArtId !== null && targetArtId !== undefined) {
      updateArtElementState(targetArtId, (prev) => ({
        properties: { ...(prev.properties || {}), isFillModeActive: isActive }
      }));
    }
  }, [selectedArtId, updateArtElementState]);

  const handleSetIsPartialFill = useCallback((isPartial, artIdOverride = null) => {
    setIsPartialFill(isPartial);
    const targetArtId = artIdOverride ?? selectedArtId;
    if (targetArtId !== null && targetArtId !== undefined) {
      updateArtElementState(targetArtId, (prev) => ({
        properties: { ...(prev.properties || {}), isPartialFill: isPartial }
      }));
    }
  }, [selectedArtId, updateArtElementState]);

  // Vase 操作处理器 (新增)
  const handleVaseDuplicate = useCallback((vaseId) => {
    duplicateElement(vaseId, 'vase');
    handleCloseVaseEditor();
  }, [duplicateElement, handleCloseVaseEditor]);

  const handleVaseFlip = useCallback((vaseId, axis) => {
    flipElement(vaseId, axis, 'vase');
  }, [flipElement]);

  // Helper function to prepare design data for saving
  const prepareDesignData = useCallback(async () => {
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

    const thumbnail = await sceneRef.current?.captureThumbnail?.();
    return { stateToSave, thumbnail };
  }, [designState]);

  // handleSaveDesign - Update existing design or create new one
  const handleSaveDesign = useCallback(async () => {
    // If we have a current design, update it directly without asking for name
    if (currentDesignId && currentDesignName) {
      // Show saving message
      message.loading({ content: 'Saving...', key: 'saveDesign', duration: 0 });

      try {
        const { stateToSave, thumbnail } = await prepareDesignData();

        // Update existing design
        await designService.update(currentDesignId, {
          name: currentDesignName,
          type: 'memorial',
          data: stateToSave,
          previewUrl: thumbnail
        });

        // Update cache
        if (designCache.cache.detailMap[currentDesignId]) {
          designCache.cache.detailMap[currentDesignId] = {
            ...designCache.cache.detailMap[currentDesignId],
            ...stateToSave,
            thumbnail
          };
        }
        const listIndex = designCache.cache.designs.findIndex(d => d.id === currentDesignId);
        if (listIndex >= 0) {
          designCache.cache.designs[listIndex].thumbnail = thumbnail;
          designCache.cache.designs[listIndex].timestamp = new Date().toISOString();
        }
        designCache.persistCache();

        // Update recent designs list
        const cachedDesigns = designCache.getDesigns();
        setRecentlySaved(cachedDesigns.slice(0, MAX_RECENTLY_SAVED).map(item => ({
          id: item.id,
          name: item.name,
          thumbnail: item.thumbnail,
          timestamp: item.timestamp,
          isSynced: item.isSynced
        })));

        // Show success message
        message.success({ content: 'Saved successfully!', key: 'saveDesign', duration: 2 });
      } catch (error) {
        console.error('Failed to save design:', error);
        message.error({ content: 'Failed to save. Please try again.', key: 'saveDesign', duration: 3 });
      }
    } else {
      // No current design, create new one with name prompt
      handleSaveAsNew();
    }
  }, [currentDesignId, currentDesignName, prepareDesignData]);

  // handleSaveAsNew - Always create a new design (Save As / Save Copy)
  const handleSaveAsNew = useCallback(() => {
    let designName = currentDesignName 
      ? `${currentDesignName} (Copy)` 
      : `Design_${new Date().toLocaleDateString()}`;
    
    modal.confirm({
      title: currentDesignId ? 'Save as Copy' : 'Save Design',
      icon: <SaveOutlined />,
      content: (
        <div>
          <p style={{ marginTop: '8px' }}>Enter design name:</p>
          <Input placeholder="Design name" defaultValue={designName} onChange={(e) => { designName = e.target.value; }} />
        </div>
      ),
      okText: 'Save',
      cancelText: 'Cancel',
      centered: true,
      async onOk() {
        if (!designName || designName.trim() === '') {
          message.error('Name cannot be empty');
          return Promise.reject(new Error('Name is empty'));
        }
        
        // Show saving message
        message.loading({ content: 'Saving...', key: 'saveDesign', duration: 0 });

        try {
          const { stateToSave, thumbnail } = await prepareDesignData();

          // Remove id to force create new design (not update)
          const newDesignData = { ...stateToSave };
          delete newDesignData.id;

          // Create new design
          const { localId } = await designCache.saveDesign({
            ...newDesignData,
            name: designName,
            type: 'memorial',
            thumbnail: thumbnail
          });

          // Update current design info
          setCurrentDesignId(localId);
          setCurrentDesignName(designName);

          // Update recent designs list
          const cachedDesigns = designCache.getDesigns();
          setRecentlySaved(cachedDesigns.slice(0, MAX_RECENTLY_SAVED).map(item => ({
            id: item.id,
            name: item.name,
            thumbnail: item.thumbnail,
            timestamp: item.timestamp,
            isSynced: item.isSynced
          })));

          // Show success message
          message.success({ content: 'Saved successfully!', key: 'saveDesign', duration: 2 });
        } catch (error) {
          console.error('Failed to save design:', error);
          message.error({ content: 'Failed to save. Please try again.', key: 'saveDesign', duration: 3 });
        }
      },
    });
  }, [currentDesignId, currentDesignName, prepareDesignData, modal]);


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
  // 2. 新增 onTextContentChange 处理函数，传递给 Scene3D -> EnhancedTextElement
  const updateTextContent = useCallback((textId, newContent) => {
    updateText(textId, { content: newContent });
  }, [updateText]);

  const handleTextPositionChange = useCallback((textId, newPosition, options) => {
    updateTextPosition(textId, newPosition, options);
  }, [updateTextPosition]);

  const handleTextRotationChange = useCallback((textId, newRotation, options) => {
    updateTextRotation(textId, newRotation, options);
  }, [updateTextRotation]);

  const handleTextAdd = useCallback((textProperties) => {
    const defaultMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
    // 2. 决定最终使用的 monumentId：优先使用传入的属性，没有则使用默认
    const finalMonumentId = textProperties.monumentId || defaultMonumentId;
    if (!finalMonumentId) {
      message.error('请先添加一个主碑');
      return;
    }

    const newTextId = addText({
      ...textProperties,
      // 3. 使用计算出的最终 ID
      monumentId: finalMonumentId,
    });

    setCurrentTextId(newTextId);
    setIsTextEditing(true);
    setActiveTool('text');

    if (selectElement) {
      selectElement(newTextId, 'text');
    }
    // 关闭其他可能打开的面板
    handleArtElementSelect(null);
    handleCloseVaseEditor();
    setSelectedModelId(null);
    setSelectedModelType(null);
  }, [designState.monuments, addText, selectElement, handleArtElementSelect, handleCloseVaseEditor]);

  const handleDeleteText = useCallback((textId) => {
    deleteText(textId);
    setCurrentTextId(null);
    setIsTextEditing(false);

  }, [deleteText]);

  const handleTextSelect = useCallback((textId) => {
    // 1. 互斥逻辑：如果选中了文字，就取消选中其他元素
    setSelectedModelId(null);
    setSelectedModelType(null);
    handleArtElementSelect(null);
    handleCloseVaseEditor();
    // 清除所有其他选中状态
    if (clearAllSelection) clearAllSelection();

    // 2. 更新当前选中的文字 ID
    setCurrentTextId(textId);
    if (textId) {
      setIsTextEditing(true);
      setTextSelected(textId, true);
      setActiveTool('text');
      setSelectedElements([]);
    } else {
      // 如果没有文本被选中，关闭文本工具
      setIsTextEditing(false);
      setActiveTool(null);
      // 清除所有文本的选中状态
      designState.textElements.forEach(text => {
        setTextSelected(text.id, false);
      });
      // 同时清除本地选中状态
      setCurrentTextId(null);
    }
  }, [handleArtElementSelect, handleCloseVaseEditor, clearAllSelection, designState.textElements, setTextSelected]);

  // --- 【新增】: 关闭文字编辑器的处理函数 ---
  const handleCloseTextEditor = useCallback(() => {
     // 清除文本选中状态
    handleTextSelect(null);
  }, [handleTextSelect]);

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
          message.error(t('designer.library.needMonumentForText'));
          return;
        }

        // ... (构建 itemToAdd 的逻辑保持不变)
        const itemToAdd = {
          ...itemData,
          monumentId: itemData.type === 'text' ? targetMonumentId : null,
        };

        if (itemData.type === 'text') {
          addText(itemToAdd);
          message.success(t('designer.library.addedText', { content: itemData.content }));
        } else {
          addArt(itemToAdd);
          message.success(t('designer.library.addedArt', { name: itemData.name || itemData.subclass }));
        }

      }
    } catch (error) {
      console.error('拖拽添加失败:', error);
    }
  }, [addArt, addText, designState.monuments, message, t]);

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
        message.success(t('designer.library.saveArtSuccess'));
      }
    } catch (error) {
      console.error('拖拽保存失败:', error);
      message.error(t('designer.library.saveFailed'));
    }
    setDraggedArt(null);
  }, [designState.artElements, t, user]);

  // 【已修改】：更新 handleSavedItemClick
  const handleSavedItemClick = useCallback((savedItem) => {

    // ... (获取 targetMonumentId 的逻辑保持不变)
    const targetMonumentId = designState.monuments.length > 0 ? designState.monuments[0].id : null;
    if (savedItem.type === 'text' && !targetMonumentId) {
      message.error(t('designer.library.needMonumentForText'));
      return;
    }

    // ... (构建 itemToAdd 的逻辑保持不变)
    const itemToAdd = {
      ...savedItem,
      monumentId: savedItem.type === 'text' ? targetMonumentId : null,
    };

    if (savedItem.type === 'text') {
      addText(itemToAdd);
      message.success(t('designer.library.addedText', { content: itemToAdd.content }));
    } else {
      addArt(itemToAdd);
      message.success(t('designer.library.addedArt', { name: savedItem.name || savedItem.subclass }));
    }

  }, [addArt, addText, designState.monuments, message, t]);

  // 修改 handleSaveArtToOptions (当在 ArtEditorPanel 中点击保存时)
  const handleSaveArtToOptions = useCallback(async (artElement) => {
    const usedSlots = savedArtOptions.map(art => art.slotIndex);
    const emptySlot = Array.from({ length: MAX_RECENTLY_SAVED }, (_, i) => i)
      .find(i => !usedSlots.includes(i));
    if (emptySlot === undefined) {
      message.warning(t('designer.library.full'));
      return;
    }
    try {
      // 安全获取 canvas 数据
      let artCanvasData = null;
      if (sceneRef.current && typeof sceneRef.current.getArtCanvasData === 'function') {
        artCanvasData = await sceneRef.current.getArtCanvasData();
      }

      // 优先从 state 获取最新状态，如果找不到则使用传入的 artElement
      const currentArt = designState.artElements.find(art => art.id === artElement.id) || artElement;

      // 确定图片数据: 优先使用新截图，其次是已有截图，最后是null
      const imageData = artCanvasData?.[currentArt.id] || currentArt.modifiedImageData || null;

      const artToSave = {
        ...currentArt,
        id: `saved-art-${Date.now()}`,
        type: 'art', // 明确设置类型为 'art'
        modifiedImageData: imageData,
        // 关键修复：确保 imagePath 被保存，以便在 modifiedImageData 为空时回退
        imagePath: currentArt.imagePath || artElement.imagePath,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        slotIndex: emptySlot
      };

      setSavedArtOptions(prev => {
        const newOptions = [...prev, artToSave];

        // 保存到 'savedItems' key
        const allSavedArt = JSON.parse(localStorage.getItem('savedItems') || '[]');
        const otherUsersArt = allSavedArt.filter(art => art.userId !== user?.id);
        const updatedAllArt = [...otherUsersArt, ...newOptions];
        localStorage.setItem('savedItems', JSON.stringify(updatedAllArt));

        return newOptions;
      });
      message.success(t('designer.library.saveArtSuccess'));
    } catch (error) {
      console.error('保存艺术图案失败:', error);
      message.error(t('designer.library.saveFailed'));
    }
  }, [designState.artElements, savedArtOptions, t, user]);

  // 20. 新增 handleSaveTextToOptions (当在 TextEditor 中点击保存时)
  const handleSaveTextToOptions = useCallback(async (textElement) => {
    const usedSlots = savedArtOptions.map(item => item.slotIndex);
    const emptySlot = Array.from({ length: MAX_RECENTLY_SAVED }, (_, i) => i)
      .find(i => !usedSlots.includes(i));

    if (emptySlot === undefined) {
      message.warning(t('designer.library.full'));
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
      message.success(t('designer.library.saveTextSuccess'));
    } catch (error) {
      console.error('保存文字失败:', error);
      message.error(t('designer.library.saveFailed'));
    }
  }, [savedArtOptions, t, user]);

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
            // 修复：移除冗余的内联 onClose，直接使用 handleCloseTextEditor
            onClose={handleCloseTextEditor}
            onSaveTextToOptions={handleSaveTextToOptions} // <-- 传递 prop
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
  // 1. 辅助函数：将米转换为【无符号】的英尺-英寸格式 (例如: 2-4 1/2)
  const formatFeetInches = (meters) => {
    if (typeof meters !== 'number' || isNaN(meters)) return '';

    // 1米 = 39.3700787 英寸
    const totalInches = meters * 39.3700787;

    let feet = Math.floor(totalInches / 12);
    let remInches = totalInches - feet * 12;

    // 精度控制：四舍五入到 1/16 英寸
    const precision = 16;
    let roundedInches = Math.round(remInches * precision) / precision;

    // 处理进位：如果英寸四舍五入后变成 12，则英尺 +1，英寸归 0
    if (roundedInches >= 12) {
      feet += 1;
      roundedInches = 0;
    }

    // 分离英寸的整数部分和小数部分
    let inchesWhole = Math.floor(roundedInches);
    let fractionPart = roundedInches - inchesWhole;

    // 构造分数部分字符串
    let fracStr = '';
    if (fractionPart > 0) {
      const numerator = Math.round(fractionPart * precision);
      const denominator = precision;

      // 计算最大公约数 (GCD) 以简化分数 (例如 8/16 -> 1/2)
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const common = gcd(numerator, denominator);

      fracStr = ` ${numerator / common}/${denominator / common}`;
    }

    // 【核心修改】：隐藏符号，使用 "-" 连接。如果没有英寸，强制显示 "-0"
    // 格式要求：2'-0" -> 2-0, 2'-4" -> 2-4
    return `${feet}-${inchesWhole}${fracStr}`;
  };

  // 2. 辅助函数：解析 "F-I" 或 "F-I N/D" 格式的输入
  const parseFeetInchesInput = (input) => {
    if (!input || typeof input !== 'string') return NaN;
    const str = input.trim();

    // 尝试按 "-" 分割 (标准的 2-4 格式)
    const dashParts = str.split('-');

    let feet = 0;
    let inchesStr = '';

    if (dashParts.length === 2) {
      // 格式如 "2-4" 或 "2-4 1/2"
      feet = parseFloat(dashParts[0]);
      inchesStr = dashParts[1];
    } else if (dashParts.length === 1) {
      // 格式如 "2" (被视为2英尺) 或 "2 4" (容错处理)
      const spaceParts = str.split(/\s+/);
      if (spaceParts.length >= 2 && !str.includes('/')) {
        // 可能是 "2 4" 这种没打连字符的情况
        feet = parseFloat(spaceParts[0]);
        inchesStr = str.substring(spaceParts[0].length).trim();
      } else {
        // 纯数字，视为英尺
        feet = parseFloat(str);
        inchesStr = '0';
      }
    } else {
      // 多个连字符? 尝试解析第一个
      feet = parseFloat(dashParts[0]);
      inchesStr = dashParts.slice(1).join(' '); // 剩下的都算英寸
    }

    if (isNaN(feet)) feet = 0;

    // 解析英寸部分 (支持 "4", "4 1/2", "1/2")
    let inches = 0;
    // 简单的分数解析器
    const parseFraction = (s) => {
      if (!s) return 0;
      const parts = s.trim().split(/\s+/);
      let val = 0;
      parts.forEach(p => {
        if (p.includes('/')) {
          const [n, d] = p.split('/').map(Number);
          if (d !== 0) val += n / d;
        } else {
          val += parseFloat(p) || 0;
        }
      });
      return val;
    }

    inches = parseFraction(inchesStr);

    // 转换为总英尺数 (1英尺 = 12英寸)
    return feet + (inches / 12);
  };

  // 3. 【核心修改】：输入限制，禁止文字
  const handleDimensionKeyDown = (e) => {
    // 允许的控制键
    const allowedControlKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Enter'
    ];
    if (allowedControlKeys.includes(e.key)) return;

    // 允许：数字 0-9, 连字符 -, 斜杠 /, 空格
    const pattern = /^[0-9\/\-\s]$/;

    // 另外允许小数点 . (以防万一用户想输小数)
    const extendedPattern = /^[0-9\/\-\s\.]$/;

    if (!extendedPattern.test(e.key)) {
      e.preventDefault();
    }
  };


  // 修改 DimensionControl 中的 isSelected 判断
  const DimensionControl = ({ element, elementType, label, isSelected }) => {
    const getPolishOptions = () => {
      switch (elementType) {
        case 'monument': return productFamilies[element.family]?.polishOptions || ['P5'];
        case 'base':
        case 'subBase': return basePolishOptions || ['PT'];
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
    // dim：改的是哪一个维度如 'length' | 'width' | 'height'
    // value：用户在输入框里输的 字符串
    const handleDimensionChange = (dim, value) => {
      // --- 【修改】：英尺模式使用新的解析逻辑 ---
      if (selectedUnit === 'feet') {
        const parsedFeet = parseFeetInchesInput(value);
        if (isNaN(parsedFeet) || parsedFeet < 0) {
          message.error('格式错误。示例: 2-0, 2-4, 2-4 1/2');
          return;
        }
        // parsedFeet 是英尺(小数)，转换为米并更新
        // 1 英尺 = 0.3048 米 (或 1/3.281)
        // 这里使用你的 UnitSelector 逻辑： meters * 3.281 = feet => meters = feet / 3.281
        updateDimensions(element.id, {
          ...element.dimensions,
          [dim]: parsedFeet / 3.281
        }, elementType);
        return;
      }
      // 英寸模式 (保持原有逻辑)
      const parsedValue = parseFractionInput(value);
      if (isNaN(parsedValue) || parsedValue < 0) {
        message.error('请输入有效的尺寸值');
        return;
      }
      updateDimensions(element.id, {
        ...element.dimensions,
        [dim]: parsedValue / unitMultiplier
      }, elementType);
    };


    // 获取当前显示值（转换为当前单位并格式化为分数）
    const getDisplayValue = (dim) => {
      const meters = element.dimensions[dim];

      // --- 【修改】：英尺模式使用新的无符号格式 ---
      if (selectedUnit === 'feet') {
        return formatFeetInches(meters);
      }
      // ----------------------------------------

      // 英寸模式 (保持原有逻辑)
      const value = meters * unitMultiplier;
      return formatValueAsFraction(Math.round(value * 16) / 16);
    };

    const handleDelete = () => {
      if (deleteElement) {
        deleteElement(element.id, elementType);
      }
    };


    return (
      <div className={`dimension-control ${isSelected ? 'dimension-control--selected' : ''}`}>
        {/* <div className="dimension-control"> */}
        <label>{label}</label>
        <div className="dimension-inputs">
          {['length', 'width', 'height'].map((dim) => (
            <div key={dim} className="dimension-input">
              <Input
                size="small"
                key={`${dim}-${selectedUnit}-${element.dimensions[dim]}`}
                defaultValue={getDisplayValue(dim)}
                placeholder={selectedUnit === 'feet' ? "如: 2-4" : "如: 24"}
                onBlur={(e) => handleDimensionChange(dim, e.target.value)}
                onKeyDown={handleDimensionKeyDown}
                onPressEnter={(e) => {
                  handleDimensionChange(dim, e.target.value);
                  e.currentTarget.blur(); // 按回车后失去焦点
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
        <Tooltip title={t('designer.delete')}>
          <Button
            type="text"
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={handleDelete}
            style={{ padding: '0 4px', width: '24px', height: '24px' }}
          />
        </Tooltip>
      </div>
    );
  };

  // 【新增】获取当前主碑的颜色，用于 ArtEditorPanel
  const getMainMonumentColor = () => {
    if (designState.monuments.length > 0) {
      return designState.monuments[0].color || 'Black';
    }
    return 'Black';
  };

  // 添加全局键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+A: 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();

        // 收集所有可选中元素
        const allElements = [
          ...designState.monuments.map(m => ({ id: m.id, type: 'monument' })),
          ...designState.bases.map(b => ({ id: b.id, type: 'base' })),
          ...designState.subBases.map(sb => ({ id: sb.id, type: 'subBase' })),
        ];

        setSelectedElements(allElements);

        // 同时更新每个元素的 isSelected 状态
        allElements.forEach(({ id, type }) => {
          if (selectElement) {
            selectElement(id, type, true); // 使用多选模式
          }
        });

        // message.success(`已选中 ${allElements.length} 个元素`);
      }

      // Esc: 取消所有选中
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedElements.length > 0) {
          setSelectedElements([]);
          message.info('已清除所有选中');

          // 同时清除设计状态中的选中状态
          if (selectElement) {
            // 清除所有元素的选中状态
            designState.monuments.forEach(m => selectElement(m.id, 'monument', false));
            designState.bases.forEach(b => selectElement(b.id, 'base', false));
            designState.subBases.forEach(sb => selectElement(sb.id, 'subBase', false));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [designState, selectElement]);


  // 修改键盘删除逻辑支持多选
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tagName = e.target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 多选删除：删除所有选中的元素
        if (selectedElements.length > 0) {
          // 逐个删除选中的元素
          selectedElements.forEach(({ id, type }) => {
            deleteElement(id, type);
          });

          // 清除选中状态
          setSelectedElements([]);

          // 根据删除的元素类型清除相应的选中状态
          if (selectedElements.some(el => el.type === 'art')) {
            handleArtElementSelect(null);
          }
          if (selectedElements.some(el => el.type === 'vase')) {
            handleCloseVaseEditor();
          }
          if (selectedElements.some(el => el.type === 'text')) {
            setCurrentTextId(null);
            setIsTextEditing(false);
          }
        } else {
          // 保持原有的单选删除逻辑
          const selected = getSelectedElement(designState);
          if (!selected) return;
          deleteElement(selected.item.id, selected.type);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [designState, deleteElement, selectedElements, handleArtElementSelect, handleCloseVaseEditor]);


  // --- 渲染 ---
  return (
    <Layout className="main-content-layout">
      {/* ✅ 新增：左上角简化版选中提示 */}
      {/* {selectedElements.length > 0 && (
        <div className="top-left-selection-hint">
          <div className="selection-hint-content">
            <span className="selection-count">
              已选中 {selectedElements.length} 个元素
            </span>
            <Button 
              type="link" 
              size="small"
              onClick={() => setSelectedElements([])}
              className="clear-selection-btn"
            >
              清除选中
            </Button>
          </div>
        </div>
      )} */}
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={190} className="toolbar-sider">
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

                {/* ✅ 新增复位按钮 */}
                <Button
                  type="default"
                  icon={<AimOutlined />}
                  size="small"
                  onClick={handleResetPosition}
                  disabled={!(
                    selectedElements.some(el => el.type === 'monument') &&
                    (selectedElements.some(el => el.type === 'base') || selectedElements.some(el => el.type === 'subBase'))
                  )}
                >
                  {t('designer.reset')}
                </Button>

                {/* 新增：视图旋转控制按钮 */}
                <Button
                  type={isViewRotatable ? 'primary' : 'default'}
                  icon={<RotateLeftOutlined />}
                  size="small"
                  onClick={handleToggleRotatable}
                >
                </Button>

                {/* 新增：重置到正面视图按钮 */}
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={handleResetView}
                >
                </Button>

                {/* --- 新增：网格开关按钮 --- */}
                <Button
                  type={isGridEnabled ? 'primary' : 'default'} icon={<TableOutlined />} size="small" onClick={() => setIsGridEnabled(!isGridEnabled)}>{t('designer.Grid')}</Button>
                {/* ----------------------- */}

                <div className="custom-select-with-left-icon">
                  <EnvironmentOutlined className="select-left-icon" />
                  <Select value={currentBackground} onChange={handleBackgroundChange} style={{ height: '44px', display: 'flex', alignItems: 'center', width: '140px' }} className="background-select-custom" size="small">
                    {BACKGROUND_OPTIONS.map(bg => (<Select.Option key={bg.value} value={bg.value}>{bg.label}</Select.Option>))}
                  </Select>
                </div>
                {/* 1. 保存设计 (Save Design) with dropdown for Save as Copy */}
                <Button type="primary" icon={<SaveOutlined />} size="small" onClick={handleSaveDesign}>{t('designer.save')}</Button>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'saveAsCopy',
                        label: 'Save as Copy',
                        icon: <CopyOutlined />,
                        onClick: handleSaveAsNew
                      }
                    ]
                  }}
                  placement="bottomRight"
                >
                  <Button type="primary" size="small" icon={<DownOutlined />} style={{ padding: '0 8px' }} />
                </Dropdown>

                {/* 2. 打印设计 (Print Design - 新增) */}
                <Button type="default" icon={<PrinterOutlined />} size="small" onClick={handlePrintDesign}>{t('designer.printDesign')}</Button>

                {/* 3. 生成订单 (Generate Order - 仅保存数据) */}
                <Button type="primary" icon={<FileTextOutlined />} size="small" onClick={handleGenerateOrder}>{t('designer.generateOrder')}</Button>

                {/* 4. 邮件/下载 (Email/Download - 新增) */}
                <Button type="default" icon={<SaveOutlined />} size="small" onClick={handleEmailDownload}>{t('designer.emailDownload')}</Button>

                {/* Display current design name */}
                {currentDesignName && (
                  <Button type="text" size="small" style={{ marginLeft: '8px', cursor: 'default' }}>
                    Design: {currentDesignName}
                  </Button>
                )}
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
                isPartialFill={isPartialFill}
                onSaveToArtOptions={handleSaveArtToOptions}

                // 【新增】传入主碑颜色
                monumentColor={getMainMonumentColor()}

                // Text Props
                onAddTextElement={handleTextAdd}
                onTextSelect={handleTextSelect}
                onTextPositionChange={handleTextPositionChange}
                onTextRotationChange={handleTextRotationChange}
                onDeleteText={handleDeleteText}
                currentTextId={currentTextId}
                isTextEditing={isTextEditing}
                getFontPath={getFontPath}
                onTextContentChange={updateTextContent} // 传入更新内容的回调

                // Vase Props (新增)
                onVaseSelect={handleVaseElementSelect}
                selectedVaseId={selectedVaseId}
                vaseTransformMode={vaseTransformMode}
                onUpdateVaseElementState={updateVaseElementState}

                // 添加新的多选状态
                selectedElements={selectedElements}
                // 保持旧的单一选中状态（用于向后兼容）
                selectedModelId={selectedModelId}
                selectedModelType={selectedModelType}
                onSelectElement={handleSelectElement}
                onModelPositionChange={updateModelPosition}
                // Drag and Drop Props
                onSceneDrop={handleSceneDrop}
                isGridEnabled={isGridEnabled}

                // 新增：传递旋转控制状态
                isViewRotatable={isViewRotatable}
                onResetView={handleResetView}
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
                  key={selectedArt.id}
                  art={selectedArt}
                  onClose={handleCloseArtEditor}
                  onDelete={handleDeleteElement}
                  onFlip={flipElement}
                  setTransformMode={setTransformMode}
                  transformMode={transformMode}
                  fillColor={fillColor}
                  setFillColor={handleSetFillColor}
                  onLineColorChange={handleLineColorChange}
                  onLineAlphaChange={handleLineAlphaChange}
                  isFillModeActive={isFillModeActive}
                  setIsFillModeActive={handleSetIsFillModeActive}
                  onSaveToArtOptions={handleSaveArtToOptions}
                  isPartialFill={isPartialFill}
                  setIsPartialFill={handleSetIsPartialFill}
                />
              )}
              {/* 花瓶编辑面板*/}
              {/* {selectedVase && (
                <VaseEditorPanel
                  vase={selectedVase}
                  onClose={handleCloseVaseEditor}
                  onDelete={handleDeleteElement}
                  onDuplicate={handleVaseDuplicate}
                  onFlip={flipElement}
                />
              )} */}
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
                {sortedDimensionElements.map(({ element, type }) => (
                  <DimensionControl
                    key={element.id}
                    element={element}
                    elementType={type}
                    label={
                      type === 'monument'
                        ? t('designer.tablet')
                        : type === 'base'
                          ? t('designer.base')
                          : t('designer.subBase')
                    }
                    isSelected={selectedElements.some(el =>
                      el.id === element.id && el.type === type
                    )}
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
                  <div style={{ marginTop: '11px' }}>
                    <p>{t('designer.format')}</p>
                  </div>
                  <select
                    value={selectedUnit || 'inches'}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    id="size-selection"
                  >
                    <option value="inches">{t('designer.Inches')}</option>
                    <option value="feet">{t('designer.Feet')}</option>
                  </select>
                </Space>
              </div>
            </div>

            {/* 3. 添加 Art Options 拖拽保存功能 (作为 Flex 的右侧部分) */}
            <div className="art-options-container">
              <h4 className="recently-saved-title">{t('designer.artOptions')}</h4>
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
                      title={savedItem
                        ? (savedItem.type === 'text'
                          ? `${t('designer.library.slotReuseTextTitle', { content: savedItem.content })} ${t('designer.library.hintRightClickDelete')}`
                          : `${t('designer.library.slotReuseArtTitle', { name: savedItem.name || savedItem.subclass })} ${t('designer.library.hintRightClickDelete')}`)
                        : t('designer.library.slotEmptyTitle')}
                    >
                      {/* 27. 检查 savedItem 是否存在 */}
                      {savedItem ? (

                        // 28. 如果是文字，渲染文字卡片
                        savedItem.type === 'text' ? (
                          <Dropdown
                            trigger={['contextMenu']}
                            menu={{
                              items: [{ key: 'delete', label: t('common.delete') }],
                              onClick: ({ key }) => {
                                if (key === 'delete') confirmDeleteSavedItem(savedItem);
                              },
                            }}
                          >
                            <div
                              className="saved-item-slot-text"
                              draggable={true}
                              onDragStart={(e) => handleSavedItemDragStart(e, savedItem)}
                              onClick={() => handleSavedItemClick(savedItem)}
                              onContextMenu={(e) => e.preventDefault()}
                              title={`${t('designer.library.slotReuseTextTitle', { content: savedItem.content })} ${t('designer.library.hintRightClickDelete')}`}
                            >
                              <span
                                className="saved-item-text-content"
                                style={textPreviewStyle} // <-- 4. 在这里应用样式
                              >
                                {savedItem.content.length > 20 ? savedItem.content.substring(0, 18) + '...' : savedItem.content}
                              </span>
                              <span className="saved-item-text-label">{t('designer.library.textLabel')}</span>
                            </div>
                          </Dropdown>
                        ) : (

                          // 29. 否则，渲染艺术图案卡片 (旧逻辑)
                          <Dropdown
                            trigger={['contextMenu']}
                            menu={{
                              items: [{ key: 'delete', label: t('common.delete') }],
                              onClick: ({ key }) => {
                                if (key === 'delete') confirmDeleteSavedItem(savedItem);
                              },
                            }}
                          >
                            <span style={{ display: 'block', width: '100%', height: '100%' }} onContextMenu={(e) => e.preventDefault()}>
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
                                    <p className="popover-preview-hint">{t('designer.library.popoverHintWithDelete')}</p>
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
                                  title={t('designer.library.popoverHintWithDelete')}
                                  style={thumbStyle}
                                />
                              </Popover>
                            </span>
                          </Dropdown>
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
              <h4 className="recently-saved-title">{t('designer.recentlySaved')}</h4>
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
        onSubmit={handleOrderSubmit}
        designState={designState} // 传入当前设计数据
        proofImage={proofImage}   // 传入3D截图
      />
    </Layout>
  )
}

export default DesignerPage