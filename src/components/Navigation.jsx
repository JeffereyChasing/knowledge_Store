// components/Navigation.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AV from 'leancloud-storage';
import './Navigation.css';

const Navigation = ({ onShowAuthModal }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // 检查用户登录状态
  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
  }, []);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 添加头像更新事件监听
  useEffect(() => {
    const handleAvatarUpdate = async () => {
      //('收到头像更新事件，重新加载用户数据');
      const user = AV.User.current();
      if (user) {
        try {
          const freshUser = await user.fetch();
          setCurrentUser(freshUser);
        } catch (error) {
          console.error('重新加载用户数据失败:', error);
        }
      }
    };

    window.addEventListener('userAvatarUpdated', handleAvatarUpdate);
    
    return () => {
      window.removeEventListener('userAvatarUpdated', handleAvatarUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AV.User.logOut();
      setCurrentUser(null);
      setShowUserMenu(false);
      window.location.reload();
    } catch (error) {
      console.error('退出失败:', error);
      alert('退出失败，请重试');
    }
  };

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  // 检查是否为特定邮箱用户
  const isAuthorizedEmail = () => {
    if (!currentUser) return false;
    const userEmail = currentUser.getEmail();
    return userEmail === 'wu1149823510@outlook.com';
  };

  // 优化的头像组件 - 支持缓存清除和完全覆盖
  const UserAvatar = ({ user, size = 'normal' }) => {
    const avatar = user.get('avatar');
    const fallbackText = user.getUsername()?.charAt(0).toUpperCase();
    
    // 添加时间戳避免缓存
    const getAvatarUrl = () => {
      if (!avatar) return null;
      
      if (typeof avatar === 'string') {
        const timestamp = new Date().getTime();
        return `${avatar}?t=${timestamp}`;
      } else if (typeof avatar.get === 'function') {
        return avatar.get('url');
      }
      return null;
    };
    
    const avatarUrl = getAvatarUrl();
    
    return (
      <div className={`user-avatar ${size === 'large' ? 'user-avatar-large' : ''}`}>
        {avatarUrl ? (
          <>
            <img 
              src={avatarUrl} 
              alt="用户头像"
              onError={(e) => {
                console.error('❌ Navigation 头像加载失败:', avatarUrl);
                e.target.style.display = 'none';
                // 显示占位符
                const fallback = e.target.nextSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
            <div 
              className={`avatar-fallback ${size === 'large' ? 'avatar-fallback-large' : ''}`}
              style={{ display: 'none' }}
            >
              {fallbackText}
            </div>
          </>
        ) : (
          <div className={`avatar-fallback ${size === 'large' ? 'avatar-fallback-large' : ''}`}>
            {fallbackText}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="modern-nav">
      <div className="nav-container">
        {/* 左侧导航链接 */}
        <div className="nav-left">
          <Link to="/" className="nav-brand">
            <span className="brand-icon">📚</span>
            <span className="brand-text">知识题库</span>
          </Link>
          
          <div className="nav-links">
            <Link to="/" className="nav-link">
              <span className="link-icon">🏠</span>
              首页
            </Link>
            {/* 只有特定邮箱用户才能看到初始化数据库选项 */}
            {currentUser && isAuthorizedEmail() && (
              <Link to="/init" className="nav-link">
                <span className="link-icon">⚙️</span>
                初始化数据库
              </Link>
            )}
          </div>
        </div>

        {/* 右侧用户区域 */}
        <div className="nav-right">
          {currentUser ? (
            <div className="user-section" ref={userMenuRef}>
              <button 
                className="user-menu-trigger"
                onClick={handleUserMenuToggle}
              >
                <UserAvatar user={currentUser} />
                <span className="user-name">{currentUser.getUsername()}</span>
                {isAuthorizedEmail() && (
                  <span className="admin-badge" title="管理员">⚡</span>
                )}
                <span className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`}>
                  ▼
                </span>
              </button>

              {/* 用户下拉菜单 */}
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="user-info-card">
                      <UserAvatar user={currentUser} size="large" />
                      <div className="user-details">
                        <div className="user-display-name">
                          {currentUser.get('nickname') || currentUser.getUsername()}
                          {isAuthorizedEmail() && (
                            <span className="admin-tag">管理员</span>
                          )}
                        </div>
                        <div className="user-email">
                          {currentUser.getEmail() || '未设置邮箱'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-items">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.dispatchEvent(new CustomEvent('showUserSettings'));
                      }}
                    >
                      <span className="item-icon">👤</span>
                      <span className="item-text">账户设置</span>
                    </button>

                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.dispatchEvent(new CustomEvent('showUserSettings', { 
                          detail: { tab: 'stats' } 
                        }));
                      }}
                    >
                      <span className="item-icon">📊</span>
                      <span className="item-text">学习统计</span>
                    </button>

                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.dispatchEvent(new CustomEvent('showUserSettings', { 
                          detail: { tab: 'preferences' } 
                        }));
                      }}
                    >
                      <span className="item-icon">🔔</span>
                      <span className="item-text">通知设置</span>
                    </button>
                  </div>

                  {/* 管理员专属功能区域 */}
                  {isAuthorizedEmail() && (
                    <>
                      <div className="dropdown-divider"></div>
                      <div className="dropdown-section">
                        <div className="section-label">管理员功能</div>
                        <div className="dropdown-items">
                          <Link 
                            to="/init" 
                            className="dropdown-item"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <span className="item-icon">⚙️</span>
                            <span className="item-text">初始化数据库</span>
                          </Link>
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              setShowUserMenu(false);
                              //('管理员功能');
                            }}
                          >
                            <span className="item-icon">🔧</span>
                            <span className="item-text">系统管理</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-items">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.open('/help', '_blank');
                      }}
                    >
                      <span className="item-icon">❓</span>
                      <span className="item-text">帮助文档</span>
                    </button>

                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        window.open('mailto:support@example.com', '_blank');
                      }}
                    >
                      <span className="item-icon">💬</span>
                      <span className="item-text">意见反馈</span>
                    </button>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-items">
                    <button 
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <span className="item-icon">🚪</span>
                      <span className="item-text">退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="auth-btn login-btn"
                onClick={() => onShowAuthModal('login')}
              >
                登录
              </button>
              <button 
                className="auth-btn login-btn"
                onClick={() => onShowAuthModal('register')}
              >
                注册
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;