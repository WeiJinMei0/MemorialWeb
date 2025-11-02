import React, { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import './Login.css'
import useApp from "antd/es/app/useApp";

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('user')
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const { message } = useApp();

  const onFinish = async (values) => {
    setLoading(true)
    try {
      // 模拟登录API调用
      setTimeout(() => {
        // 从模拟数据库获取用户数据
        const existingUsers = JSON.parse(localStorage.getItem('mockUsersDatabase') || '[]');

        // 第一步：先只根据用户名/邮箱查找用户（不检查密码）
        const userByUsername = existingUsers.find(u =>
          u.username === values.username || u.email === values.username
        )

        // 如果用户不存在
        if (!userByUsername) {
          message.error(t('login.user_not_found'))
          setLoading(false)
          return
        }
        // 查找匹配的用户（支持用户名或邮箱登录）
        const user = existingUsers.find(u =>
          (u.username === values.username || u.email === values.username) &&
          u.password === values.password
        );


        if (user) {
          // 登录成功
          const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            type: userType,
            token: 'mock-jwt-token'
          }
          login(userData)
          message.success(t('login.success'))
          navigate('/designer')
        } else {
          // 登录失败
          message.error(t('login.password_incorrect'))

        }
      }, 1000)
    } catch (error) {
      message.error(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleUserTypeChange = () => {
    setUserType(userType === 'user' ? 'administrator' : 'user')
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
            className="password-with-switch"
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
            />
          </Form.Item>


          <div className="user-type-toggle-container">
            <div className="user-type-text">
              {userType === 'user' ? t('login.user') : t('login.admin')}
            </div>
            <div
              className="toggle-icon-wrapper"
              onClick={handleUserTypeChange}
            >
              <UserSwitchOutlined className="toggle-icon" />
            </div>
          </div>


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

        <div className="register-section">
          <p className="register-text">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="register-link">
              {t('login.Signup')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Login