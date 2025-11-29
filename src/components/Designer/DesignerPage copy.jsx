import React, { useState, useCallback, useEffect } from 'react'
import { Layout, Menu, Button, FloatButton, message, Space, Dropdown, Select, InputNumber } from 'antd'
import {
  HomeOutlined,
  SaveOutlined,
  HistoryOutlined,
  UndoOutlined,
  RedoOutlined,
  LogoutOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Scene3D from './Scene3D'
import Toolbar from './Toolbar'
import ModelLibrary from './ModelLibrary'
import TextEditor from './TextEditor'
import MaterialPanel from './MaterialPanel'
import './DesignerPage.css'

const { Header, Sider, Content, Footer } = Layout
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  // { code: 'de', name: 'German', nativeName: 'Deutsch' },
  // { code: 'es', name: 'Spanish', nativeName: 'Español' },
  // { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  // { code: 'ko', name: 'Korean', nativeName: '한국어' },
  // { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  // { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  // { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  // { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  // { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  // { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  // { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  // { code: 'th', name: 'Thai', nativeName: 'ไทย' },
];

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', url: null },
  { value: 'spring', label: 'Spring', url: '/backgrounds/Spring.jpg' },
  { value: 'summer', label: 'Summer', url: '/backgrounds/Summer.jpeg' },
  { value: 'winter', label: 'Winter', url: '/backgrounds/Winter.jpg' }
];

// 产品家族数据
const PRODUCT_FAMILIES = [
  { id: 'tablet', name: 'Tablet', types: ['Serp Top', 'Flat Top', 'Half Serp Top', 'Oval'] },
  { id: 'bench', name: 'Bench', types: ['Curved Bench', 'Serenity Bench'] },
  { id: 'rock', name: 'Rock', types: ['Mriangle Rock', 'Round Rock', 'Square Rock', 'MountainTop Rock', 'Tree Marker Rock'] },
  { id: 'pedestal', name: 'Pedestal', types: ['Cremation Pedestal', 'Oversize Cremation Pedestal'] },
  { id: 'columbarium', name: 'Columbarium', types: ['Douglas', 'Heritage'] }
];

// 材质密度映射 (kg/m³)
const MATERIAL_DENSITY = {
  granite: 2650,
  marble: 2700,
  bronze: 8800,
  concrete: 2400,
  metal: 7850,
  wood: 700
};

const DesignerPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  
  const [collapsed, setCollapsed] = useState(false)
  const [activeTool, setActiveTool] = useState(null)
  const [selectedMenu, setSelectedMenu] = useState('home')
  const [currentBackground, setCurrentBackground] = useState('transparent')
  
  // 完整设计状态
  const [designState, setDesignState] = useState({
    // 主产品
    monument: {
      model: null,
      family: null,
      class: null,
      polish: null,
      color: 'Black',
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0
    },
    // 底座
    base: {
      model: null,
      polish: 'P5',
      color: 'Black',
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0,
      visible: false
    },
    // 副底座
    subBase: {
      model: null,
      polish: 'P5',
      color: 'Black',
      dimensions: { length: 0, width: 0, height: 0 },
      weight: 0,
      visible: false
    },
    // 其他元素
    vases: [],
    artElements: [],
    textElements: [],
    currentMaterial: 'Black'
  })

  // 工具菜单项
  const tools = [
    { key: 'art', label: t('designer.artPanels'), icon: <i>🎨</i> },
    { key: 'vases', label: t('designer.vases'), icon: <i>🏺</i> },
    { key: 'text', label: t('designer.text'), icon: <i>📝</i> },
    { key: 'shapes', label: t('designer.shapes'), icon: <i>🔷</i> },
    { key: 'material', label: t('designer.materialColor'), icon: <i>🎭</i> }
  ]

  // 处理工具选择
  const handleToolSelect = (key) => {
    setActiveTool(activeTool === key ? null : key)
  }

  // 保存设计（任务7：savedesignAPI）
  const handleSaveDesign = useCallback(() => {
    const designData = {
      ...designState,
      timestamp: new Date().toISOString(),
      name: `Design_${Date.now()}`
    }
    
    // 保存到本地存储或API
    const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]')
    savedDesigns.push(designData)
    localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns))
    
    message.success('Design saved successfully')
  }, [designState])

  // 生成订单
  const handleGenerateOrder = useCallback(() => {
    // 生成订单逻辑（任务3：订单API）
    message.success('Order generated successfully')
  }, [designState])

  // 语言切换
  const handleLanguageChange = useCallback(({ key }) => {
    i18n.changeLanguage(key);
    message.success(`Language changed to ${LANGUAGE_OPTIONS.find(lang => lang.code === key)?.nativeName}`);
  }, [i18n]);

  // 背景切换
  const handleBackgroundChange = (value) => {
    setCurrentBackground(value)
    message.success(`Background changed to ${BACKGROUND_OPTIONS.find(bg => bg.value === value)?.label}`)
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  // 获取当前语言的显示名称
  const getCurrentLanguageName = () => {
    const lang = LANGUAGE_OPTIONS.find(option => option.code === i18n.language);
    return lang ? lang.nativeName : i18n.language.toUpperCase();
  };

  // 底座管理
  const handleAddBase = () => {
    const basePath = `models/Bases/P5/Base_P5_${designState.currentMaterial}.glb`
    setDesignState(prev => ({
      ...prev,
      base: {
        ...prev.base,
        model: basePath,
        polish: 'P5',
        color: prev.currentMaterial,
        visible: true,
        dimensions: { length: 28, width: 16, height: 8 }
      }
    }))
  }

  const handleRemoveBase = () => {
    setDesignState(prev => ({
      ...prev,
      base: {
        ...prev.base,
        model: null,
        visible: false,
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      }
    }))
  }

  const handleAddSubBase = () => {
    const subBasePath = `models/Bases/P5/Base_P5_${designState.currentMaterial}.glb`
    setDesignState(prev => ({
      ...prev,
      subBase: {
        ...prev.subBase,
        model: subBasePath,
        polish: 'P5',
        color: prev.currentMaterial,
        visible: true,
        dimensions: { length: 32, width: 20, height: 6 }
      }
    }))
  }

  const handleRemoveSubBase = () => {
    setDesignState(prev => ({
      ...prev,
      subBase: {
        ...prev.subBase,
        model: null,
        visible: false,
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0
      }
    }))
  }

  // 尺寸调整
  const handleDimensionChange = (part, dimension, value) => {
    const newValue = Math.max(1, value)
    setDesignState(prev => ({
      ...prev,
      [part]: {
        ...prev[part],
        dimensions: {
          ...prev[part].dimensions,
          [dimension]: newValue
        }
      }
    }))
  }

  // 材质改变
  const handleMaterialChange = (color) => {
    setDesignState(prev => ({
      ...prev,
      currentMaterial: color,
      monument: prev.monument.model ? {
        ...prev.monument,
        color: color,
        model: prev.monument.model.replace(/_[^_]+\.glb$/, `_${color}.glb`)
      } : prev.monument,
      base: prev.base.visible ? {
        ...prev.base,
        color: color,
        model: `models/Bases/${prev.base.polish}/Base_${prev.base.polish}_${color}.glb`
      } : prev.base,
      subBase: prev.subBase.visible ? {
        ...prev.subBase,
        color: color,
        model: `models/Bases/${prev.subBase.polish}/Base_${prev.subBase.polish}_${color}.glb`
      } : prev.subBase
    }))
  }

  // 计算重量（任务9，更新密度映射函数（产品、款式、加工、石种等因素）
  const calculateWeight = (dimensions, material = 'granite') => {
    const volume = (dimensions.length * dimensions.width * dimensions.height*0.000589934*85*2.2) / 1000000 // 转换为立方米
    const density = MATERIAL_DENSITY[material] || 2650
    return Math.round(volume * density)
  }

  // 产品选择
  const handleProductSelect = (productData) => {
    const { family, class: productClass, polish = 'P5', color = designState.currentMaterial } = productData
    const modelPath = `models/Shapes/${family}/${productClass}/${polish}/${family}_${productClass}_${polish}_${color}.glb`
    
    setDesignState(prev => ({
      ...prev,
      monument: {
        model: modelPath,
        family,
        class: productClass,
        polish,
        color,
        dimensions: { length: 24, width: 12, height: 36 },
        weight: calculateWeight({ length: 24, width: 12, height: 36 })
      }
    }))
    
    setActiveTool(null)
    message.success(`Selected ${productClass}`)
  }

  // 花瓶选择
  const handleVaseSelect = (vaseClass) => {
    const vasePath = `models/Vases/${vaseClass}/${vaseClass}.glb`
    setDesignState(prev => ({
      ...prev,
      vases: [...prev.vases, {
        model: vasePath,
        class: vaseClass,
        position: [0, 0, 0],
        scale: [1, 1, 1]
      }]
    }))
    setActiveTool(null)
  }

  // 图案选择
  const handleArtSelect = (artClass) => {
    const artPath = `models/Art/${artClass}/${artClass}.glb`
    setDesignState(prev => ({
      ...prev,
      artElements: [...prev.artElements, {
        model: artPath,
        class: artClass,
        position: [0, 0, 0],
        scale: [1, 1, 1]
      }]
    }))
    setActiveTool(null)
  }

  // 文本添加
  const handleTextAdd = (textData) => {
    setDesignState(prev => ({
      ...prev,
      textElements: [...prev.textElements, {
        ...textData,
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      }]
    }))
    setActiveTool(null)
  }

  // 语言下拉菜单配置
  const languageMenu = {
    items: LANGUAGE_OPTIONS.map(lang => ({
      key: lang.code,
      label: (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          minWidth: '140px'
        }}>
          <span>{lang.nativeName}</span>
          <span style={{ 
            color: '#999', 
            fontSize: '12px',
            marginLeft: '8px'
          }}> 
          </span>
        </div>
      ),
    })),
    onClick: handleLanguageChange,
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'art':
        return (
          <ModelLibrary
            type="art"
            basePath="models/Art"
            onSelect={handleArtSelect}
          />
        )
      case 'vases':
        return (
          <ModelLibrary
            type="vases"
            basePath="models/Vases"
            onSelect={handleVaseSelect}
          />
        )
      case 'text':
        return (
          <TextEditor onAddText={handleTextAdd} />
        )
      case 'shapes':
        return (
          <ModelLibrary
            type="shapes"
            basePath="models/Shapes"
            families={PRODUCT_FAMILIES}
            onSelect={handleProductSelect}
          />
        )
      case 'material':
        return (
          <MaterialPanel 
            currentMaterial={designState.currentMaterial}
            onMaterialChange={handleMaterialChange}
          />
        )
      default:
        return null
    }
  }

  const DimensionControl = ({ label, dimensions, onDimensionChange, part, showPolish = false, showMaterial = false }) => (
    <div className="dimension-control-group">
      <label>{label}</label>
      <div className="dimension-inputs">
        {['length', 'width', 'height'].map((dim) => (
          <div key={dim} className="dimension-input">
            <span className="dimension-label">{dim.charAt(0).toUpperCase()}:</span>
            <div className="dimension-control">
              <InputNumber
                size="small"
                value={dimensions[dim]}
                min={1}
                onChange={(value) => onDimensionChange(part, dim, value || 1)}
                className="dimension-value"
                control={true}
              />
              <span style={{ fontSize: '10px', color: '#999' }}>in</span>
            </div>
          </div>
        ))}
      </div>
      
      {showPolish && (
        <div className="additional-controls">
          <div className="control-group">
            <span className="dimension-label">{t('designer.polish')}:</span>
            <Select defaultValue="P5" size="small" style={{ width: 80 }}>
              <Select.Option value="P2">P2</Select.Option>
              <Select.Option value="P3">P3</Select.Option>
              <Select.Option value="P5">P5</Select.Option>
            </Select>
          </div>
        </div>
      )}
      
      {showMaterial && (
        <div className="additional-controls">
          <div className="control-group">
            <span className="dimension-label">{t('designer.polish')}:</span>
            <Select defaultValue="P5" size="small" style={{ width: 80 }}>
              <Select.Option value="P2">PT</Select.Option>
              <Select.Option value="P3">P5</Select.Option>
              <Select.Option value="P5">PM2</Select.Option>
            </Select>
          </div>
        </div>
      )}
      
      <div className="control-group">
        <span className="dimension-label">{t('designer.weight')}:</span>
        <span className="weight-value">
          {calculateWeight(dimensions)} {t('designer.kg')}
        </span>
      </div>
    </div>
  )


  return (
    <Layout className="designer-layout">
      <Header className="designer-header">
        <div className="header-left">
          <img src="/Arbor White Logo.png" alt="Arbor" className="header-logo" />
        </div>

        <div className="header-center">
          <div className="header-menu">
            {['home', 'save', 'orderHistory'].map((item) => (
              <div
                key={item}
                className={`menu-item ${selectedMenu === item ? 'active' : ''}`}
                onClick={() => setSelectedMenu(item)}
              >
                <span className="menu-text">
                  {item === 'home' && <HomeOutlined />}
                  {item === 'save' && <SaveOutlined />}
                  {item === 'orderHistory' && <HistoryOutlined />}
                  {' '+ t(`designer.${item}`)}
                </span>
                {selectedMenu === item && <div className="menu-arrow" />}
              </div>
            ))}
          </div>
        </div>
        
        <div className="header-right">
          <Space.Compact>
            <Dropdown 
              menu={languageMenu} 
              placement="bottomRight"
              trigger={['click']}
              arrow
            >
              <Button 
                icon={<GlobalOutlined />}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  minWidth: '120px'
                }}
              >
                <span>{getCurrentLanguageName()}</span>
              </Button>
            </Dropdown>
            <Button 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              {t('designer.logout')}
            </Button>
          </Space.Compact>
        </div>
      </Header>

      <Layout>
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
        </Sider>

        <Layout>
          <Content className="designer-content">
            <div className="scene-container">
              <div className="scene-controls-top">
                <Space.Compact
                style={{ 
                display: 'flex', 
                alignItems: 'center',
                height: '40px'
              }}>
                  <Button icon={<UndoOutlined />} size="small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t('designer.undo')}
                  </Button>
                  <Button icon={<RedoOutlined />} size="small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        width: '120px'
                      }}
                      className="background-select-custom"
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {t('designer.save')}
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<FileTextOutlined />}
                    danger
                    size="small"
                    onClick={handleGenerateOrder}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {t('designer.generateOrder')}
                  </Button>
                </Space.Compact>
              </div>
              
              <div className="scene-wrapper">
                <Scene3D 
                  designState={designState}
                  background={BACKGROUND_OPTIONS.find(bg => bg.value === currentBackground)?.url}
                  onDimensionUpdate={(part, dimensions) => {
                    setDesignState(prev => ({
                      ...prev,
                      [part]: {
                        ...prev[part],
                        dimensions
                      }
                    }))
                  }}
                />
                
                {activeTool && (
                  <div className="tool-panel">
                    <div className="tool-panel-arrow" />
                    {renderToolContent()}
                  </div>
                )}
              </div>
            </div>
          </Content>

          <Footer className="designer-footer">
            <div className="footer-controls">
              <div className="control-rows-container">
                {/* 产品控制行 */}
                {designState.monument.model && (
                  <div className="control-row">
                    <div className="control-section">
                      <div className="section-content">
                        <DimensionControl 
                          label={t('designer.tablet')}
                          dimensions={designState.monument.dimensions}
                          onDimensionChange={handleDimensionChange}
                          part="monument"
                          showPolish={true}
                          showMaterial={false}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 底座控制行 */}
                {designState.base.visible && (
                  <div className="control-row">
                    <div className="control-section">
                      <div className="section-content">
                        <DimensionControl 
                          label={t('designer.base')}
                          dimensions={designState.base.dimensions}
                          onDimensionChange={handleDimensionChange}
                          part="base"
                          showPolish={false}
                          showMaterial={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 副底座控制行 */}
                {designState.subBase.visible && (
                  <div className="control-row">
                    <div className="control-section">
                      <div className="section-content">
                        <DimensionControl 
                          label={t('designer.subBase')}
                          dimensions={designState.subBase.dimensions}
                          onDimensionChange={handleDimensionChange}
                          part="subBase"
                          showPolish={false}
                          showMaterial={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 底座按钮 */}
              <div className="base-buttons-container">
                <Space>
                  {!designState.base.visible ? (
                    <Button size="small" type="primary" onClick={handleAddBase}>
                      + {t('designer.addBase')}
                    </Button>
                  ) : (
                    <Button size="small" type="default" onClick={handleRemoveBase}>
                      - {t('designer.removeBase')}
                    </Button>
                  )}
                  
                  {!designState.subBase.visible ? (
                    <Button size="small" type="primary" onClick={handleAddSubBase}>
                      + {t('designer.addSubBase')}
                    </Button>
                  ) : (
                    <Button size="small" type="default" onClick={handleRemoveSubBase}>
                      - {t('designer.removeSubBase')}
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          </Footer>
        </Layout>
      </Layout>


      {/* <FloatButton.Group shape="circle" style={{ right: 24 }}>
        <FloatButton icon={<UndoOutlined />} />
        <FloatButton icon={<RedoOutlined />} />
        <FloatButton.BackTop visibilityHeight={0} />
      </FloatButton.Group> */}
    </Layout>
  )
}

export default DesignerPage