import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Layout, Button, message, Space, Dropdown, Select, InputNumber, Modal } from 'antd'
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
  UserOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Scene3D from './Scene3D'
import Toolbar from './Toolbar'
import ModelLibrary from './ModelLibrary'
import TextEditor from './TextEditor'
import MaterialPanel from './MaterialPanel'
import { useDesignState } from '../../hooks/useDesignState'
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
]

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', url: null },
  { value: 'spring', label: 'Spring', url: './backgrounds/Spring.jpg' },
  { value: 'summer', label: 'Summer', url: './backgrounds/Summer.jpeg' },
  { value: 'winter', label: 'Winter', url: './backgrounds/Winter.jpg' }
]

const DesignerPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const sceneRef = useRef()
  const { user, logout } = useAuth()

  const [collapsed, setCollapsed] = useState(false)
  const [activeTool, setActiveTool] = useState(null)
  const [currentBackground, setCurrentBackground] = useState('transparent')
  //英尺英寸状态
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [currentTextId, setCurrentTextId] = useState(null);
  const [isTextEditing, setIsTextEditing] = useState(false); // 新增：文字编辑状态
  const {
    designState,
    updateDimensions,
    updatePolish,
    updateMaterial,
    addProduct,
    addBase,
    removeBase,
    addSubBase,
    addTablet,
    removeSubBase,
    addVase,
    addArt,
    duplicateElement,
    deleteElement,
    undo,
    redo,
    canUndo,
    canRedo,
    productFamilies,
    basePolishOptions,
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

  // 工具菜单项
  const tools = [
    { key: 'art', label: t('designer.artPanels'), icon: '🎨' },
    { key: 'vases', label: t('designer.vases'), icon: '🏺' },
    { key: 'text', label: t('designer.text'), icon: '📝' },
    { key: 'shapes', label: t('designer.shapes'), icon: '🔷' },
  ]
  //英尺英寸变换
  const UnitSelector = (selectedUnit) => {
    switch (selectedUnit) {
      case 'feet':
        return 3.281

      case 'inches':
        return 39.370
      default:
        return 3.281;
    }
  }



  // 修改工具选择处理
  const handleToolSelect = (key) => {
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
    setActiveTool(activeTool === key ? null : key);
  };

  // 保存设计
  const handleSaveDesign = useCallback(async () => {
    try {
      const designData = {
        ...designState,
        name: `Design_${Date.now()}`,
        thumbnail: await sceneRef.current?.captureThumbnail?.(),
        userId: user?.id,
        timestamp: new Date().toISOString()
      }

      // 保存到本地存储
      const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]')
      savedDesigns.push(designData)
      localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns))

      message.success('Design saved successfully')
    } catch (error) {
      message.error('Failed to save design')
    }
  }, [designState, user])

  // 生成订单
  const handleGenerateOrder = useCallback(async () => {
    try {
      const orderData = {
        design: designState,
        proofImage: await sceneRef.current?.captureProof?.(),
        userId: user?.id,
        timestamp: new Date().toISOString(),
        orderNumber: `ARB${Date.now()}`
      }

      // 保存订单到本地存储
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      orders.push(orderData)
      localStorage.setItem('orders', JSON.stringify(orders))

      message.success('Order generated successfully')
    } catch (error) {
      message.error('Failed to generate order')
    }
  }, [designState, user])

  // 语言切换
  const handleLanguageChange = useCallback(({ key }) => {
    i18n.changeLanguage(key)
    message.success(`Language changed to ${LANGUAGE_OPTIONS.find(lang => lang.code === key)?.nativeName}`)
  }, [i18n])

  // 背景切换
  const handleBackgroundChange = (value) => {
    setCurrentBackground(value)
  }

  // 获取当前选择的背景URL
  const getCurrentBackgroundUrl = () => {
    const bgOption = BACKGROUND_OPTIONS.find(bg => bg.value === currentBackground);
    return bgOption ? bgOption.url : null;
  };




  // 退出登录
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  //显示下拉框
  // 显示下拉框 
  const UserDropdown = () => {
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const [userInfoVisible, setUserInfoVisible] = useState(false);

    // 点击外部关闭下拉菜单
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownVisible(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    // 显示用户信息
    const showUserInfo = () => {
      setUserInfoVisible(true);
      setDropdownVisible(false);
    };
    // 用户信息弹窗内容
    const renderUserInfo = () => {
      // 从 useAuth 获取用户信息，如果没有则显示默认值
      const userInfo = user || {};

      return (
        <div className="user-info-content">
          <div className="user-info-item">
            <span className="user-info-label">Username:</span>
            <span className="user-info-value">{userInfo.username || 'N/A'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{userInfo.email || 'N/A'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Phone:</span>
            <span className="user-info-value">{userInfo.phone || 'N/A'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">User Type:</span>
            <span className="user-info-value">{userInfo.type || 'N/A'}</span>
          </div>
          {userInfo.department && (
            <div className="user-info-item">
              <span className="user-info-label">Department:</span>
              <span className="user-info-value">{userInfo.department}</span>
            </div>
          )}
          {userInfo.position && (
            <div className="user-info-item">
              <span className="user-info-label">Position:</span>
              <span className="user-info-value">{userInfo.position}</span>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="user-dropdown" ref={dropdownRef}>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => setDropdownVisible(!dropdownVisible)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {t('designer.logout')}
        </Button>

        {dropdownVisible && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={showUserInfo}>
              <UserOutlined />
              <span>Account</span>
            </div>
            <div className="dropdown-item logout" onClick={handleLogout}>
              <LogoutOutlined />
              <span>Logout</span>
            </div>
          </div>
        )}
        {/* 用户信息弹窗 */}
        <Modal
          title="Account Information"
          open={userInfoVisible}
          onOk={() => setUserInfoVisible(false)}
          onCancel={() => setUserInfoVisible(false)}
          footer={[
            <Button key="ok" type="primary" onClick={() => setUserInfoVisible(false)}>
              OK
            </Button>
          ]}
          width={400}
        >
          {renderUserInfo()}
        </Modal>

      </div>
    );
  }

  // 导航处理
  const handleNavigation = (path) => {
    navigate(path)
  }

  // 获取当前语言的显示名称
  const getCurrentLanguageName = () => {
    const lang = LANGUAGE_OPTIONS.find(option => option.code === i18n.language)
    return lang ? lang.nativeName : i18n.language.toUpperCase()
  }

  // 产品选择处理
  const handleProductSelect = (productData) => {
    addProduct(productData)
    setActiveTool(null)
    message.success(`Selected ${productData.class}`)
  }

  // 花瓶选择
  const handleVaseSelect = (vaseData) => {
    addVase(vaseData)
    setActiveTool(null)
    message.success(`Added ${vaseData.name}`)
  }

  // 图案选择
  const handleArtSelect = (artData) => {
    addArt(artData)
    setActiveTool(null)
    message.success(`Added ${artData.subclass}`)
  }


  // 更新位置变化处理函数
  const handleTextPositionChange = useCallback((textId, newPosition) => {
    console.log('文字位置变化:', textId, newPosition);
    updateTextPosition(textId, newPosition); // 使用专门的函数
  }, [updateTextPosition]);

  // 更新旋转变化处理函数
  const handleTextRotationChange = useCallback((textId, newRotation) => {
    console.log('文字旋转变化:', textId, newRotation);
    updateTextRotation(textId, newRotation); // 使用专门的函数
  }, [updateTextRotation]);

  // 修改文字添加函数
  const handleTextAdd = useCallback((textProperties) => {
    console.log('接收到文本属性:', textProperties);

    const targetMonumentId = designState.monuments.length > 0
      ? designState.monuments[0].id
      : null;

    if (!targetMonumentId) {
      message.error('请先添加一个主碑');
      return;
    }

    const newTextId = addText({
      ...textProperties,
      monumentId: targetMonumentId,

    });

    // 自动选中新添加的文字并进入编辑模式
    setCurrentTextId(newTextId);
    setIsTextEditing(true);

    message.success('文本添加成功');
    console.log('新文字ID:', newTextId);
  }, [designState.monuments, addText]);

  const handleDeleteText = useCallback((textId) => {
    deleteText(textId);
    setCurrentTextId(null);
    setIsTextEditing(false);
    message.success('文字已删除');
  }, [deleteText]);


  // 修改文字选择处理
  const handleTextSelect = useCallback((textId) => {
    console.log('DesignerPage: 文字被选中', textId);
    setCurrentTextId(textId);
    setIsTextEditing(true);
    // 更新文字选中状态
    setTextSelected(textId, true);
  }, [setTextSelected]);



  // 语言下拉菜单配置
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
            currentTextId={currentTextId} // 添加当前文本ID状态
            existingTexts={texts}
            monuments={designState.monuments}
            isEditing={isTextEditing} // 传递编辑模式状态
            fontOptions={fontOptions} // 从 useDesignState 获取
          />
        );
      default:
        return null
    }
  }

  // 尺寸控制组件
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

                value={Math.round(element.dimensions[dim] * UnitSelector(selectedUnit) * 10) / 10}
                min={0}
                max={10 * UnitSelector(selectedUnit)}
                step={0.1}
                onChange={(value) => updateDimensions(element.id, { ...element.dimensions, [dim]: value / UnitSelector(selectedUnit) }, elementType)}
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
          {Math.round(element.weight * 2.2)} lbs
        </div>
      </div>
    );
  };

  // useEffect(() => {
  //   console.log('Current design state:', designState);
  // }, [designState]);

  // // 检查尺寸输入框的值
  // useEffect(() => {
  //   if (designState.monuments.length > 0) {
  //     console.log('Monument dimensions:', designState.monuments[0].dimensions);
  //   }
  //   if (designState.bases.length > 0) {
  //     console.log('Base dimensions:', designState.bases[0].dimensions);
  //   }
  // }, [designState.monuments, designState.bases]);

  const currentPath = location.pathname

  return (
    <Layout className="designer-layout">
      <Header className="designer-header">
        <div className="header-left">
          <img src="/Arbor White Logo.png" alt="Arbor" className="header-logo" />
        </div>

        <div className="header-center">
          <div className="header-menu">
            <div
              className={`menu-item ${currentPath === '/designer' ? 'active' : ''}`}
              onClick={() => handleNavigation('/designer')}
            >
              <HomeOutlined />
              <span className="menu-text">{t('designer.home')}</span>
              {currentPath === '/designer' && <div className="menu-arrow" />}
            </div>
            <div
              className={`menu-item ${currentPath === '/saved-designs' ? 'active' : ''}`}
              onClick={() => handleNavigation('/saved-designs')}
            >
              <SaveOutlined />
              <span className="menu-text">{t('designer.savedDesigns')}</span>
              {currentPath === '/saved-designs' && <div className="menu-arrow" />}
            </div>
            <div
              className={`menu-item ${currentPath === '/order-history' ? 'active' : ''}`}
              onClick={() => handleNavigation('/order-history')}
            >
              <HistoryOutlined />
              <span className="menu-text">{t('designer.orderHistory')}</span>
              {currentPath === '/order-history' && <div className="menu-arrow" />}
            </div>
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
                style={{ minWidth: '120px' }}
              >
                <span>{getCurrentLanguageName()}</span>
              </Button>
            </Dropdown>
            {/*<Button 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              {t('designer.logout')}
  </Button>*/}
            <UserDropdown />

          </Space.Compact>
        </div>
      </Header>

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

          {/* 材质面板 */}
          {!collapsed && (   // 当collapsible为true时，才显示材质面板
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
                  onFlipElement={deleteElement}
                  onTextSelect={handleTextSelect}
                  onTextPositionChange={handleTextPositionChange}
                  onTextRotationChange={handleTextRotationChange} // 新增
                  onDeleteText={handleDeleteText} // 新增
                  currentTextId={currentTextId}
                  isTextEditing={isTextEditing}
                  getFontPath={getFontPath}
                />

                {activeTool && (
                  <div className="tool-panel">
                    {renderToolContent()}
                  </div>
                )}
              </div>
            </div>
          </Content>

          <Footer className="designer-footer">
            <div className="footer-controls">
              <div className="control-rows-container">
                {/* 纪念碑控制 */}
                {designState.monuments.map(monument => (
                  <DimensionControl
                    key={monument.id}
                    element={monument}
                    elementType="monument"
                    label={t('designer.tablet')}
                  />
                ))}

                {/* 底座控制 */}
                {designState.bases.map(base => (
                  <DimensionControl
                    key={base.id}
                    element={base}
                    elementType="base"
                    label={t('designer.base')}
                  />
                ))}

                {/* 副底座控制 */}
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

                  <Button size="small" onClick={addBase}>
                    {t('designer.addBase')}
                  </Button>

                  <Button size="small" onClick={addSubBase}>
                    {t('designer.addSubBase')}
                  </Button>
                  <p> {t('designer.format')}</p>
                  <select
                    value={selectedUnit || ''}
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
    </Layout>
  )
}
export default DesignerPage