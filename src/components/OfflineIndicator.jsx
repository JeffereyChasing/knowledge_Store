// components/OfflineIndicator.jsx
import React, { useState, useEffect } from 'react';
import { offlineService, cacheService } from '../services/offlineService';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [cacheStatus, setCacheStatus] = useState({});

  useEffect(() => {
    // 初始状态
    setIsOnline(offlineService.isOnlineMode());
    setCacheStatus(cacheService.getCacheStatus());

    // 监听网络状态变化
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    offlineService.addEventListener('online', handleOnline);
    offlineService.addEventListener('offline', handleOffline);

    // 定期更新缓存状态
    const interval = setInterval(() => {
      setCacheStatus(cacheService.getCacheStatus());
    }, 5000);

    return () => {
      offlineService.removeEventListener('online', handleOnline);
      offlineService.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        <div className="offline-icon">📶</div>
        <div className="offline-text">
          <strong>离线模式</strong>
          <span>使用缓存的题目数据</span>
          {cacheStatus.hasCache && (
            <span className="cache-info">
              已缓存 {cacheStatus.count} 道题目
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;