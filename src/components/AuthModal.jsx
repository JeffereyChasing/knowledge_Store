// components/AuthModal.jsx
import React, { useState, useEffect } from 'react';
import { UserService, UserServiceError } from '../services/userService';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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
      setFormErrors({});
    }
  }, [isOpen, defaultTab]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // 清除该字段的错误信息
    if (formErrors[id]) {
      setFormErrors(prev => ({
        ...prev,
        [id]: ''
      }));
    }
  };

  const showErrorToast = (message) => {
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: { 
        message, 
        type: 'error',
        duration: 5000
      }
    }));
  };

  const showSuccessToast = (message) => {
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: { 
        message, 
        type: 'success',
        duration: 3000
      }
    }));
  };

  const validateLoginForm = () => {
    const errors = {};
    
    if (!formData.loginUsername.trim()) {
      errors.loginUsername = '请输入用户名';
    }
    
    if (!formData.loginPassword) {
      errors.loginPassword = '请输入密码';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegisterForm = () => {
    const errors = {};
    
    if (!formData.registerUsername.trim()) {
      errors.registerUsername = '请输入用户名';
    } else if (formData.registerUsername.trim().length < 3) {
      errors.registerUsername = '用户名至少需要3个字符';
    }
    
    if (!formData.registerEmail.trim()) {
      errors.registerEmail = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.registerEmail)) {
      errors.registerEmail = '请输入有效的邮箱地址';
    }
    
    if (!formData.registerPassword) {
      errors.registerPassword = '请输入密码';
    } else if (formData.registerPassword.length < 6) {
      errors.registerPassword = '密码至少需要6个字符';
    }
    
    if (!formData.registerConfirmPassword) {
      errors.registerConfirmPassword = '请确认密码';
    } else if (formData.registerPassword !== formData.registerConfirmPassword) {
      errors.registerConfirmPassword = '两次输入的密码不一致';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

 // 在 AuthModal.jsx 的 handleLogin 函数中，更新错误处理部分：
const handleLogin = async (e) => {
  e.preventDefault();
  
  if (!validateLoginForm()) {
    return;
  }

  setIsSubmitting(true);
  try {
    const result = await UserService.login(formData.loginUsername, formData.loginPassword);
    
    showSuccessToast(result.message || '登录成功！');
    
    if (onAuthSuccess) onAuthSuccess();
    onClose();
  } catch (error) {
    console.error('登录失败:', error);
    
    if (error instanceof UserServiceError) {
      showErrorToast(error.message);
    } else {
      // 对于非 UserServiceError，显示通用错误信息
      showErrorToast('登录失败，请检查网络连接后重试');
    }
  } finally {
    setIsSubmitting(false);
  }
};
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await UserService.register(
        formData.registerUsername,
        formData.registerPassword,
        formData.registerEmail
      );
      
      showSuccessToast(result.message || '注册成功！');
      
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      console.error('注册失败:', error);
      
      if (error instanceof UserServiceError) {
        showErrorToast(error.message);
      } else {
        showErrorToast('注册失败，请稍后重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWechatLogin = async () => {
    setIsWechatLoading(true);
    try {
      await WechatAuthService.wechatLogin();
      showSuccessToast('微信登录成功！');
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      console.error('微信登录失败:', error);
      showErrorToast('微信登录失败，请重试');
    } finally {
      setIsWechatLoading(false);
    }
  };

  const handleWechatQRLogin = async () => {
    setIsWechatLoading(true);
    try {
      await WechatAuthService.wechatQRLogin();
      showSuccessToast('微信扫码登录成功！');
      if (onAuthSuccess) onAuthSuccess();
      onClose();
    } catch (error) {
      console.error('微信扫码登录失败:', error);
      showErrorToast('微信扫码登录失败，请重试');
    } finally {
      setIsWechatLoading(false);
    }
  };

  const clearFormErrors = () => {
    setFormErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 装饰背景 */}
        <div className="modal-background">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
          <div className="bg-shape shape-3"></div>
        </div>
        
        <div className="auth-modal-content">
          {/* 头部 */}
          <div className="auth-modal-header">
            <div className="header-content">
              <h2 className="modal-title">
                {activeTab === 'login' ? '欢迎回来' : '加入我们'}
              </h2>
              <p className="modal-subtitle">
                {activeTab === 'login' 
                  ? '登录您的账号继续学习之旅' 
                  : '创建账号开启编程学习体验'
                }
              </p>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <span className="close-icon">×</span>
            </button>
          </div>

          {/* 标签切换 */}
          <div className="auth-tab-navigation">
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('login');
                  clearFormErrors();
                }}
              >
                <span className="tab-icon">🔐</span>
                <span className="tab-text">登录</span>
              </button>
              <button 
                className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register');
                  clearFormErrors();
                }}
              >
                <span className="tab-icon">✨</span>
                <span className="tab-text">注册</span>
              </button>
            </div>
            <div className="tab-indicator"></div>
          </div>

          {/* 表单区域 */}
          <div className="auth-forms-container">
            {/* 登录表单 */}
            <form 
              className={`auth-form login-form ${activeTab === 'login' ? 'active' : ''}`}
              onSubmit={handleLogin}
            >
              <div className="form-fields">
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="text" 
                      id="loginUsername"
                      className={`form-input ${formErrors.loginUsername ? 'error' : ''}`}
                      value={formData.loginUsername}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="loginUsername" className="form-label">
                      <span className="label-icon">👤</span>
                      用户名
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.loginUsername && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.loginUsername}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="password" 
                      id="loginPassword"
                      className={`form-input ${formErrors.loginPassword ? 'error' : ''}`}
                      value={formData.loginPassword}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="loginPassword" className="form-label">
                      <span className="label-icon">🔒</span>
                      密码
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.loginPassword && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.loginPassword}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                type="submit" 
                className={`submit-btn primary ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner"></span>
                    登录中...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🚀</span>
                    立即登录
                  </>
                )}
              </button>
            </form>

            {/* 注册表单 */}
            <form 
              className={`auth-form register-form ${activeTab === 'register' ? 'active' : ''}`}
              onSubmit={handleRegister}
            >
              <div className="form-fields">
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="text" 
                      id="registerUsername"
                      className={`form-input ${formErrors.registerUsername ? 'error' : ''}`}
                      value={formData.registerUsername}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="registerUsername" className="form-label">
                      <span className="label-icon">👤</span>
                      用户名
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.registerUsername && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.registerUsername}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="email" 
                      id="registerEmail"
                      className={`form-input ${formErrors.registerEmail ? 'error' : ''}`}
                      value={formData.registerEmail}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="registerEmail" className="form-label">
                      <span className="label-icon">📧</span>
                      邮箱地址
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.registerEmail && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.registerEmail}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="password" 
                      id="registerPassword"
                      className={`form-input ${formErrors.registerPassword ? 'error' : ''}`}
                      value={formData.registerPassword}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="registerPassword" className="form-label">
                      <span className="label-icon">🔑</span>
                      设置密码
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.registerPassword && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.registerPassword}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <div className="input-container">
                    <input 
                      type="password" 
                      id="registerConfirmPassword"
                      className={`form-input ${formErrors.registerConfirmPassword ? 'error' : ''}`}
                      value={formData.registerConfirmPassword}
                      onChange={handleInputChange}
                      placeholder=" "
                      required 
                    />
                    <label htmlFor="registerConfirmPassword" className="form-label">
                      <span className="label-icon">✅</span>
                      确认密码
                    </label>
                    <div className="input-underline"></div>
                  </div>
                  {formErrors.registerConfirmPassword && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {formErrors.registerConfirmPassword}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                type="submit" 
                className={`submit-btn secondary ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner"></span>
                    注册中...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🎉</span>
                    创建账号
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 第三方登录 
          <div className="social-auth-section">
            <div className="section-divider">
              <span className="divider-text">或使用以下方式</span>
            </div>
            
            <div className="social-buttons">
              <button 
                className="social-btn wechat"
                onClick={handleWechatLogin}
                disabled={isWechatLoading}
              >
                <span className="social-icon">💬</span>
                <span className="social-text">
                  {isWechatLoading ? '授权中...' : '微信登录'}
                </span>
              </button>
              
              <button 
                className="social-btn wechat-qr"
                onClick={handleWechatQRLogin}
                disabled={isWechatLoading}
              >
                <span className="social-icon">📱</span>
                <span className="social-text">
                  {isWechatLoading ? '加载中...' : '扫码登录'}
                </span>
              </button>
            </div>
          </div>
          */}

          {/* 底部链接 */}
          <div className="auth-footer">
            <p className="footer-text">
              {activeTab === 'login' ? '还没有账号？' : '已有账号？'}
              <button 
                className="footer-link"
                onClick={() => {
                  setActiveTab(activeTab === 'login' ? 'register' : 'login');
                  clearFormErrors();
                }}
              >
                {activeTab === 'login' ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;