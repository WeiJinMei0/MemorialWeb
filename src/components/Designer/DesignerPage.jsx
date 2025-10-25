import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Layout, Button, message, Space, Dropdown, Select, InputNumber } from 'antd'
import {
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import Scene3D from './Scene3D'
import Toolbar from './Toolbar'
import ModelLibrary from './ModelLibrary'
import TextEditor from './TextEditor'
import MaterialPanel from './MaterialPanel'
import ArtEditorPanel from './ArtEditorPanel' //
import { useDesignState } from '../../hooks/useDesignState'
import './DesignerPage.css'

const { Sider, Content, Footer } = Layout

// BACKGROUND_OPTIONS 保持不变
const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', url: null },
  { value: 'spring', label: 'Spring', url: './backgrounds/Spring.jpg' },
  { value: 'summer', label: 'Summer', url: './backgrounds/Summer.jpeg' },
  { value: 'winter', label: 'Winter', url: './backgrounds/Winter.jpg' }
]

const DesignerPage = () => {
  const { t, i18n } = useTranslation()
  const sceneRef = useRef() //
  const { user } = useAuth() //

  const [collapsed, setCollapsed] = useState(false) //
  const [activeTool, setActiveTool] = useState(null) //
  const [currentBackground, setCurrentBackground] = useState('transparent') //

  // 艺术图案状态
  const [selectedArtId, setSelectedArtId] = useState(null)
  const [transformMode, setTransformMode] = useState('translate')

  // --- 【新增】填充颜色工具状态 ---
  const [fillColor, setFillColor] = useState('#4285F4');

  const {
    designState,
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
    updateArtElementState, //
    undo,
    redo,
    canUndo,
    canRedo,
    productFamilies,
    basePolishOptions
  } = useDesignState(); //

  // 工具菜单项
  const tools = [
    { key: 'art', label: t('designer.artPanels'), icon: '🎨' },
    { key: 'vases', label: t('designer.vases'), icon: '🏺' },
    { key: 'text', label: t('designer.text'), icon: '📝' },
    { key: 'shapes', label: t('designer.shapes'), icon: '🔷' },
  ]

  // 处理工具选择
  const handleToolSelect = (key) => {
    setSelectedArtId(null);
    setActiveTool(activeTool === key ? null : key)
  }

  // 处理艺术元素点击事件 (来自 Scene3D)
  const handleArtElementSelect = useCallback((artId) => {
    setSelectedArtId(artId);
    if (artId !== null) {
      setActiveTool(null);
      setTransformMode('translate');
    }
  }, []);

  // 关闭编辑面板
  const handleCloseArtEditor = useCallback(() => {
    setSelectedArtId(null);
    setTransformMode('translate');
  }, []);

  // 获取当前选中的艺术元素数据
  const selectedArt = useMemo(() => {
    // 【修改】将依赖项从 [designState.artElements, selectedArtId]
    // 更改为 [designState, selectedArtId]
    // 这可以修复因 useDesignState 内部可能存在的状态突变（mutation）
    // 导致的 useMemo 缓存不更新的问题。
    const art = designState.artElements.find(art => art.id === selectedArtId);
    if (art) {
      return {
        ...art,
        properties: art.properties || {} // 确保 properties 存在
      };
    }
    return null;
  }, [designState, selectedArtId]); // 【关键修复】

  // 处理删除的包装函数
  const handleDeleteElement = useCallback((elementId, elementType) => {
    deleteElement(elementId, elementType);
    setSelectedArtId(null);
    setTransformMode('translate');
  }, [deleteElement]);

  // --- 【新增】处理画布编辑的回调 ---

  /**
   * 更新艺术图案的线条颜色。
   * 【修复】将 updateArtElementState 的第二个参数改为一个函数，
   * 以防止竞态条件和陈旧闭包。
   */
  const handleLineColorChange = useCallback((artId, newColor) => {
    // 不再从闭包中读取 designState.artElements
    updateArtElementState(artId, (prevArt) => ({
      properties: {
        ...(prevArt.properties || {}), // 【关键】从 prevArt 读取
        lineColor: newColor
      }
    }));
    // 【修复】移除对 designState.artElements 的依赖
  }, [updateArtElementState]); // 依赖项

  /**
   * 更新艺术图案的线条透明度。
   * 【修复】将 updateArtElementState 的第二个参数改为一个函数。
   */
  const handleLineAlphaChange = useCallback((artId, newAlpha) => {
    // 不再从闭包中读取 designState.artElements
    updateArtElementState(artId, (prevArt) => ({
      properties: {
        ...(prevArt.properties || {}), // 【关键】从 prevArt 读取
        lineAlpha: newAlpha
      }
    }));
    // 【修复】移除对 designState.artElements 的依赖
  }, [updateArtElementState]); // 依赖项


  // --- 现有函数 (保存, 订单, 背景等) ---
  //
  const handleSaveDesign = useCallback(async () => {
    try {
      const designData = {
        ...designState,
        name: `Design_${Date.now()}`,
        thumbnail: await sceneRef.current?.captureThumbnail?.(),
        userId: user?.id,
        timestamp: new Date().toISOString()
      }
      const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]')
      savedDesigns.push(designData)
      localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns))
      message.success('Design saved successfully')
    } catch (error) {
      message.error('Failed to save design')
    }
  }, [designState, user])

  const handleGenerateOrder = useCallback(async () => {
    try {
      const orderData = {
        design: designState,
        proofImage: await sceneRef.current?.captureProof?.(),
        userId: user?.id,
        timestamp: new Date().toISOString(),
        orderNumber: `ARB${Date.now()}`
      }
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      orders.push(orderData)
      localStorage.setItem('orders', JSON.stringify(orders))
      message.success('Order generated successfully')
    } catch (error) {
      message.error('Failed to generate order')
    }
  }, [designState, user])

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

  const handleTextAdd = (textData) => {
    // addText(textData)
    setActiveTool(null)
    message.success('Text added successfully')
  }

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
          <TextEditor onAddText={handleTextAdd} />
        );
      default:
        return null
    }
  }

  // 尺寸控制组件 (保持不变)
  const DimensionControl = ({ element, elementType, label }) => {
    const getPolishOptions = () => {
      switch (elementType) {
        case 'monument':
          return productFamilies[element.family]?.polishOptions || ['P5'];
        case 'base':
        case 'subBase':
          return basePolishOptions || ['P5'];
        default:
          return [];
      }
    };
    const polishOptions = getPolishOptions();
    return (
      <div className="dimension-control">
        <label>{label}</label>
        <div className="dimension-inputs">
          {['length', 'width', 'height'].map((dim) => (
            <div key={dim} className="dimension-input">
              <InputNumber
                size="small"
                value={element.dimensions[dim]}
                min={0}
                max={10}
                step={0.1}
                onChange={(value) => updateDimensions(element.id, { ...element.dimensions, [dim]: value }, elementType)}
                style={{ width: '70px' }}
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
        <div className="weight-display">
          {element.weight} kg
        </div>
      </div>
    );
  };

  // --- JSX (渲染) ---
  return (
    <Layout className="main-content-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={280}
        className="toolbar-sider"
      >
        <Toolbar
          tools={tools}
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
        />
        {!collapsed && (
          <div className="material-section">
            <MaterialPanel
              currentMaterial={designState.currentMaterial}
              onMaterialChange={updateMaterial}
              compact={true}
            />
          </div>
        )}
      </Sider>

      <Layout className="scene-footer-layout">
        <Content className="designer-content">
          <div className="scene-container">
            <div className="scene-controls-top">
              {/* 控件保持不变 */}
              <Space.Compact>
                <Button
                  icon={<UndoOutlined />}
                  size="small"
                  disabled={!canUndo}
                  onClick={undo}
                >
                  {t('designer.undo')}
                </Button>
                <Button
                  icon={<RedoOutlined />}
                  size="small"
                  disabled={!canRedo}
                  onClick={redo}
                >
                  {t('designer.redo')}
                </Button>
                <div className="custom-select-with-left-icon">
                  <EnvironmentOutlined className="select-left-icon" />
                  <Select
                    value={currentBackground}
                    onChange={handleBackgroundChange}
                    style={{
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      width: '140px'
                    }}
                    className="background-select-custom"
                    size="small"
                  >
                    {BACKGROUND_OPTIONS.map(bg => (
                      <Select.Option key={bg.value} value={bg.value}>{bg.label}</Select.Option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="small"
                  onClick={handleSaveDesign}
                >
                  {t('designer.save')}
                </Button>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  size="small"
                  onClick={handleGenerateOrder}
                >
                  {t('designer.generateOrder')}
                </Button>
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
                onArtElementSelect={handleArtElementSelect}
                selectedElementId={selectedArtId}
                transformMode={transformMode}
                onUpdateArtElementState={updateArtElementState}
                // --- 【新增】将填充颜色传递给 Scene3D ---
                // Scene3D 内部的 onMouseDown 事件需要使用这个 prop
                fillColor={fillColor}
              />

              {/* 主工具面板 */}
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

                  // --- 【新增】传递新 props ---
                  fillColor={fillColor}
                  setFillColor={setFillColor}
                  onLineColorChange={handleLineColorChange}
                  onLineAlphaChange={handleLineAlphaChange}
                />
              )}
            </div>
          </div>
        </Content>

        <Footer className="designer-footer">
          {/* 页脚控件保持不变 */}
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
                <Button size="small" onClick={addBase}>
                  {t('designer.addBase')}
                </Button>
                <Button size="small" onClick={addSubBase}>
                  {t('designer.addSubBase')}
                </Button>
              </Space>
            </div>
          </div>
        </Footer>
      </Layout>
    </Layout>
  )
}

export default DesignerPage