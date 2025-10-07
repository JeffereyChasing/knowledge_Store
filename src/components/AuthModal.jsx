// components/AuthModal.jsx
import React, { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { WechatAuthService } from '../services/wechatAuthService';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login', onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState({
    loginUsername: '',
    loginPassword: '',
    registerUsername: '',
    registerEmail: '',
    registerPassword: '',
    registerConfirmPassword: ''
  });
  const [isWechatLoading, setIsWechatLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setFormData({
        loginUsername: '',
        loginPassword: '',
        registerUsername: '',
        registerEmail: '',
        registerPassword: '',
        registerConfirmPassword: ''
      });
    }
  }, [isOpen, defaultTab]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await UserService.login(formData.loginUsername, formData.loginPassword);
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      alert(`登录失败: ${error.message}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.registerPassword !== formData.registerConfirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    try {
      await UserService.register(
        formData.registerUsername,
        formData.registerPassword,
        formData.registerEmail
      );
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      alert(`注册失败: ${error.message}`);
    }
  };

  const handleWechatLogin = async () => {
    setIsWechatLoading(true);
    try {
      await WechatAuthService.wechatLogin();
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      alert(`微信登录失败: ${error.message}`);
    } finally {
      setIsWechatLoading(false);
    }
  };

  const handleWechatQRLogin = async () => {
    setIsWechatLoading(true);
    try {
      await WechatAuthService.wechatQRLogin();
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      alert(`微信扫码登录失败: ${error.message}`);
    } finally {
      setIsWechatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal" onClick={onClose}>
      <div className="auth-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <h3>{activeTab === 'login' ? '用户登录' : '用户注册'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            登录
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            注册
          </button>
        </div>

        {/* 第三方登录选项 
        <div className="social-auth-section">
          <div className="social-auth-buttons">
            <button 
              className="social-auth-btn wechat-btn"
              onClick={handleWechatLogin}
              disabled={isWechatLoading}
            >
              <span className="social-icon">💬</span>
              <span className="social-text">
                {isWechatLoading ? '登录中...' : '微信登录'}
              </span>
            </button>
            
            <button 
              className="social-auth-btn wechat-qr-btn"
              onClick={handleWechatQRLogin}
              disabled={isWechatLoading}
            >
              <span className="social-icon">📱</span>
              <span className="social-text">
                {isWechatLoading ? '加载中...' : '微信扫码登录'}
              </span>
            </button>
          </div>
          
          <div className="divider">
            <span>或</span>
          </div>
        </div>
*/}
        {/* 登录表单 */}
        <form 
          className={`auth-form ${activeTab === 'login' ? 'active' : ''}`}
          onSubmit={handleLogin}
        >
          <div className="form-group">
            <label htmlFor="loginUsername">用户名</label>
            <input 
              type="text" 
              id="loginUsername" 
              value={formData.loginUsername}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="loginPassword">密码</label>
            <input 
              type="password" 
              id="loginPassword" 
              value={formData.loginPassword}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <button type="submit" className="auth-btn primary">登录</button>
        </form>

        {/* 注册表单 */}
        <form 
          className={`auth-form ${activeTab === 'register' ? 'active' : ''}`}
          onSubmit={handleRegister}
        >
          <div className="form-group">
            <label htmlFor="registerUsername">用户名</label>
            <input 
              type="text" 
              id="registerUsername" 
              value={formData.registerUsername}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="registerEmail">邮箱</label>
            <input 
              type="email" 
              id="registerEmail" 
              value={formData.registerEmail}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="registerPassword">密码</label>
            <input 
              type="password" 
              id="registerPassword" 
              value={formData.registerPassword}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="registerConfirmPassword">确认密码</label>
            <input 
              type="password" 
              id="registerConfirmPassword" 
              value={formData.registerConfirmPassword}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <button type="submit" className="auth-btn secondary">注册</button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;