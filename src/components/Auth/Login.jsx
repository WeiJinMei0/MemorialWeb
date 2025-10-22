import React, { useState } from 'react'
import { Form, Input, Button, Card, Segmented, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import './Login.css'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('user')
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      // 模拟登录API调用（任务1：改为实际API调用，实际生产环境对密码采用加密传输）
      setTimeout(() => {
        const userData = {
          id: Date.now(),
          username: values.username,
          type: userType,
          token: 'mock-jwt-token'
        }
        login(userData)
        message.success(t('login.success'))
        navigate('/designer')
      }, 1000)
    } catch (error) {
      message.error(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <h1>{t('login.title')}</h1>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >

          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder={t('login.username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
            />
          </Form.Item>

          {/* （任务：修改登录界面的用户和管理员按钮样式：小圆性按钮） */}
          <Form.Item>
            <Segmented
              value={userType}
              onChange={setUserType}
              options={[
                {
                  label: t('login.user'),
                  value: 'user',
                },
                {
                  label: t('login.admin'),
                  value: 'admin',
                },
              ]}
              size="large"
              block
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              {t('login.login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login