import React, { useState } from 'react';
// 1. 移除了 useRef, useEffect (不再需要)
import { Layout, Button, Dropdown, Space, App, message, Modal } from 'antd';
import {
  HomeOutlined,
  SaveOutlined,
  HistoryOutlined,
  LogoutOutlined,
  GlobalOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// 导入样式以确保 header 样式生效
import '../../components/Designer/DesignerPage.css';

const { Header } = Layout;

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

const MainLayout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;

  App.useApp();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageChange = ({ key }) => {
    i18n.changeLanguage(key);
    message.success(`Language changed to ${LANGUAGE_OPTIONS.find(lang => lang.code === key)?.nativeName}`);
  };

  const getCurrentLanguageName = () => {
    const lang = LANGUAGE_OPTIONS.find(option => option.code === i18n.language);
    return lang ? lang.nativeName : i18n.language.toUpperCase();
  };

  // 语言菜单配置
  const languageMenu = {
    items: LANGUAGE_OPTIONS.map(lang => ({
      key: lang.code,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', minWidth: '100px' }}>
          <span>{lang.nativeName}</span>
        </div>
      ),
    })),
    onClick: handleLanguageChange,
  };

  // --- 重构后的 UserDropdown ---
  const UserDropdown = () => {
    const [userInfoVisible, setUserInfoVisible] = useState(false);

    const showUserInfo = () => {
      setUserInfoVisible(true);
    };

    // 用户菜单配置 (仿照语言菜单样式)
    const userMenu = {
      items: [
        {
          key: 'account',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '100px' }}>
              <UserOutlined />
              <span>Account</span>
            </div>
          ),
          onClick: showUserInfo,
        },
        {
          type: 'divider',
        },
        {
          key: 'logout',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '100px', color: '#ff4d4f' }}>
              <LogoutOutlined />
              <span>Logout</span>
            </div>
          ),
          onClick: handleLogout,
        },
      ],
    };

    const renderUserInfo = () => {
      const userInfo = user || {};
      return (
        <div className="user-info-content">
          <div className="user-info-item"> <span className="user-info-label">Username:</span> <span className="user-info-value">{userInfo.username || 'N/A'}</span> </div>
          <div className="user-info-item"> <span className="user-info-label">Email:</span> <span className="user-info-value">{userInfo.email || 'N/A'}</span> </div>
          <div className="user-info-item"> <span className="user-info-label">Phone:</span> <span className="user-info-value">{userInfo.phone || 'N/A'}</span> </div>
          <div className="user-info-item"> <span className="user-info-label">User Type:</span> <span className="user-info-value">{userInfo.type || 'N/A'}</span> </div>
        </div>
      );
    };

    return (
      <>
        {/* 这里的 Button 样式会自动继承 DesignerPage.css 中的 .header-right .ant-btn 样式 (透明背景+白边框) */}
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']} arrow>
          <Button icon={<UserOutlined />} style={{ minWidth: '120px' }}>
            <span>{user?.username || 'Account'}</span>
          </Button>
        </Dropdown>

        <Modal
          title="Account Information"
          open={userInfoVisible}
          onOk={() => setUserInfoVisible(false)}
          onCancel={() => setUserInfoVisible(false)}
          footer={[ <Button key="ok" type="primary" onClick={() => setUserInfoVisible(false)}> OK </Button> ]}
          width={400}
        >
          {renderUserInfo()}
        </Modal>
      </>
    );
  };

  return (
    <Layout className="designer-layout">
      <Header className="designer-header">
        <div className="header-left">
          <img src="/Arbor White Logo.png" alt="Arbor" className="header-logo" />
        </div>
        <div className="header-center">
          <div className="header-menu">
            <div className={`menu-item ${currentPath === '/designer' ? 'active' : ''}`} onClick={() => handleNavigation('/designer')}>
              <HomeOutlined /> <span className="menu-text">{t('designer.home')}</span>
              {currentPath === '/designer' && <div className="menu-arrow" />}
            </div>
            <div className={`menu-item ${currentPath === '/saved-designs' ? 'active' : ''}`} onClick={() => handleNavigation('/saved-designs')}>
              <SaveOutlined /> <span className="menu-text">{t('designer.savedDesigns')}</span>
              {currentPath === '/saved-designs' && <div className="menu-arrow" />}
            </div>
            <div className={`menu-item ${currentPath === '/order-history' ? 'active' : ''}`} onClick={() => handleNavigation('/order-history')}>
              <HistoryOutlined /> <span className="menu-text">{t('designer.orderHistory')}</span>
              {currentPath === '/order-history' && <div className="menu-arrow" />}
            </div>
          </div>
        </div>
        <div className="header-right">
          <Space.Compact>
            <Dropdown menu={languageMenu} placement="bottomRight" trigger={['click']} arrow>
              <Button icon={<GlobalOutlined />} style={{ minWidth: '120px' }}>
                <span>{getCurrentLanguageName()}</span>
              </Button>
            </Dropdown>

            <UserDropdown />

          </Space.Compact>
        </div>
      </Header>

      <Outlet />
    </Layout>
  );
};

export default MainLayout;