// components/UserSettingsModal.jsx (更新版本)
import React, { useState, useEffect } from 'react';
import AV from 'leancloud-storage';
import './UserSettingsModal.css';

const UserSettingsModal = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // 表单状态
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    nickname: '',
    bio: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferencesForm, setPreferencesForm] = useState({
    theme: 'light',
    language: 'zh-CN',
    notifications: true,
    emailUpdates: false
  });

  const [securityForm, setSecurityForm] = useState({
    emailVerified: false
  });

  useEffect(() => {
    if (isOpen) {
      const user = AV.User.current();
      setCurrentUser(user);
      if (user) {
        loadUserData(user);
      }
    }
  }, [isOpen]);

  const loadUserData = (user) => {
    setProfileForm({
      username: user.getUsername() || '',
      email: user.getEmail() || '',
      nickname: user.get('nickname') || '',
      bio: user.get('bio') || ''
    });

    setPreferencesForm({
      theme: user.get('theme') || 'light',
      language: user.get('language') || 'zh-CN',
      notifications: user.get('notifications') !== false,
      emailUpdates: user.get('emailUpdates') || false
    });

    setSecurityForm({
      emailVerified: user.get('emailVerified') || false
    });

    // 加载用户头像
    const avatar = user.get('avatar');
    if (avatar) {
      setAvatarPreview(avatar.get('url'));
    }
  };

  const showMessage = (type, text, duration = 3000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), duration);
  };

  // 头像上传处理
  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      showMessage('error', '请选择图片文件');
      return;
    }

    // 检查文件大小 (限制 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showMessage('error', '图片大小不能超过 2MB');
      return;
    }

    setAvatarFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async () => {
    if (!avatarFile || !currentUser) return;

    setSaving(true);
    try {
      // 创建 LeanCloud 文件对象
      const avFile = new AV.File(avatarFile.name, avatarFile);
      await avFile.save();

      // 更新用户头像
      currentUser.set('avatar', avFile);
      await currentUser.save();

      showMessage('success', '头像上传成功！');
    } catch (error) {
      console.error('头像上传失败:', error);
      showMessage('error', `头像上传失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      if (profileForm.nickname !== currentUser.get('nickname')) {
        currentUser.set('nickname', profileForm.nickname);
      }
      
      if (profileForm.bio !== currentUser.get('bio')) {
        currentUser.set('bio', profileForm.bio);
      }

      await currentUser.save();
      showMessage('success', '个人信息更新成功！');
    } catch (error) {
      console.error('更新个人信息失败:', error);
      showMessage('error', `更新失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', '新密码和确认密码不一致');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showMessage('error', '新密码至少需要6位字符');
      return;
    }

    setSaving(true);
    try {
      await currentUser.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      showMessage('success', '密码修改成功！');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('修改密码失败:', error);
      showMessage('error', `密码修改失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      currentUser.set('theme', preferencesForm.theme);
      currentUser.set('language', preferencesForm.language);
      currentUser.set('notifications', preferencesForm.notifications);
      currentUser.set('emailUpdates', preferencesForm.emailUpdates);

      await currentUser.save();
      showMessage('success', '偏好设置更新成功！');
    } catch (error) {
      console.error('更新偏好设置失败:', error);
      showMessage('error', `更新失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 邮箱验证
  const handleEmailVerification = async () => {
    if (!currentUser || !currentUser.getEmail()) {
      showMessage('error', '请先设置邮箱地址');
      return;
    }

    setLoading(true);
    try {
      await AV.User.requestEmailVerify(currentUser.getEmail());
      showMessage('success', '验证邮件已发送，请检查您的邮箱');
    } catch (error) {
      console.error('发送验证邮件失败:', error);
      showMessage('error', `发送验证邮件失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 密码重置
  const handlePasswordReset = async () => {
    if (!currentUser || !currentUser.getEmail()) {
      showMessage('error', '请先设置邮箱地址');
      return;
    }

    setLoading(true);
    try {
      await AV.User.requestPasswordReset(currentUser.getEmail());
      showMessage('success', '密码重置邮件已发送，请检查您的邮箱');
    } catch (error) {
      console.error('发送重置邮件失败:', error);
      showMessage('error', `发送重置邮件失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 数据导出
  const handleDataExport = async () => {
    setLoading(true);
    try {
      // 获取用户的所有数据
      const [categories, questions] = await Promise.all([
        // 获取分类数据
        new AV.Query('Category')
          .equalTo('createdBy', currentUser)
          .find(),
        // 获取题目数据
        new AV.Query('Question')
          .equalTo('createdBy', currentUser)
          .include('category')
          .find()
      ]);

      const exportData = {
        exportTime: new Date().toISOString(),
        user: {
          username: currentUser.getUsername(),
          email: currentUser.getEmail(),
          nickname: currentUser.get('nickname')
        },
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.get('name'),
          description: cat.get('description'),
          questionCount: cat.get('questionCount') || 0,
          createdAt: cat.get('createdAt'),
          updatedAt: cat.get('updatedAt')
        })),
        questions: questions.map(q => ({
          id: q.id,
          title: q.get('title'),
          detailedAnswer: q.get('detailedAnswer'),
          oralAnswer: q.get('oralAnswer'),
          code: q.get('code'),
          difficulty: q.get('difficulty'),
          proficiency: q.get('proficiency'),
          appearanceLevel: q.get('appearanceLevel'),
          tags: q.get('tags') || [],
          category: q.get('category') ? {
            id: q.get('category').id,
            name: q.get('category').get('name')
          } : null,
          createdAt: q.get('createdAt'),
          updatedAt: q.get('updatedAt')
        }))
      };

      // 创建下载链接
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `knowledge-base-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage('success', '数据导出成功！');
    } catch (error) {
      console.error('数据导出失败:', error);
      showMessage('error', `数据导出失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (formType, field, value) => {
    switch (formType) {
      case 'profile':
        setProfileForm(prev => ({ ...prev, [field]: value }));
        break;
      case 'password':
        setPasswordForm(prev => ({ ...prev, [field]: value }));
        break;
      case 'preferences':
        setPreferencesForm(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-settings-overlay">
      <div className="user-settings-modal">
        {/* 头部 */}
        <div className="settings-header">
          <div className="header-content">
            <h2>账户设置</h2>
            <p>管理您的账户信息和偏好设置</p>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        {/* 消息提示 */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-content">
          {/* 侧边栏导航 */}
          <div className="settings-sidebar">
            <button 
              className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="item-icon">👤</span>
              <span className="item-text">个人信息</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span className="item-icon">🔒</span>
              <span className="item-text">安全设置</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <span className="item-icon">⚙️</span>
              <span className="item-text">偏好设置</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <span className="item-icon">💾</span>
              <span className="item-text">数据管理</span>
            </button>
          </div>

          {/* 主要内容区域 */}
          <div className="settings-main">
            {activeTab === 'profile' && (
              <div className="tab-content">
                <h3>个人信息</h3>
                
                {/* 头像上传区域 */}
                <div className="avatar-section">
                  <div className="avatar-upload">
                    <div className="avatar-preview">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="头像预览" />
                      ) : (
                        <div className="avatar-placeholder">
                          {profileForm.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="avatar-controls">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="avatar-input"
                      />
                      <label htmlFor="avatar-upload" className="avatar-upload-btn">
                        选择图片
                      </label>
                      {avatarFile && (
                        <button 
                          className="avatar-save-btn"
                          onClick={handleAvatarSave}
                          disabled={saving}
                        >
                          {saving ? '上传中...' : '保存头像'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="avatar-hint">
                    支持 JPG、PNG 格式，大小不超过 2MB
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="settings-form">
                  <div className="form-group">
                    <label>用户名</label>
                    <input
                      type="text"
                      value={profileForm.username}
                      disabled
                      className="disabled-input"
                    />
                    <div className="field-hint">用户名创建后不可修改</div>
                  </div>

                  <div className="form-group">
                    <label>邮箱地址</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="disabled-input"
                    />
                    <div className="field-hint">
                      {profileForm.email ? '邮箱已验证' : '未设置邮箱'}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>昵称</label>
                    <input
                      type="text"
                      value={profileForm.nickname}
                      onChange={(e) => handleInputChange('profile', 'nickname', e.target.value)}
                      placeholder="请输入您的昵称"
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label>个人简介</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                      placeholder="介绍一下您自己..."
                      rows="3"
                      maxLength={200}
                    />
                    <div className="char-count">
                      {profileForm.bio.length}/200
                    </div>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="save-button"
                      disabled={saving}
                    >
                      {saving ? '保存中...' : '保存更改'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="tab-content">
                <h3>安全设置</h3>
                
                {/* 邮箱验证 */}
                <div className="security-section">
                  <h4>邮箱验证</h4>
                  <div className="security-item">
                    <div className="security-info">
                      <span className="security-label">邮箱状态</span>
                      <span className={`security-status ${securityForm.emailVerified ? 'verified' : 'unverified'}`}>
                        {securityForm.emailVerified ? '已验证' : '未验证'}
                      </span>
                    </div>
                    {!securityForm.emailVerified && (
                      <button 
                        className="security-action-btn"
                        onClick={handleEmailVerification}
                        disabled={loading || !profileForm.email}
                      >
                        {loading ? '发送中...' : '发送验证邮件'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 密码修改 */}
                <div className="security-section">
                  <h4>修改密码</h4>
                  <form onSubmit={handlePasswordChange} className="settings-form">
                    <div className="form-group">
                      <label>当前密码</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => handleInputChange('password', 'currentPassword', e.target.value)}
                        placeholder="请输入当前密码"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>新密码</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => handleInputChange('password', 'newPassword', e.target.value)}
                        placeholder="请输入新密码（至少6位）"
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>确认新密码</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => handleInputChange('password', 'confirmPassword', e.target.value)}
                        placeholder="请再次输入新密码"
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="password-strength">
                      <div className="strength-bar">
                        <div 
                          className={`strength-fill ${
                            passwordForm.newPassword.length >= 6 ? 'strong' : 'weak'
                          }`}
                          style={{ 
                            width: `${Math.min((passwordForm.newPassword.length / 6) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="strength-text">
                        {passwordForm.newPassword.length >= 6 ? '密码强度足够' : '密码至少需要6位'}
                      </div>
                    </div>

                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="save-button"
                        disabled={saving}
                      >
                        {saving ? '更新中...' : '修改密码'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 密码重置 */}
                <div className="security-section">
                  <h4>密码重置</h4>
                  <div className="security-item">
                    <div className="security-info">
                      <span className="security-label">忘记密码？</span>
                      <span className="security-description">
                        通过邮箱重置您的密码
                      </span>
                    </div>
                    <button 
                      className="security-action-btn secondary"
                      onClick={handlePasswordReset}
                      disabled={loading || !profileForm.email}
                    >
                      {loading ? '发送中...' : '发送重置邮件'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="tab-content">
                <h3>偏好设置</h3>
                <form onSubmit={handlePreferencesUpdate} className="settings-form">
                  {/* 原有的偏好设置表单保持不变 */}
                  <div className="form-group">
                    <label>主题模式</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={preferencesForm.theme === 'light'}
                          onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
                        />
                        <span className="radio-label">
                          <span className="radio-icon">🌞</span>
                          浅色模式
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={preferencesForm.theme === 'dark'}
                          onChange={(e) => handleInputChange('preferences', 'theme', e.target.value)}
                        />
                        <span className="radio-label">
                          <span className="radio-icon">🌙</span>
                          深色模式
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>语言</label>
                    <select
                      value={preferencesForm.language}
                      onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>通知设置</label>
                    <div className="switch-group">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications}
                          onChange={(e) => handleInputChange('preferences', 'notifications', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className="switch-label">
                        启用浏览器通知
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>邮件更新</label>
                    <div className="switch-group">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={preferencesForm.emailUpdates}
                          onChange={(e) => handleInputChange('preferences', 'emailUpdates', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className="switch-label">
                        接收产品更新邮件
                      </span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="save-button"
                      disabled={saving}
                    >
                      {saving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="tab-content">
                <h3>数据管理</h3>
                
                {/* 数据导出 */}
                <div className="data-section">
                  <h4>数据导出</h4>
                  <div className="data-item">
                    <div className="data-info">
                      <span className="data-label">导出学习数据</span>
                      <span className="data-description">
                        导出您的所有分类和题目数据为 JSON 格式
                      </span>
                    </div>
                    <button 
                      className="data-action-btn"
                      onClick={handleDataExport}
                      disabled={loading}
                    >
                      {loading ? '导出中...' : '导出数据'}
                    </button>
                  </div>
                </div>

                {/* 数据统计 */}
                <div className="data-section">
                  <h4>学习统计</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">📚</div>
                      <div className="stat-content">
                        <div className="stat-number">0</div>
                        <div className="stat-label">总分类数</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">❓</div>
                      <div className="stat-content">
                        <div className="stat-number">0</div>
                        <div className="stat-label">总题目数</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">📅</div>
                      <div className="stat-content">
                        <div className="stat-number">0</div>
                        <div className="stat-label">学习天数</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">⚡</div>
                      <div className="stat-content">
                        <div className="stat-number">0</div>
                        <div className="stat-label">日均题目</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 数据清理 */}
                <div className="data-section">
                  <h4>数据清理</h4>
                  <div className="data-item danger">
                    <div className="data-info">
                      <span className="data-label">删除账户数据</span>
                      <span className="data-description">
                        永久删除您的所有学习数据，此操作不可撤销
                      </span>
                    </div>
                    <button 
                      className="data-action-btn danger"
                      disabled
                    >
                      即将开放
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;