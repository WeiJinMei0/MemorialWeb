import React, { useState } from 'react';
import { Form, Input, Button, Card, Segmented, message, Checkbox } from 'antd';
import { LockOutlined, MailOutlined, PhoneOutlined, IdcardOutlined } from '@ant-design/icons';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './Register.css';
import useApp from "antd/es/app/useApp";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('user');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { message } = useApp();

  const onFinish = async (values) => {
    setLoading(true);
    setTimeout(() => {
      try {
        const existingUsers = JSON.parse(localStorage.getItem('mockUsersDatabase') || '[]');
        const userExists = existingUsers.some(user =>
          user.username === values.username || user.email === values.email
        );
        //验证用户邮箱是否已存在
        if (userExists) {
          message.error(t('register.user_exists'));
          setLoading(false);
          return;
        }
        const newUser = {
          id: Date.now(), // 简单ID生成
          username: values.username,
          email: values.email,
          phone: values.phone,
          password: values.password,
          type: userType,
          agreeToTerms: values.agreeToTerms,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        existingUsers.push(newUser);
        localStorage.setItem('mockUsersDatabase', JSON.stringify(existingUsers));

        message.success(t('register.success'));
        navigate('/login', {
          state: {
            message: t('register.success_message'),
            username: newUser.username
          }
        });
      } catch (error) {
        message.error(error.message || t('register.error'));
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const validateConfirmPassword = ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue('password') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(t('register.confirmPassword_mismatch')));
    },
  });

  const validatePhoneNumber = (_, value) => {
    if (!value) {
      return Promise.resolve();
    }

    if (isValidPhoneNumber(value)) {
      return Promise.resolve();
    }

    return Promise.reject(new Error(t('register.phone_invalid')));
  };

  // 确保 return 语句在函数体内
  return (
    <div className="register-container">
      <Card className="register-card">
        <div className="register-header">
          <h1>{t('register.title')}</h1>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label={t('register.username')}
            rules={[
              {
                required: true,
                message: t('register.username_required')
              },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder={t('register.username_placeholder')}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('register.email')}
            rules={[
              {
                required: true,
                message: t('register.email_required')
              },
              {
                type: 'email',
                message: t('register.email_invalid')
              }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('register.email_placeholder')}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={t('register.phone')}
            rules={[
              {
                required: true,
                message: t('register.phone_required')
              },
              {
                validator: validatePhoneNumber
              }
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder={t('register.phone_placeholder')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('register.password')}
            rules={[
              {
                required: true,
                message: t('register.password_required')
              },
              {
                min: 8,
                message: t('register.password_too_short')
              },
              {
                max: 20,
                message: t('register.password_too_long')
              },
              //是否包含小写字母
              {
                pattern: /^(?=.*[a-z])/,
                message: t('register.password_lowercase_required')
              },
              // 检查是否包含大写字母
              {
                pattern: /^(?=.*[A-Z])/,
                message: t('register.password_uppercase_required')
              },
              // 检查是否包含数字
              {
                pattern: /^(?=.*\d)/,
                message: t('register.password_number_required')
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('register.password_placeholder')}
            />
          </Form.Item>

          <div className="password-hint">
            {t('register.password_hint')}
          </div>

          <Form.Item
            name="confirmPassword"
            label={t('register.confirmPassword')}
            dependencies={['password']}
            rules={[
              {
                required: true,
                message: t('register.confirmPassword_required')
              },
              validateConfirmPassword
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('register.confirmPassword_placeholder')}
            />
          </Form.Item>

          <Form.Item
            name="agreeToTerms"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error(t('register.must_agree_terms'))),
              },
            ]}
          >
            <Checkbox>
              {t('register.agree_terms')}
              <Link to="/terms" style={{ marginLeft: 4 }}>
                {t('register.terms_of_service')}
              </Link>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {t('register.submit')}
            </Button>
          </Form.Item>
        </Form>

        <div className="register-footer">
          {t('register.already_have_account')}
          <Link to="/login" style={{ marginLeft: 4 }}>
            {t('register.login_now')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;