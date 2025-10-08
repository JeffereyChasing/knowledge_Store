// src/services/cacheService.js
import { offlineService } from './offlineService';

export class CacheService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.cacheLimit = 30; // 默认缓存30题，可以动态修改
  }

  // 检查浏览器支持
  checkSupport() {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'caches' in window;
  }

  // 设置缓存题目数量限制
  setCacheLimit(limit) {
    if (limit > 0 && limit <= 500) { // 设置合理的限制范围
      this.cacheLimit = limit;
      console.log(`🔄 缓存题目数量限制设置为: ${limit}`);
      return true;
    }
    console.warn('❌ 缓存数量限制必须在 1-500 之间');
    return false;
  }

  // 获取当前缓存限制
  getCacheLimit() {
    return this.cacheLimit;
  }

  // 缓存题目数据
  async cacheQuestions(questions) {
    if (offlineService.shouldUseOfflineData()) {
      console.log('📦 离线模式下跳过缓存操作');
      return false;
    }

    if (!this.isSupported) {
      console.warn('❌ Service Worker 不可用，使用 localStorage 回退');
      return this.cacheQuestionsFallback(questions);
    }

    try {
      const cacheData = {
        questions: questions.slice(0, this.cacheLimit), // 使用配置的数量
        timestamp: Date.now(),
        version: '1.0.0',
        count: Math.min(questions.length, this.cacheLimit),
        cacheLimit: this.cacheLimit // 记录缓存限制
      };

      // 使用 localStorage 作为主要缓存
      localStorage.setItem('offline_questions', JSON.stringify(cacheData));
      
      console.log('✅ 题目数据缓存成功:', cacheData.count, '道题目 (限制:', this.cacheLimit, ')');
      
      // 通知缓存更新
      this.dispatchEvent('cacheUpdated', {
        count: cacheData.count,
        timestamp: cacheData.timestamp,
        cacheLimit: this.cacheLimit
      });
      
      return true;
    } catch (error) {
      console.error('❌ 缓存题目数据失败:', error);
      return false;
    }
  }

  // 回退方案：使用 localStorage
  async cacheQuestionsFallback(questions) {
    try {
      const cacheData = {
        questions: questions.slice(0, this.cacheLimit),
        timestamp: Date.now(),
        version: '1.0.0-fallback',
        cacheLimit: this.cacheLimit
      };

      localStorage.setItem('offline_questions_fallback', JSON.stringify(cacheData));
      console.log('✅ 使用 localStorage 缓存题目:', cacheData.questions.length, '道');
      return true;
    } catch (error) {
      console.error('❌ localStorage 缓存失败:', error);
      return false;
    }
  }

  // 获取缓存的题目
  async getCachedQuestions() {
    if (!this.isSupported) {
      return this.getCachedQuestionsFallback();
    }

    try {
      const cached = localStorage.getItem('offline_questions');
      if (!cached) {
        return { questions: [], timestamp: null, version: null, cacheLimit: this.cacheLimit };
      }

      const cacheData = JSON.parse(cached);
      
      // 检查缓存是否过期（7天）
      const isExpired = Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        console.log('🕒 缓存已过期，清理旧数据');
        this.clearCache();
        return { questions: [], timestamp: null, version: null, cacheLimit: this.cacheLimit };
      }

      return cacheData;
    } catch (error) {
      console.error('❌ 获取缓存数据失败:', error);
      return this.getCachedQuestionsFallback();
    }
  }

  // 回退方案：从 localStorage 获取
  async getCachedQuestionsFallback() {
    try {
      const cached = localStorage.getItem('offline_questions_fallback');
      if (!cached) {
        return { questions: [], timestamp: null, version: null, cacheLimit: this.cacheLimit };
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error('❌ 获取回退缓存失败:', error);
      return { questions: [], timestamp: null, version: null, cacheLimit: this.cacheLimit };
    }
  }

  // 获取缓存状态
  getCacheStatus() {
    if (!this.isSupported) {
      return this.getCacheStatusFallback();
    }

    try {
      const cached = localStorage.getItem('offline_questions');
      if (!cached) {
        return { 
          supported: true, 
          hasCache: false, 
          count: 0, 
          timestamp: null,
          cacheLimit: this.cacheLimit 
        };
      }

      const cacheData = JSON.parse(cached);
      return {
        supported: true,
        hasCache: true,
        count: cacheData.questions.length,
        timestamp: cacheData.timestamp,
        cacheLimit: this.cacheLimit,
        isExpired: Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000
      };
    } catch (error) {
      return this.getCacheStatusFallback();
    }
  }

  // 回退方案：从 localStorage 获取状态
  getCacheStatusFallback() {
    try {
      const cached = localStorage.getItem('offline_questions_fallback');
      if (!cached) {
        return { 
          supported: false, 
          hasCache: false, 
          count: 0, 
          timestamp: null,
          cacheLimit: this.cacheLimit 
        };
      }

      const data = JSON.parse(cached);
      return {
        supported: false,
        hasCache: true,
        count: data.questions.length,
        timestamp: data.timestamp,
        cacheLimit: this.cacheLimit,
        isExpired: Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000
      };
    } catch (error) {
      return { 
        supported: false, 
        hasCache: false, 
        count: 0, 
        timestamp: null,
        cacheLimit: this.cacheLimit 
      };
    }
  }

  // 清理缓存
  clearCache() {
    if (this.isSupported) {
      localStorage.removeItem('offline_questions');
    }
    localStorage.removeItem('offline_questions_fallback');
    console.log('🗑️ 缓存已清理');
  }

  // 获取缓存配置信息
  getCacheConfig() {
    return {
      cacheLimit: this.cacheLimit,
      isSupported: this.isSupported,
      maxLimit: 500, // 最大限制
      minLimit: 1,   // 最小限制
      defaultLimit: 30 // 默认限制
    };
  }

  // 重置为默认配置
  resetToDefault() {
    this.cacheLimit = 30;
    console.log('🔄 缓存配置已重置为默认值');
    return this.cacheLimit;
  }

  // 事件分发
  dispatchEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`cache:${eventName}`, { detail: data }));
    }
  }

  // 添加事件监听
  addEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`cache:${eventName}`, callback);
    }
  }

  // 移除事件监听
  removeEventListener(eventName, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`cache:${eventName}`, callback);
    }
  }
}

export const cacheService = new CacheService();