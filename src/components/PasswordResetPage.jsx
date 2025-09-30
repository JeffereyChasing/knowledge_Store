// components/PasswordResetPage.jsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AV from 'leancloud-storage';
import './PasswordResetPage.css';

const PasswordResetPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: '密码至少需要6位字符' });
      return;
    }

    setLoading(true);
    try {
      await AV.User.resetPasswordBySmsCode(token, formData.password);
      setMessage({ type: 'success', text: '密码重置成功！正在跳转到登录页面...' });
      setTimeout(() => {
        navigate('/');
        window.dispatchEvent(new CustomEvent('showAuthModal', { detail: { tab: 'login' } }));
      }, 2000);
    } catch (error) {
      console.error('密码重置失败:', error);
      setMessage({ type: 'error', text: `密码重置失败: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!token || !email) {
    return (
      <div className="password-reset-page">
        <div className="reset-container">
          <div className="reset-header">
            <h1>无效的重置链接</h1>
            <p>请检查您的重置链接是否正确，或重新请求密码重置。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-page">
      <div className="reset-container">
        <div className="reset-header">
          <h1>重置密码</h1>
          <p>为账户 {email} 设置新密码</p>
        </div>

        {message.text && (
          <div className={`reset-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="form-group">
            <label htmlFor="password">新密码</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="请输入新密码（至少6位）"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">确认新密码</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="请再次输入新密码"
              minLength={6}
              required
            />
          </div>

          <div className="password-strength">
            <div className="strength-bar">
              <div 
                className={`strength-fill ${
                  formData.password.length >= 6 ? 'strong' : 'weak'
                }`}
                style={{ 
                  width: `${Math.min((formData.password.length / 6) * 100, 100)}%` 
                }}
              ></div>
            </div>
            <div className="strength-text">
              {formData.password.length >= 6 ? '密码强度足够' : '密码至少需要6位'}
            </div>
          </div>

          <button 
            type="submit" 
            className="reset-button"
            disabled={loading}
          >
            {loading ? '重置中...' : '重置密码'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPage;