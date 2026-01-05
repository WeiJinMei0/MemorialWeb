import React, { useState } from 'react'
import { Form, Input, Button, Card } from 'antd'
import { UserOutlined, LockOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
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
      await login({
        account: values.username,
        password: values.password,
      });

      message.success(t('login.success'));
      navigate('/designer');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        t('login.error');

      message.error(msg)
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