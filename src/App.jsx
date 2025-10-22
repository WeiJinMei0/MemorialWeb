import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Auth/Login'
import DesignerPage from './components/Designer/DesignerPage'
import SavedDesignsPage from './components/Designer/SavedDesignsPage'
import OrderHistoryPage from './components/Designer/OrderHistoryPage'
import './App.css'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

const App = () => {

  return (
    <AuthProvider>
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
        <Route 
        path="/saved-designs" 
        element={
          <ProtectedRoute>
            <SavedDesignsPage />
          </ProtectedRoute>
        } 
        />
        <Route 
          path="/order-history" 
          element={
            <ProtectedRoute>
              <OrderHistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/designer" replace />} />
      </Routes>
    </div>
    </AuthProvider>
  )
}

export default App