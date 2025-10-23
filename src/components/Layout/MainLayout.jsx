import React from 'react';
// 1. 从 antd 导入 App 和 message
import { Layout, Button, Dropdown, Space, App, message } from 'antd';
import {
  HomeOutlined,
  SaveOutlined,
  HistoryOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// 2. 导入样式以确保 header 样式生效
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
  const { logout } = useAuth();
  const currentPath = location.pathname;

  // 3. 使用 App.useApp() 钩子。这是让 message 等组件正常工作的关键
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
    // 现在这个 message 调用可以正常工作了
    message.success(`Language changed to ${LANGUAGE_OPTIONS.find(lang => lang.code === key)?.nativeName}`);
  };

  const getCurrentLanguageName = () => {
    const lang = LANGUAGE_OPTIONS.find(option => option.code === i18n.language);
    return lang ? lang.nativeName : i18n.language.toUpperCase();
  };

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
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              {t('designer.logout')}
            </Button>
          </Space.Compact>
        </div>
      </Header>

      <Outlet />
    </Layout>
  );
};

export default MainLayout;