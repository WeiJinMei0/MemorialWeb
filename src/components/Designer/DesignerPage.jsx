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
import './DesignerPage.css';

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

  // Text 和 Unit 状态
  const [selectedUnit, setSelectedUnit] = useState('feet');
  const [currentTextId, setCurrentTextId] = useState(null);
  const [isTextEditing, setIsTextEditing] = useState(false);

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


  // 加载最近保存的设计
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
      setIsTextEditing(false);
      setCurrentTextId(null);
      setActiveTool(null);
      setTransformMode('translate');
    } else {
      setIsFillModeActive(false);
    }
    setSelectedArtId(artId);
  }, [setActiveTool, setTransformMode, setIsFillModeActive]);

  // handleToolSelect
  const handleToolSelect = (key) => {
    handleArtElementSelect(null);
    if (key === 'text') {
      setIsTextEditing(true);
    } else {
      setIsTextEditing(false);
      setCurrentTextId(null);
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

  // handleDeleteElement
  const handleDeleteElement = useCallback((elementId, elementType) => {
    deleteElement(elementId, elementType);
    handleArtElementSelect(null);
  }, [deleteElement, handleArtElementSelect]);

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

  // handleGenerateOrder
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

  // 文本处理器
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

  const handleTextSelect = useCallback((textId) => {
    handleArtElementSelect(null);
    console.log('DesignerPage: 文字被选中', textId);
    setCurrentTextId(textId);
    setIsTextEditing(true);
    if (textId) {
      setTextSelected(textId, true);
    }
  }, [handleArtElementSelect, setTextSelected]);

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
            monuments={designState.monuments}
            isEditing={isTextEditing}
            fontOptions={fontOptions}
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

    return (
      <div className="dimension-control">
        <label>{label}</label>
        <div className="dimension-inputs">
          {['length', 'width', 'height'].map((dim) => (
            <div key={dim} className="dimension-input">
              <InputNumber
                size="small"
                value={Math.round(element.dimensions[dim] * unitMultiplier * 10) / 10}
                min={0}
                max={10 * unitMultiplier}
                step={0.1}
                onChange={(value) => updateDimensions(element.id, { ...element.dimensions, [dim]: value / unitMultiplier }, elementType)}
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
        <div className="weight-display">{Math.round(element.weight * 2.2)} lbs</div>
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

                // Art Props
                onArtElementSelect={handleArtElementSelect}
                selectedElementId={selectedArtId}
                transformMode={transformMode}
                onUpdateArtElementState={updateArtElementState}
                fillColor={fillColor}
                isFillModeActive={isFillModeActive}
                onModelFillClick={() => {}}

                // Text Props
                onTextSelect={handleTextSelect}
                onTextPositionChange={handleTextPositionChange}
                onTextRotationChange={handleTextRotationChange}
                onDeleteText={handleDeleteText}
                currentTextId={currentTextId}
                isTextEditing={isTextEditing}
                getFontPath={getFontPath}
              />

              {/* 工具面板 */}
              {activeTool && !selectedArt && (
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
                />
              )}
            </div>
          </div>
        </Content>
        <Footer className="designer-footer">
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
        </Footer>
      </Layout>
    </Layout>
  )
}

export default DesignerPage