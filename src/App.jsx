import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import DesignerPage from './components/Designer/DesignerPage';
import SavedDesignsPage from './components/Designer/SavedDesignsPage';
import OrderHistoryPage from './components/Designer/OrderHistoryPage';
import MainLayout from './components/Layout/MainLayout'; // 1. 导入新的布局组件
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* 2. 创建一个受保护的父路由，使用 MainLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* 3. 将原来的页面作为子路由 */}
            <Route index element={<Navigate to="/designer" replace />} /> {/* 默认重定向到 designer */}
            <Route path="designer" element={<DesignerPage />} />
            <Route path="saved-designs" element={<SavedDesignsPage />} />
            <Route path="order-history" element={<OrderHistoryPage />} />
          </Route>

        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;