// services/offlineService.js
export class OfflineService {
  constructor() {
    this.isOnline = true;
    this.setupOnlineListeners();
  }

  // 设置网络状态监听
  setupOnlineListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      //('🌐 网络已连接');
      this.isOnline = true;
      this.dispatchEvent('online');
    });

    window.addEventListener('offline', () => {
      //('📶 网络已断开');
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
    // 如果明确是离线模式，或者网络不可用
    return !this.isOnline;
  }

  // 模拟网络请求 - 在离线模式下返回假数据
  simulateNetworkRequest() {
    return new Promise((resolve, reject) => {
      if (this.shouldUseOfflineData()) {
        reject(new Error('网络不可用，当前处于离线模式'));
      } else {
        resolve();
      }
    });
  }

  // 事件分发
  dispatchEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`offline:${eventName}`, { detail: data }));
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