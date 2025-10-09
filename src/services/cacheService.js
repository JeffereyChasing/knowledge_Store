// src/services/cacheService.js
import { offlineService } from './offlineService';

/**
 * 缓存服务 - 双缓存策略实现
 * 同时使用 Service Worker Cache API 和 localStorage 进行数据缓存
 * 提供更好的离线体验和缓存可靠性
 */
export class CacheService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.cacheLimit = 30; // 默认缓存30题
    this.cacheVersion = '2.0.0'; // 缓存版本号
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天过期时间
    
    // 缓存键名常量
    this.CACHE_KEYS = {
      SW_CACHE: 'questions-data-v2',
      LOCAL_STORAGE: 'offline_questions_v2',
      FALLBACK: 'offline_questions_fallback_v2',
      META: 'cache_metadata_v2'
    };
    
    // 初始化缓存状态
    this.cacheState = {
      swAvailable: false,
      localStorageAvailable: false,
      lastSync: null,
      strategy: 'dual' // dual, sw-only, ls-only, none
    };
    
    this.init();
  }

  /**
   * 初始化缓存服务
   */
  async init() {
    try {
      // 检测支持情况
      this.cacheState.swAvailable = await this.checkSWCacheSupport();
      this.cacheState.localStorageAvailable = this.checkLocalStorageSupport();
      
      // 确定缓存策略
      this.determineCacheStrategy();
      
      console.log(`🔄 缓存服务初始化完成 - 策略: ${this.cacheState.strategy}`, {
        sw: this.cacheState.swAvailable,
        ls: this.cacheState.localStorageAvailable
      });
      
    } catch (error) {
      console.error('❌ 缓存服务初始化失败:', error);
      this.cacheState.strategy = 'none';
    }
  }

  /**
   * 检查浏览器支持情况
   */
  checkSupport() {
    return typeof window !== 'undefined' && 
           ('serviceWorker' in navigator || 'caches' in window);
  }

  /**
   * 检查 Service Worker Cache API 支持
   */
  async checkSWCacheSupport() {
    try {
      if (!('caches' in window)) return false;
      
      // 测试缓存操作
      const testCache = await caches.open('test-cache-support');
      await testCache.put(
        new Request('/test-support'), 
        new Response('test')
      );
      await testCache.delete('/test-support');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查 localStorage 支持
   */
  checkLocalStorageSupport() {
    try {
      const testKey = 'test_local_storage_support';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确定最佳缓存策略
   */
  determineCacheStrategy() {
    if (this.cacheState.swAvailable && this.cacheState.localStorageAvailable) {
      this.cacheState.strategy = 'dual';
    } else if (this.cacheState.swAvailable) {
      this.cacheState.strategy = 'sw-only';
    } else if (this.cacheState.localStorageAvailable) {
      this.cacheState.strategy = 'ls-only';
    } else {
      this.cacheState.strategy = 'none';
    }
  }

  /**
   * 设置缓存题目数量限制
   */
  setCacheLimit(limit) {
    if (limit > 0 && limit <= 500) {
      this.cacheLimit = limit;
      console.log(`🔄 缓存题目数量限制设置为: ${limit}`);
      
      // 更新元数据
      this.updateCacheMetadata();
      return true;
    }
    console.warn('❌ 缓存数量限制必须在 1-500 之间');
    return false;
  }

  /**
   * 获取当前缓存限制
   */
  getCacheLimit() {
    return this.cacheLimit;
  }

  /**
   * 双缓存策略：同时缓存到 Service Worker Cache 和 localStorage
   */
  async cacheQuestions(questions) {
    if (offlineService.shouldUseOfflineData()) {
      console.log('📦 离线模式下跳过缓存操作');
      return false;
    }

    if (this.cacheState.strategy === 'none') {
      console.warn('❌ 当前环境不支持任何缓存策略');
      return false;
    }

    try {
      const cacheData = {
        questions: questions.slice(0, this.cacheLimit),
        timestamp: Date.now(),
        version: this.cacheVersion,
        count: Math.min(questions.length, this.cacheLimit),
        cacheLimit: this.cacheLimit,
        strategy: this.cacheState.strategy
      };

      // 并行执行多种缓存策略
      const cachePromises = [];

      // Service Worker Cache 缓存
      if (this.cacheState.swAvailable) {
        cachePromises.push(this.cacheToServiceWorker(cacheData));
      }

      // localStorage 缓存
      if (this.cacheState.localStorageAvailable) {
        cachePromises.push(this.cacheToLocalStorage(cacheData));
      }

      // 等待所有缓存操作完成
      await Promise.allSettled(cachePromises);
      
      // 更新缓存状态
      this.cacheState.lastSync = Date.now();
      this.updateCacheMetadata(cacheData);
      
      console.log(`✅ 题目数据双缓存成功: ${cacheData.count} 道题目`, {
        strategy: this.cacheState.strategy,
        limit: this.cacheLimit
      });
      
      // 通知缓存更新
      this.dispatchEvent('cacheUpdated', {
        count: cacheData.count,
        timestamp: cacheData.timestamp,
        cacheLimit: this.cacheLimit,
        strategy: this.cacheState.strategy
      });
      
      return true;
    } catch (error) {
      console.error('❌ 双缓存策略失败:', error);
      return false;
    }
  }

  /**
   * 缓存到 Service Worker Cache API
   */
  async cacheToServiceWorker(cacheData) {
    try {
      const cache = await caches.open(this.CACHE_KEYS.SW_CACHE);
      
      // 创建缓存请求和响应
      const cacheRequest = new Request('/api/cached/questions');
      const cacheResponse = new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' }
      });

      // 存储到缓存
      await cache.put(cacheRequest, cacheResponse);
      
      console.log('✅ Service Worker 缓存成功');
      return true;
    } catch (error) {
      console.error('❌ Service Worker 缓存失败:', error);
      throw error;
    }
  }

  /**
   * 缓存到 localStorage
   */
  async cacheToLocalStorage(cacheData) {
    try {
      localStorage.setItem(this.CACHE_KEYS.LOCAL_STORAGE, JSON.stringify(cacheData));
      console.log('✅ localStorage 缓存成功');
      return true;
    } catch (error) {
      console.error('❌ localStorage 缓存失败:', error);
      
      // 尝试使用回退方案
      try {
        const fallbackData = {
          ...cacheData,
          version: cacheData.version + '-fallback'
        };
        localStorage.setItem(this.CACHE_KEYS.FALLBACK, JSON.stringify(fallbackData));
        console.log('✅ 使用回退方案缓存成功');
        return true;
      } catch (fallbackError) {
        console.error('❌ 回退方案也失败:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * 获取缓存的题目数据 - 智能读取策略
   */
  async getCachedQuestions() {
    if (this.cacheState.strategy === 'none') {
      return this.getEmptyCacheData();
    }

    try {
      let cacheData = null;
      
      // 根据策略优先级读取数据
      if (this.cacheState.strategy === 'dual' || this.cacheState.strategy === 'sw-only') {
        cacheData = await this.getFromServiceWorker();
      }
      
      // 如果 Service Worker 缓存失败或没有数据，尝试 localStorage
      if (!cacheData && (this.cacheState.strategy === 'dual' || this.cacheState.strategy === 'ls-only')) {
        cacheData = this.getFromLocalStorage();
      }
      
      // 如果都没有数据，返回空数据
      if (!cacheData) {
        return this.getEmptyCacheData();
      }

      // 检查缓存是否过期
      if (this.isCacheExpired(cacheData.timestamp)) {
        console.log('🕒 缓存已过期，清理旧数据');
        await this.clearCache();
        return this.getEmptyCacheData();
      }

      return cacheData;
    } catch (error) {
      console.error('❌ 获取缓存数据失败:', error);
      return this.getEmptyCacheData();
    }
  }

  /**
   * 从 Service Worker Cache 读取数据
   */
  async getFromServiceWorker() {
    try {
      const cache = await caches.open(this.CACHE_KEYS.SW_CACHE);
      const response = await cache.match('/api/cached/questions');
      
      if (response) {
        const data = await response.json();
        console.log('✅ 从 Service Worker 缓存读取数据');
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ 从 Service Worker 读取失败:', error);
      return null;
    }
  }

  /**
   * 从 localStorage 读取数据 - 同步方法
   */
  getFromLocalStorage() {
    try {
      // 尝试主存储
      const cached = localStorage.getItem(this.CACHE_KEYS.LOCAL_STORAGE);
      if (cached) {
        const data = JSON.parse(cached);
        console.log('✅ 从 localStorage 读取数据');
        return data;
      }
      
      // 尝试回退存储
      const fallback = localStorage.getItem(this.CACHE_KEYS.FALLBACK);
      if (fallback) {
        const data = JSON.parse(fallback);
        console.log('✅ 从回退存储读取数据');
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 从 localStorage 读取失败:', error);
      return null;
    }
  }

  /**
   * 检查缓存是否过期
   */
  isCacheExpired(timestamp) {
    return Date.now() - timestamp > this.cacheExpiry;
  }

  /**
   * 获取空缓存数据结构
   */
  getEmptyCacheData() {
    return {
      questions: [],
      timestamp: null,
      version: null,
      count: 0,
      cacheLimit: this.cacheLimit,
      strategy: this.cacheState.strategy
    };
  }

  /**
   * 获取缓存状态信息 - 同步方法
   */
  getCacheStatus() {
    if (this.cacheState.strategy === 'none') {
      return this.getDefaultCacheStatus();
    }

    try {
      let cacheData = null;
      
      // 根据策略优先级读取数据
      if (this.cacheState.strategy === 'dual' || this.cacheState.strategy === 'sw-only') {
        // 对于 Service Worker，我们无法同步获取，使用 localStorage 作为后备
        cacheData = this.getFromLocalStorage();
      } else if (this.cacheState.strategy === 'ls-only') {
        cacheData = this.getFromLocalStorage();
      }
      
      if (!cacheData) {
        return this.getDefaultCacheStatus();
      }

      // 检查缓存是否过期
      const isExpired = this.isCacheExpired(cacheData.timestamp);
      
      if (isExpired) {
        console.log('🕒 缓存状态：已过期');
        return {
          ...this.getDefaultCacheStatus(),
          isExpired: true
        };
      }

      const metadata = this.getCacheMetadata();
      
      return {
        supported: this.cacheState.strategy !== 'none',
        hasCache: true,
        count: cacheData.questions.length,
        timestamp: cacheData.timestamp,
        cacheLimit: this.cacheLimit,
        strategy: this.cacheState.strategy,
        swAvailable: this.cacheState.swAvailable,
        lsAvailable: this.cacheState.localStorageAvailable,
        isExpired: false,
        lastSync: this.cacheState.lastSync,
        metadata: metadata
      };
    } catch (error) {
      console.error('❌ 获取缓存状态失败:', error);
      return this.getDefaultCacheStatus();
    }
  }

  /**
   * 获取默认缓存状态
   */
  getDefaultCacheStatus() {
    return {
      supported: this.cacheState.strategy !== 'none',
      hasCache: false,
      count: 0,
      timestamp: null,
      cacheLimit: this.cacheLimit,
      strategy: this.cacheState.strategy,
      swAvailable: this.cacheState.swAvailable,
      lsAvailable: this.cacheState.localStorageAvailable,
      isExpired: false,
      lastSync: this.cacheState.lastSync,
      metadata: this.getCacheMetadata()
    };
  }

  /**
   * 更新缓存元数据
   */
  updateCacheMetadata(cacheData = null) {
    try {
      const metadata = {
        version: this.cacheVersion,
        cacheLimit: this.cacheLimit,
        lastUpdated: Date.now(),
        strategy: this.cacheState.strategy,
        dataInfo: cacheData ? {
          count: cacheData.count,
          timestamp: cacheData.timestamp
        } : null
      };
      
      if (this.cacheState.localStorageAvailable) {
        localStorage.setItem(this.CACHE_KEYS.META, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('❌ 更新缓存元数据失败:', error);
    }
  }

  /**
   * 获取缓存元数据 - 同步方法
   */
  getCacheMetadata() {
    try {
      if (this.cacheState.localStorageAvailable) {
        const metadata = localStorage.getItem(this.CACHE_KEYS.META);
        return metadata ? JSON.parse(metadata) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 清理所有缓存
   */
  async clearCache() {
    try {
      const clearPromises = [];

      // 清理 Service Worker 缓存
      if (this.cacheState.swAvailable) {
        clearPromises.push(
          caches.delete(this.CACHE_KEYS.SW_CACHE).catch(() => {})
        );
      }

      // 清理 localStorage
      if (this.cacheState.localStorageAvailable) {
        Object.values(this.CACHE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      }

      await Promise.allSettled(clearPromises);
      
      // 重置状态
      this.cacheState.lastSync = null;
      
      console.log('🗑️ 所有缓存已清理');
      
      // 通知缓存清理
      this.dispatchEvent('cacheCleared', {
        strategy: this.cacheState.strategy
      });
      
      return true;
    } catch (error) {
      console.error('❌ 清理缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存配置信息
   */
  getCacheConfig() {
    return {
      cacheLimit: this.cacheLimit,
      strategy: this.cacheState.strategy,
      swAvailable: this.cacheState.swAvailable,
      lsAvailable: this.cacheState.localStorageAvailable,
      maxLimit: 500,
      minLimit: 1,
      defaultLimit: 30,
      expiryDays: 7,
      version: this.cacheVersion
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefault() {
    this.cacheLimit = 30;
    this.updateCacheMetadata();
    console.log('🔄 缓存配置已重置为默认值');
    return this.cacheLimit;
  }

  /**
   * 测试缓存性能
   */
  async testCachePerformance() {
    const testData = {
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        question: `测试问题 ${i}`,
        answer: `测试答案 ${i}`
      })),
      timestamp: Date.now(),
      count: 10
    };

    const startTime = performance.now();
    
    try {
      await this.cacheQuestions(testData.questions);
      const retrievedData = await this.getCachedQuestions();
      const endTime = performance.now();
      
      const success = retrievedData.questions.length === testData.questions.length;
      const duration = endTime - startTime;
      
      console.log(`📊 缓存性能测试: ${success ? '成功' : '失败'}`, {
        耗时: `${duration.toFixed(2)}ms`,
        策略: this.cacheState.strategy,
        数据量: testData.questions.length
      });
      
      return { success, duration, strategy: this.cacheState.strategy };
    } catch (error) {
      console.error('❌ 缓存性能测试失败:', error);
      return { success: false, duration: 0, strategy: this.cacheState.strategy };
    }
  }

  /**
   * 事件分发
   */
  dispatchEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`cache:${eventName}`, { 
        detail: {
          ...data,
          timestamp: Date.now(),
          service: 'CacheService'
        }
      }));
    }
  }

  /**
   * 添加事件监听
   */
  addEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`cache:${eventName}`, callback);
    }
  }

  /**
   * 移除事件监听
   */
  removeEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`cache:${eventName}`, callback);
    }
  }
}

// 创建单例实例
export const cacheService = new CacheService();