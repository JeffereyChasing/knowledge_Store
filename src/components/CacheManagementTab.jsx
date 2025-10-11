// components/CacheManagementTab.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import { offlineService } from '../services/offlineService';
import './CacheManagementTab.css';

// 防抖钩子
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// 节流钩子
const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);
  
  return throttledValue;
};

const CacheManagementTab = ({ 
  questions = [], 
  onCacheUpdate,
  currentUser 
}) => {
  const navigate = useNavigate();
  
  // 状态管理
  const [cacheStatus, setCacheStatus] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cacheSettings, setCacheSettings] = useState({
    cacheLimit: 30,
    autoCache: true,
    cacheStrategy: 'recent'
  });
  const [tempCacheLimit, setTempCacheLimit] = useState(30);
  const [showSettings, setShowSettings] = useState(false);

  // 防抖和节流
  const debouncedCacheLimit = useDebounce(tempCacheLimit, 300);
  const throttledCacheLimit = useThrottle(tempCacheLimit, 100);

  // 初始化
  useEffect(() => {
    const status = cacheService.getCacheStatus();
    setCacheStatus(status);
    setCacheSettings(prev => ({
      ...prev,
      cacheLimit: cacheService.getCacheLimit()
    }));
    setTempCacheLimit(cacheService.getCacheLimit());
    
    // 网络状态监听
    setIsOnline(offlineService.isOnlineMode());
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    offlineService.addEventListener('online', handleOnline);
    offlineService.addEventListener('offline', handleOffline);
    
    return () => {
      offlineService.removeEventListener('online', handleOnline);
      offlineService.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 防抖更新设置
  useEffect(() => {
    if (debouncedCacheLimit !== cacheSettings.cacheLimit) {
      setCacheSettings(prev => ({
        ...prev,
        cacheLimit: debouncedCacheLimit
      }));
      cacheService.setCacheLimit(debouncedCacheLimit);
    }
  }, [debouncedCacheLimit, cacheSettings.cacheLimit]);

  // 手动缓存题目
  const handleManualCache = useCallback(async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    setSyncing(true);
    try {
      const success = await cacheService.cacheQuestions(questions);
      if (success) {
        const newStatus = cacheService.getCacheStatus();
        setCacheStatus(newStatus);
        onCacheUpdate?.(newStatus);
        
        // 显示成功消息
        setTimeout(() => {
          // 可以添加 Toast 通知
        }, 100);
      }
    } catch (error) {
      console.error('缓存失败:', error);
    } finally {
      setSyncing(false);
    }
  }, [currentUser, questions, onCacheUpdate]);

  // 清理缓存
  const handleClearCache = useCallback(() => {
    cacheService.clearCache();
    const newStatus = cacheService.getCacheStatus();
    setCacheStatus(newStatus);
    onCacheUpdate?.(newStatus);
  }, [onCacheUpdate]);

  // 滑块变化处理
  const handleSliderChange = useCallback((value) => {
    setTempCacheLimit(value);
  }, []);

  // 缓存设置模态框
  const CacheSettingsModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>⚙️ 缓存设置</h3>
          <button
            className="close-btn"
            onClick={() => setShowSettings(false)}
          >
            ×
          </button>
        </div>

        <div className="cache-settings-form">
          <div className="form-group">
            <label htmlFor="cacheLimit">
              缓存题目数量: <span className="limit-value">{throttledCacheLimit}</span> 题
            </label>
            
            <div className="slider-container">
              <input
                id="cacheLimit"
                type="range"
                min="10"
                max="100"
                step="10"
                value={tempCacheLimit}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  handleSliderChange(value);
                }}
                onInput={(e) => {
                  const value = parseInt(e.target.value);
                  const progress = ((value - 10) / 90) * 100;
                  e.target.style.setProperty('--slider-progress', `${progress}%`);
                }}
                className="cache-limit-slider"
              />
            </div>
            
            <div className="slider-labels">
              <span>10</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>90</span>
              <span>100</span>
            </div>
            
            <div className="setting-feedback">
              {tempCacheLimit !== cacheSettings.cacheLimit ? (
                <span>🔄 将更新为: {tempCacheLimit} 题</span>
              ) : (
                <span>✅ 当前设置: {cacheSettings.cacheLimit} 题</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowSettings(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={() => {
                cacheService.setCacheLimit(tempCacheLimit);
                setShowSettings(false);
              }}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="cache-management-section">
      <div className="container">
        {/* 缓存状态概览 */}
        <div className="cache-overview">
          <div className="cache-header">
            <h2 style={{color:'white',fontSize:"2.5rem"}}>💾 缓存管理</h2>
            <p style={{color:"white",fontWeight:100}}>管理离线缓存数据，确保在无网络环境下也能正常使用</p>
          </div>
          
          <div className="cache-stats-cards">
            <div className="cache-stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-number">
                  {cacheStatus.hasCache ? cacheStatus.count : 0}
                </div>
                <div className="stat-label">已缓存题目</div>
              </div>
            </div>
            
            <div className="cache-stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <div className="stat-number">
                  {cacheSettings.cacheLimit}
                </div>
                <div className="stat-label">缓存限制</div>
              </div>
            </div>
            
            <div className="cache-stat-card">
              <div className="stat-icon">🕒</div>
              <div className="stat-content">
                <div className="stat-number">
                  {cacheStatus.hasCache ? '7天' : '无'}
                </div>
                <div className="stat-label">缓存有效期</div>
              </div>
            </div>
            
            <div className="cache-stat-card">
              <div className="stat-icon">🌐</div>
              <div className="stat-content">
                <div className="stat-number">
                  {isOnline ? '在线' : '离线'}
                </div>
                <div className="stat-label">网络状态</div>
              </div>
            </div>
          </div>
        </div>

        {/* 缓存操作区域 */}
        <div className="cache-actions-panel">
          <div className="cache-action-group">
            <h3>缓存操作</h3>
            <div className="action-buttons">
              <button
                onClick={handleManualCache}
                disabled={syncing || !isOnline}
                className={`cache-action-btn primary ${syncing ? 'loading' : ''}`}
              >
                {syncing ? (
                  <>
                    <div className="loading-spinner"></div>
                    缓存中...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">💾</span>
                    立即缓存题目
                  </>
                )}
              </button>
              
              <button
                onClick={handleClearCache}
                disabled={!cacheStatus.hasCache}
                className="cache-action-btn secondary"
              >
                <span className="btn-icon">🗑️</span>
                清理缓存
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="cache-action-btn outline"
              >
                <span className="btn-icon">⚙️</span>
                缓存设置
              </button>
            </div>
          </div>

          {/* 缓存预览 */}
          {cacheStatus.hasCache && (
            <div className="cache-preview">
              <h3>缓存预览</h3>
              <div className="preview-content">
                <p>已缓存 {cacheStatus.count} 道题目，点击查看离线题目：</p>
                <button 
                  onClick={() => navigate('/offline/questions')}
                  className="view-offline-btn"
                >
                  📚 查看离线题目 ({cacheStatus.count})
                </button>
              </div>
            </div>
          )}

          {/* 缓存提示 */}
          <div className="cache-tips">
            <h3>使用提示</h3>
            <ul>
              <li>💡 缓存题目后可在无网络环境下查看和复习</li>
              <li>⏰ 缓存数据有效期为7天，过期后自动清理</li>
              <li>📱 建议在网络良好时进行缓存操作</li>
              <li>🔄 题目更新后建议重新缓存以获取最新内容</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 设置模态框 */}
      {showSettings && <CacheSettingsModal />}
    </section>
  );
};

export default CacheManagementTab;