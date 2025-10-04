// utils/requestUtils.js
class RequestManager {
    constructor() {
      this.pendingRequests = new Map();
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }
  
    // 防抖请求
    debounce(key, fn, delay = 300) {
      return new Promise((resolve, reject) => {
        // 清除之前的定时器
        if (this.pendingRequests.has(key)) {
          clearTimeout(this.pendingRequests.get(key));
        }
  
        // 设置新的定时器
        const timer = setTimeout(async () => {
          this.pendingRequests.delete(key);
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
  
        this.pendingRequests.set(key, timer);
      });
    }
  
    // 缓存请求
    async cachedRequest(key, fn, useCache = true) {
      if (useCache) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }
  
      const result = await fn();
      
      if (useCache) {
        this.cache.set(key, {
          data: result,
          timestamp: Date.now()
        });
      }
  
      return result;
    }
  
    // 清除缓存
    clearCache(key = null) {
      if (key) {
        this.cache.delete(key);
      } else {
        this.cache.clear();
      }
    }
  }
  
  export const requestManager = new RequestManager();