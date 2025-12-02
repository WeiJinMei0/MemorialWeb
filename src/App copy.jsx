import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Login from './components/Auth/Login'
import DesignerPage from './components/Designer/DesignerPage'
import './App.css'

const App = () => {
  const { i18n } = useTranslation()
  
  // 检查用户是否已登录
  const isAuthenticated = () => {
    return localStorage.getItem('user') !== null
  }

  // 保护路由组件
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/designer" 
          element={
            <ProtectedRoute>
              <DesignerPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/designer" replace />} />
        <Route path="*" element={<Navigate to="/designer" replace />} />
      </Routes>
    </div>
  )
}

export default App