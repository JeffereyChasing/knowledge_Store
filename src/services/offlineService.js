// services/offlineService.js
import { cacheService } from './cacheService';

export class OfflineService {
  constructor() {
    this.isOnline = true;
    this.setupOnlineListeners();
  }

  // 设置网络状态监听
  setupOnlineListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 网络已连接');
      this.isOnline = true;
      this.dispatchEvent('online');
    });

    window.addEventListener('offline', () => {
      console.log('📶 网络已断开');
      this.isOnline = false;
      this.dispatchEvent('offline');
    });

    // 初始状态
    this.isOnline = navigator.onLine;
  }

  // 检查网络状态
  isOnlineMode() {
    return this.isOnline;
  }

  // 检查是否应该使用离线数据
  shouldUseOfflineData() {
    return !this.isOnline && cacheService.getCacheStatus().hasCache;
  }

  // 事件分发
  dispatchEvent(eventName) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`offline:${eventName}`));
    }
  }

  // 添加事件监听
  addEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`offline:${eventName}`, callback);
    }
  }

  // 移除事件监听
  removeEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`offline:${eventName}`, callback);
    }
  }
}

export const offlineService = new OfflineService();