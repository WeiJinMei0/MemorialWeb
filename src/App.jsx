import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register'; // 确保 Register 被导入
import DesignerPage from './components/Designer/DesignerPage';
import SavedDesignsPage from './components/Designer/SavedDesignsPage';
import OrderHistoryPage from './components/Designer/OrderHistoryPage';
import MainLayout from './components/Layout/MainLayout';
import './App.css';
import 'antd/dist/reset.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return null; 
  }

  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          {/* 公共路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 受保护的布局路由 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* 所有受保护的页面都在这里作为子路由 */}
            <Route index element={<Navigate to="/designer" replace />} />
            <Route path="designer" element={<DesignerPage />} />
            <Route path="saved-designs" element={<SavedDesignsPage />} />
            <Route path="order-history" element={<OrderHistoryPage />} />
          </Route>

          {/* 移除所有其他冲突的路由 */}

        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;