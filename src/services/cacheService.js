// services/cacheService.js
import AV from 'leancloud-storage';

const CACHE_KEYS = {
  OFFLINE_QUESTIONS: 'offline_questions_v1',
  CACHE_TIMESTAMP: 'cache_timestamp',
  USER_PREFERENCES: 'user_preferences'
};

export class CacheService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'caches' in window && 'indexedDB' in window;
  }

  // 检查是否支持缓存
  isCacheSupported() {
    return this.isSupported;
  }

  // 预缓存题目数据
  async cacheQuestions(questions) {
    if (!this.isSupported) {
      console.warn('浏览器不支持缓存功能');
      return false;
    }

    try {
      const cacheData = {
        questions: questions.slice(0, 30), // 只缓存前30题
        timestamp: Date.now(),
        version: '1.0'
      };

      // 使用 localStorage 作为主要缓存
      localStorage.setItem(CACHE_KEYS.OFFLINE_QUESTIONS, JSON.stringify(cacheData));
      
      console.log('✅ 题目数据缓存成功', {
        count: cacheData.questions.length,
        timestamp: new Date(cacheData.timestamp).toLocaleString()
      });
      
      return true;
    } catch (error) {
      console.error('❌ 缓存题目数据失败:', error);
      return false;
    }
  }

  // 获取缓存的题目
  async getCachedQuestions() {
    if (!this.isSupported) {
      return { questions: [], timestamp: null };
    }

    try {
      const cached = localStorage.getItem(CACHE_KEYS.OFFLINE_QUESTIONS);
      if (!cached) {
        return { questions: [], timestamp: null };
      }

      const cacheData = JSON.parse(cached);
      
      // 检查缓存是否过期（7天）
      const isExpired = Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        console.log('🕒 缓存已过期，清理旧数据');
        this.clearCache();
        return { questions: [], timestamp: null };
      }

      return cacheData;
    } catch (error) {
      console.error('❌ 获取缓存数据失败:', error);
      return { questions: [], timestamp: null };
    }
  }

  // 清理缓存
  clearCache() {
    if (!this.isSupported) return;
    
    localStorage.removeItem(CACHE_KEYS.OFFLINE_QUESTIONS);
    localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
  }

  // 获取缓存状态
  getCacheStatus() {
    if (!this.isSupported) {
      return { supported: false, hasCache: false, count: 0, timestamp: null };
    }

    try {
      const cached = localStorage.getItem(CACHE_KEYS.OFFLINE_QUESTIONS);
      if (!cached) {
        return { supported: true, hasCache: false, count: 0, timestamp: null };
      }

      const cacheData = JSON.parse(cached);
      return {
        supported: true,
        hasCache: true,
        count: cacheData.questions.length,
        timestamp: cacheData.timestamp,
        isExpired: Date.now() - cacheData.timestamp > 7 * 24 * 60 * 60 * 1000
      };
    } catch (error) {
      return { supported: true, hasCache: false, count: 0, timestamp: null };
    }
  }
}

export const cacheService = new CacheService();