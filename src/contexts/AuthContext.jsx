import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的登录状态
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const register = async (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 模拟API函数
const mockLoginAPI = (email, password) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (email === 'admin@arbor.com' && password === 'admin') {
        resolve({
          success: true,
          user: { id: 1, name: 'Admin', email: 'admin@arbor.com', role: 'admin' },
          token: 'mock-jwt-token'
        });
      } else if (email === 'user@arbor.com' && password === 'user') {
        resolve({
          success: true,
          user: { id: 2, name: 'User', email: 'user@arbor.com', role: 'user' },
          token: 'mock-jwt-token'
        });
      } else {
        resolve({ success: false, error: 'Invalid credentials' });
      }
    }, 1000);
  });
};

const mockRegisterAPI = (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 1000);
  });
};