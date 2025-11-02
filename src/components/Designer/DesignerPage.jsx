import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
// --- 合并点：从同事代码中添加 Modal ---
import { Layout, Button, message, Space, Select, InputNumber, App, Popover, Input, Dropdown, Modal } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  EnvironmentOutlined,
  SaveOutlined,
  FileTextOutlined,
  // --- 合并点：从同事代码中添加 HomeOutlined, HistoryOutlined, LogoutOutlined, UserOutlined ---
  HomeOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined
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
import './DesignerPage.css';

// --- 合并点：从同事代码中添加 Header, Sider, Footer ---
const { Header, Sider, Content, Footer } = Layout;


const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', url: null },
  { value: 'spring', label: 'Spring', url: './backgrounds/Spring.jpg' },
  { value: 'summer', label: 'Summer', url: './backgrounds/Summer.jpeg' },
  { value: 'winter', label: 'Winter', url: './backgrounds/Winter.jpg' }
];

// --- 合并点：从同事代码中添加 LANGUAGE_OPTIONS ---
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

const MAX_RECENTLY_SAVED = 8; // (来自您的代码)

const DesignerPage = () => {
  const { t,i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const sceneRef = useRef();
  // --- 合并点：从同事代码中添加 user, logout ---
  const { user, logout } = useAuth();
  const { modal } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [currentBackground, setCurrentBackground] = useState('transparent');
  const [recentlySaved, setRecentlySaved] = useState([]);

  // 您的 Art 状态
  const [selectedArtId, setSelectedArtId] = useState(null)
  const [transformMode, setTransformMode] = useState('translate')
  const [fillColor, setFillColor] = useState('#4285F4');
  const [isFillModeActive, setIsFillModeActive] = useState(false);

  // --- 合并点：添加同事的 Text 和 Unit 状态 ---
  const [selectedUnit, setSelectedUnit] = useState('feet'); // 默认 'feet'
  const [currentTextId, setCurrentTextId] = useState(null);
  const [isTextEditing, setIsTextEditing] = useState(false);

  // --- 合并点：合并 useDesignState 的解构 ---
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
    undo,
    redo,
    canUndo,
    canRedo,
    productFamilies,
    basePolishOptions,
    // (来自同事)
    addTablet,
    texts,
    addText,
    updateText,
    deleteText,
    setTextSelected, // <-- 添加 setTextSelected
    fontOptions,
    getFontPath,
    updateTextPosition,
    updateTextRotation
  } = useDesignState();


  // 您的 useEffect (保持不变)
  useEffect(() => {
    try {
      const allDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
      const userDesigns = allDesigns
        .filter(design => design.userId === user?.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, MAX_RECENTLY_SAVED);
      setRecentlySaved(userDesigns);
    } catch (error) {
      console.error("Failed to load recently saved designs:", error);
    }
  }, [user]);

  // 您的 useEffect (保持不变)
  useEffect(() => {
    if (location.state?.loadedDesign) {
      loadDesign(location.state.loadedDesign);
      message.success(`成功加载设计: ${location.state.loadedDesign.name}`);
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      // 检查 loadDefaultTablet 是否存在
      if (designState.monuments.length === 0 && designState.bases.length === 0 && designState.subBases.length === 0 && loadDefaultTablet) {
        loadDefaultTablet();
      }
    }
  }, [location, loadDesign, loadDefaultTablet, navigate]);

  const recentSlots = Array.from({ length: MAX_RECENTLY_SAVED });

  // 您的 tools 数组 (保持不变)
  const tools = [
    { key: 'art', label: t('designer.artPanels'), icon: '🎨' },
    { key: 'vases', label: t('designer.vases'), icon: '🏺' },
    { key: 'text', label: t('designer.text'), icon: '📝' },
    { key: 'shapes', label: t('designer.shapes'), icon: '🔷' },
  ];

  // --- 合并点：合并 handleArtElementSelect ---
  // (添加了文本状态重置)
  const handleArtElementSelect = useCallback((artId) => {
    // 如果选中 art, 则取消选中 text
    if (artId !== null) {
      setIsTextEditing(false);
      setCurrentTextId(null);
      setActiveTool(null);
      setTransformMode('translate');
    } else {
      setIsFillModeActive(false);
    }
    setSelectedArtId(artId);
  }, [setActiveTool, setTransformMode, setIsFillModeActive]);

  // --- 合并点：合并 handleToolSelect ---
  // (添加了艺术和文本状态的重置逻辑)
  const handleToolSelect = (key) => {
    // 1. Deselect Art (来自您的代码)
    handleArtElementSelect(null);

    // 2. Manage Text Editing State (来自同事的代码)
    if (key === 'text') {
      setIsTextEditing(true);
    } else {
      // 如果点击任何其他工具，关闭文本编辑
      setIsTextEditing(false);
      setCurrentTextId(null);
    }

    // 3. Set active tool
    setActiveTool(activeTool === key ? null : key)
  }

  // 您的 handleCloseArtEditor (保持不变)
  const handleCloseArtEditor = useCallback(() => {
    handleArtElementSelect(null);
  }, [handleArtElementSelect]);

  // 您的 selectedArt (保持不变)
  const selectedArt = useMemo(() => {
    const art = designState.artElements.find(art => art.id === selectedArtId);
    if (art) {
      return { ...art, properties: art.properties || {} };
    }
    return null;
  }, [designState, selectedArtId]);

  // 您的 handleDeleteElement (保持不变)
  const handleDeleteElement = useCallback((elementId, elementType) => {
    deleteElement(elementId, elementType);
    handleArtElementSelect(null);
  }, [deleteElement, handleArtElementSelect]);

  // 您的 Art 属性处理器 (保持不变)
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


  // 您的 handleSaveDesign (保持不变)
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
          const designData = {
            ...designState, name: designName, thumbnail: await sceneRef.current?.captureThumbnail?.(),
            userId: user?.id, timestamp: new Date().toISOString()
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

  // 您的 handleGenerateOrder (保持不变)
  const handleGenerateOrder = useCallback(() => {
    modal.confirm({
      title: t('modals.orderTitle'),
      icon: <FileTextOutlined />,
      content: t('modals.orderContent'),
      okText: t('modals.orderOkText'),
      cancelText: t('modals.orderCancelText'),
      async onOk() {
        try {
          message.loading({ content: t('modals.orderMessageOrdering'), key: 'ordering' });
          const orderData = {
            design: designState,
            proofImage: await sceneRef.current?.captureProof?.(),
            userId: user?.id,
            timestamp: new Date().toISOString(),
            orderNumber: `ARB${Date.now()}`
          };
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          orders.push(orderData);
          localStorage.setItem('orders', JSON.stringify(orders));
          message.success({ content: t('modals.orderMessageSuccess'), key: 'ordering' });
        } catch (error) {
          message.error({ content: t('modals.orderMessageError'), key: 'ordering' });
        }
      },
    });
  }, [designState, user, modal, t]);

  // --- 合并点：从同事代码中添加 UserDropdown 和相关处理器 ---
  const handleLanguageChange = useCallback(({ key }) => {
    i18n.changeLanguage(key)
    message.success(`Language changed to ${LANGUAGE_OPTIONS.find(lang => lang.code === key)?.nativeName}`)
  }, [i18n])

  const handleNavigation = (path) => {
    navigate(path)
  }

  const getCurrentLanguageName = () => {
    const lang = LANGUAGE_OPTIONS.find(option => option.code === i18n.language)
    return lang ? lang.nativeName : i18n.language.toUpperCase()
  }

  const languageMenu = {
    items: LANGUAGE_OPTIONS.map(lang => ({
      key: lang.code,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', minWidth: '140px' }}>
          <span>{lang.nativeName}</span>
        </div>
      ),
    })),
    onClick: handleLanguageChange,
  }

  // (您的代码中没有 handleLogout, UserDropdown, 但同事的有, MainLayout 中也有。
  // 我将假设 MainLayout 处理这些，但如果 DesignerPage 是一个独立页面，
  // 那么同事的 UserDropdown 逻辑应该被添加。
  // 鉴于您的 MainLayout.jsx，DesignerPage 不需要 Header。
  // 但是，同事的 DesignerPage.jsx *有* Header。
  // 我将遵循同事的 DesignerPage.jsx 结构，并将其与您的 DesignerPage.jsx (无 Header) 合并。
  // 您的 DesignerPage.jsx 没有 Header，它依赖于 MainLayout。
  // 同事的 DesignerPage.jsx 有一个完整的 Header。
  // 这意味着我应该只合并 *内容*，而不是布局。
  // 您的 DesignerPage.jsx 结构是正确的 (Layout > Sider > Layout > Content > Footer)。
  // 我将把同事的功能合并到您现有的结构中。

  const handleBackgroundChange = (value) => {
    setCurrentBackground(value)
  }

  const getCurrentBackgroundUrl = () => {
    const bgOption = BACKGROUND_OPTIONS.find(bg => bg.value === currentBackground);
    return bgOption ? bgOption.url : null;
  };

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

  // --- 合并点：添加同事的文本处理器 ---
  const handleTextPositionChange = useCallback((textId, newPosition) => {
    updateTextPosition(textId, newPosition);
  }, [updateTextPosition]);

  const handleTextRotationChange = useCallback((textId, newRotation) => {
    updateTextRotation(textId, newRotation);
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

  // --- 合并点：合并 handleTextSelect (添加了 art deselect) ---
  const handleTextSelect = useCallback((textId) => {
    // 1. Deselect Art
    handleArtElementSelect(null);

    // 2. Select Text
    console.log('DesignerPage: 文字被选中', textId);
    setCurrentTextId(textId);
    setIsTextEditing(true);
    if (textId) {
      setTextSelected(textId, true);
    }
  }, [handleArtElementSelect, setTextSelected]);

  // --- 合并点：替换 renderToolContent 的 'text' case ---
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
      case 'text': // <-- 这是替换后的 case
        return (
          <TextEditor
            onAddText={handleTextAdd}
            onUpdateText={updateText}
            onDeleteText={handleDeleteText}
            currentTextId={currentTextId}
            existingTexts={texts}
            monuments={designState.monuments}
            isEditing={isTextEditing}
            fontOptions={fontOptions}
          />
        );
      default:
        return null
    }
  }

  // --- 合并点：添加同事的 UnitSelector function ---
  const UnitSelector = (unit) => {
    switch (unit) {
      case 'feet':
        return 3.281
      case 'inches':
        return 39.370
      default:
        return 3.281; // 默认英尺
    }
  }

  // --- 合并点：替换 DimensionControl 以使用单位 ---
  // (来自同事的 DimensionControl)
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

    // 计算当前单位的换算系数
    const unitMultiplier = UnitSelector(selectedUnit);

    return (
      <div className="dimension-control">
        <label>{label}</label>
        <div className="dimension-inputs">
          {['length', 'width', 'height'].map((dim) => (
            <div key={dim} className="dimension-input">
              <InputNumber
                size="small"
                value={Math.round(element.dimensions[dim] * unitMultiplier * 10) / 10} // 转换为单位
                min={0}
                max={10 * unitMultiplier} // 最大值也转换
                step={0.1}
                onChange={(value) => updateDimensions(element.id, { ...element.dimensions, [dim]: value / unitMultiplier }, elementType)} // 转换回米
                style={{ width: '70px' }}
              />
            </div>
          ))}
        </div>
        {element.polish && polishOptions.length > 0 && (
          <div className="polish-control">
            <Select value={element.polish} size="small" style={{ width: 80 }} onChange={(value) => updatePolish(element.id, value, elementType)}>
              {polishOptions.map(polish => (
                <Select.Option key={polish} value={polish}>{polish}</Select.Option>
              ))}
            </Select>
          </div>
        )}
        {/* 转换为 LBS */}
        <div className="weight-display">{Math.round(element.weight * 2.2)} lbs</div>
      </div>
    );
  };


  // --- 渲染 (基于您的布局结构) ---
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
                <Button icon={<UndoOutlined />} size="small" disabled={!canUndo} onClick={undo}>{t('designer.undo')}</Button>
                <Button icon={<RedoOutlined />} size="small" disabled={!canRedo} onClick={redo}>{t('designer.redo')}</Button>
                <div className="custom-select-with-left-icon">
                  <EnvironmentOutlined className="select-left-icon" />
                  <Select value={currentBackground} onChange={handleBackgroundChange} style={{ height: '44px', display: 'flex', alignItems: 'center', width: '140px' }} className="background-select-custom" size="small">
                    {BACKGROUND_OPTIONS.map(bg => (<Select.Option key={bg.value} value={bg.value}>{bg.label}</Select.Option>))}
                  </Select>
                </div>
                <Button type="primary" icon={<SaveOutlined />} size="small" onClick={handleSaveDesign}>{t('designer.save')}</Button>
                <Button type="primary" icon={<FileTextOutlined />} size="small" onClick={handleGenerateOrder}>{t('designer.generateOrder')}</Button>
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

                // 您的 Art Props
                onArtElementSelect={handleArtElementSelect}
                selectedElementId={selectedArtId}
                transformMode={transformMode}
                onUpdateArtElementState={updateArtElementState}
                fillColor={fillColor}
                isFillModeActive={isFillModeActive}
                onModelFillClick={() => {}} // 您的代码有这个，但没有定义，我暂时保留

                // --- 合并点：添加同事的 Text Props ---
                onTextSelect={handleTextSelect}
                onTextPositionChange={handleTextPositionChange}
                onTextRotationChange={handleTextRotationChange}
                onDeleteText={handleDeleteText}
                currentTextId={currentTextId}
                isTextEditing={isTextEditing}
                getFontPath={getFontPath}
              />

              {/* 您的工具面板逻辑 (保持不变) */}
              {activeTool && !selectedArt && (
                <div className="tool-panel">
                  {renderToolContent()}
                </div>
              )}

              {/* 您的艺术图案编辑面板 (保持不变) */}
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
                />
              )}
            </div>
          </div>
        </Content>
        <Footer className="designer-footer">
          {/* --- 合并点：使用同事的 Footer 布局 --- */}
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
                {/* (来自同事) */}
                <Button size="small" onClick={addTablet}>
                  {t('designer.addTablet')}
                </Button>

                <Button size="small" onClick={addBase}>{t('designer.addBase')}</Button>
                <Button size="small" onClick={addSubBase}>{t('designer.addSubBase')}</Button>

                {/* (来自同事) */}
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
        </Footer>
      </Layout>
    </Layout>
  )
}

export default DesignerPage