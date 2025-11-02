import React, { useState, useRef, useEffect } from 'react';
// 1. 导入 App, message, Modal, 和 UserOutlined
import { Layout, Button, Dropdown, Space, App, message, Modal } from 'antd';
import {
  HomeOutlined,
  SaveOutlined,
  HistoryOutlined,
  LogoutOutlined,
  GlobalOutlined,
  UserOutlined // 2. 已导入
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
  const { user, logout } = useAuth(); // 3. 从 useAuth 获取 user
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


  const UserDropdown = () => {
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const [userInfoVisible, setUserInfoVisible] = useState(false);

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

    const showUserInfo = () => {
      setUserInfoVisible(true);
      setDropdownVisible(false);
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
      <div className="user-dropdown" ref={dropdownRef}>
        <Button icon={<UserOutlined />} onClick={() => setDropdownVisible(!dropdownVisible)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user?.username || 'Account'}
        </Button>
        {dropdownVisible && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={showUserInfo}> <UserOutlined /> <span>Account</span> </div>
            <div className="dropdown-item logout" onClick={handleLogout}> <LogoutOutlined /> <span>Logout</span> </div>
          </div>
        )}
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
      </div>
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
            {/* 5. 替换旧按钮为新组件 */}
            <UserDropdown />
          </Space.Compact>
        </div>
      </Header>

      <Outlet />
    </Layout>
  );
};

export default MainLayout;