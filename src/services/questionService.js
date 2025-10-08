// services/questionService.js
import AV from 'leancloud-storage';
import { offlineService } from './offlineService';

// 请求管理工具
class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  // 防抖请求
  debounce(key, fn, delay = 300) {
    return new Promise((resolve, reject) => {
      if (this.pendingRequests.has(key)) {
        clearTimeout(this.pendingRequests.get(key));
      }

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
    // 离线模式下不使用网络请求
    if (offlineService.shouldUseOfflineData()) {
      console.log('📦 离线模式：跳过网络请求', key);
      throw new Error('网络不可用，当前处于离线模式');
    }

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

// 创建全局请求管理器实例
export const requestManager = new RequestManager();

/**
 * 难度选项
 */
export const DifficultyOptions = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

/**
 * 掌握程度选项
 */
export const ProficiencyOptions = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  MASTER: 'master'
};

// 请求配置
const REQUEST_DELAY = 1000; // 1秒延迟
const BATCH_SIZE = 10; // 批量请求大小

// 离线数据存储键
const OFFLINE_QUESTIONS_KEY = 'offline_questions_all';

/**
 * 获取分类ID的辅助函数
 */
const getCategoryId = (category) => {
  if (category && category.objectId) return category.objectId;
  if (typeof category === 'string') return category;
  if (category && category.id) return category.id;
  return null;
};

/**
 * 创建分类 Pointer 对象的辅助函数
 */
const createCategoryPointer = (categoryId) => {
  if (!categoryId) return null;
  return AV.Object.createWithoutData('Category', categoryId);
};

/**
 * 批量更新分类题目数量的辅助函数
 */
const batchUpdateCategoryCounts = async (updates) => {
  // 离线模式下跳过分类计数更新
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：跳过分类计数更新');
    return;
  }

  if (updates.length === 0) return;

  try {
    // 按分类分组更新
    const categoryUpdates = {};
    updates.forEach(({ categoryId, change }) => {
      if (categoryId && !categoryUpdates[categoryId]) {
        categoryUpdates[categoryId] = 0;
      }
      if (categoryId) {
        categoryUpdates[categoryId] += change;
      }
    });

    // 批量更新分类
    const updatePromises = Object.entries(categoryUpdates).map(async ([categoryId, totalChange]) => {
      try {
        const categoryQuery = new AV.Query('Category');
        const freshCategory = await categoryQuery.get(categoryId);
        
        const currentCount = freshCategory.get('questionCount') || 0;
        const newCount = Math.max(0, currentCount + totalChange);
        
        freshCategory.set('questionCount', newCount);
        await freshCategory.save();
        
        console.log(`分类 ${freshCategory.get('name')} 题目数量批量更新: ${currentCount} -> ${newCount}`);
      } catch (error) {
        console.error(`更新分类 ${categoryId} 题目数量失败:`, error);
      }
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('批量更新分类题目数量失败:', error);
  }
};

// 批量更新队列
let batchUpdateQueue = [];
let batchUpdateTimer = null;

/**
 * 调度批量更新
 */
const scheduleBatchUpdate = (category, change) => {
  // 离线模式下跳过批量更新
  if (offlineService.shouldUseOfflineData()) {
    return;
  }

  const categoryId = getCategoryId(category);
  if (!categoryId) return;

  batchUpdateQueue.push({ categoryId, change });

  if (batchUpdateTimer) {
    clearTimeout(batchUpdateTimer);
  }

  batchUpdateTimer = setTimeout(() => {
    const updates = [...batchUpdateQueue];
    batchUpdateQueue = [];
    batchUpdateTimer = null;
    
    batchUpdateCategoryCounts(updates);
  }, 2000); // 2秒后执行批量更新
};

/**
 * 格式化题目响应
 */
const formatQuestionResponse = (question) => {
  const category = question.get('category');
  return {
    id: question.id,
    objectId: question.id,
    title: question.get('title'),
    detailedAnswer: question.get('detailedAnswer'),
    oralAnswer: question.get('oralAnswer'),
    code: question.get('code'),
    url: question.get('url'),
    tags: question.get('tags') || [],
    difficulty: question.get('difficulty'),
    proficiency: question.get('proficiency'),
    appearanceLevel: question.get('appearanceLevel') || 50,
    category: category ? {
      id: category.id,
      objectId: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: category.get('questionCount') || 0
    } : null,
    createdAt: question.get('createdAt'),
    updatedAt: question.get('updatedAt'),
    lastReviewedAt: question.get('lastReviewedAt')
  };
};

/**
 * 获取离线题目数据
 */
const getOfflineQuestions = () => {
  try {
    const cached = localStorage.getItem(OFFLINE_QUESTIONS_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      console.log('📦 从离线存储加载题目数据:', data.length, '道题目');
      return data;
    }
    
    // 如果没有离线数据，返回空数组
    return [];
  } catch (error) {
    console.error('获取离线题目数据失败:', error);
    return [];
  }
};

/**
 * 保存题目数据到离线存储
 */
const saveQuestionsToOffline = (questions) => {
  try {
    localStorage.setItem(OFFLINE_QUESTIONS_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error('保存题目数据到离线存储失败:', error);
  }
};

/**
 * 创建题目
 */
export const createQuestion = async (questionData) => {
  // 离线模式下不允许创建题目
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法创建题目');
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const Question = AV.Object.extend('Question');
    const question = new Question();
    
    // 设置题目字段
    question.set('title', questionData.title || '');
    question.set('detailedAnswer', questionData.detailedAnswer || '');
    question.set('oralAnswer', questionData.oralAnswer || '');
    question.set('code', questionData.code || '');
    question.set('url', questionData.url || '');
    question.set('tags', questionData.tags || []);
    question.set('difficulty', questionData.difficulty || DifficultyOptions.MEDIUM);
    question.set('proficiency', questionData.proficiency || ProficiencyOptions.BEGINNER);
    question.set('appearanceLevel', questionData.appearanceLevel || 50);
    question.set('createdBy', currentUser);

    // 设置分类
    if (questionData.categoryId) {
      const categoryPointer = createCategoryPointer(questionData.categoryId);
      question.set('category', categoryPointer);
    }

    // 设置 ACL 权限
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, true);
    acl.setPublicReadAccess(false);
    question.setACL(acl);

    await question.save();
    
    // 立即更新分类计数
    if (questionData.categoryId) {
      await updateCategoryCountImmediately(questionData.categoryId, 1);
    }
    
    // 清除相关缓存
    if (questionData.categoryId) {
      requestManager.clearCache(`questions-${questionData.categoryId}`);
    }
    requestManager.clearCache('all-questions');
    
    return formatQuestionResponse(question);
  } catch (error) {
    console.error('创建题目失败:', error);
    throw error;
  }
};

/**
 * 获取类别的题目列表（带缓存和防抖）
 */
export const getQuestionsByCategory = async (categoryId, options = {}) => {
  // 离线模式下返回空结果
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：无法获取分类题目列表');
    return {
      data: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
      }
    };
  }

  const cacheKey = `questions-${categoryId}-${JSON.stringify(options)}`;
  
  return requestManager.cachedRequest(cacheKey, async () => {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const { 
        page = 1, 
        pageSize = 10, 
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        difficulty,
        proficiency,
        tag
      } = options;
      
      const categoryPointer = createCategoryPointer(categoryId);
      const query = new AV.Query('Question');
      
      query.equalTo('category', categoryPointer);
      query.equalTo('createdBy', currentUser);
      query.include('category'); // 包含分类信息
      
      // 过滤条件
      if (difficulty) query.equalTo('difficulty', difficulty);
      if (proficiency) query.equalTo('proficiency', proficiency);
      if (tag) query.containsAll('tags', [tag]);
      
      // 排序
      if (sortOrder === 'asc') {
        query.addAscending(sortBy);
      } else {
        query.addDescending(sortBy);
      }
      
      // 分页
      query.limit(pageSize);
      query.skip((page - 1) * pageSize);
      
      const results = await query.find();
      const totalCount = await query.count();
      
      return {
        data: results.map(result => formatQuestionResponse(result)),
        pagination: {
          current: page,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      console.error('获取题目列表失败:', error);
      throw new Error(`获取题目失败: ${error.message}`);
    }
  });
};

/**
 * 根据ID获取单个题目详情（带缓存）
 */
export const getQuestionById = async (id) => {
  // 离线模式下返回空数据
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：无法获取单个题目详情');
    throw new Error('离线模式下无法获取题目详情');
  }

  return requestManager.cachedRequest(`question_${id}`, async () => {
    try {
      const query = new AV.Query('Question');
      query.equalTo('objectId', id);
      query.include('category');
      
      const question = await query.first();
      
      if (!question) {
        throw new Error('题目不存在');
      }
      
      return formatQuestionResponse(question);
    } catch (error) {
      console.error(`获取题目 ${id} 失败:`, error);
      throw error;
    }
  });
};

/**
 * 批量获取题目详情（优化性能）
 */
export const getQuestionsBatch = async (questionIds) => {
  // 离线模式下返回空数组
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：无法批量获取题目');
    return [];
  }

  if (!questionIds || questionIds.length === 0) return [];

  // 分批处理，避免过多请求
  const batches = [];
  for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
    batches.push(questionIds.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  
  for (const batch of batches) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) continue;

      const query = new AV.Query('Question');
      query.containedIn('objectId', batch);
      query.equalTo('createdBy', currentUser);
      query.include('category');
      
      const batchResults = await query.find();
      results.push(...batchResults.map(q => formatQuestionResponse(q)));
    } catch (error) {
      console.error('批量获取题目失败:', error);
      // 继续处理其他批次
    }
  }

  return results;
};

/**
 * 删除题目
 */
export const deleteQuestion = async (questionId) => {
  // 离线模式下不允许删除题目
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法删除题目');
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 验证题目是否属于当前用户
    const query = new AV.Query('Question');
    query.equalTo('objectId', questionId);
    query.equalTo('createdBy', currentUser);
    query.include('category');
    const question = await query.first();
    
    if (!question) {
      throw new Error('题目不存在或无权删除');
    }

    // 获取分类信息用于更新计数
    const category = question.get('category');
    
    await question.destroy();
    
    // 立即更新分类计数
    if (category) {
      await updateCategoryCountImmediately(category, -1);
    }
    
    // 清除缓存
    requestManager.clearCache(`question-${questionId}`);
    requestManager.clearCache('all-questions');
    
    return true;
  } catch (error) {
    console.error('删除题目失败:', error);
    throw error;
  }
};

/**
 * 搜索题目
 */
export const searchQuestions = async (searchTerm, options = {}) => {
  // 离线模式下返回空结果
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：无法搜索题目');
    return {
      data: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
      }
    };
  }

  const cacheKey = `search-${searchTerm}-${JSON.stringify(options)}`;
  
  return requestManager.cachedRequest(cacheKey, async () => {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const { page = 1, pageSize = 10 } = options;
      
      const titleQuery = new AV.Query('Question');
      titleQuery.contains('title', searchTerm);
      titleQuery.equalTo('createdBy', currentUser);
      
      const detailedAnswerQuery = new AV.Query('Question');
      detailedAnswerQuery.contains('detailedAnswer', searchTerm);
      detailedAnswerQuery.equalTo('createdBy', currentUser);
      
      const oralAnswerQuery = new AV.Query('Question');
      oralAnswerQuery.contains('oralAnswer', searchTerm);
      oralAnswerQuery.equalTo('createdBy', currentUser);
      
      const codeQuery = new AV.Query('Question');
      codeQuery.contains('code', searchTerm);
      codeQuery.equalTo('createdBy', currentUser);
      
      const tagsQuery = new AV.Query('Question');
      tagsQuery.containsAll('tags', [searchTerm]);
      tagsQuery.equalTo('createdBy', currentUser);
      
      const query = AV.Query.or(
        titleQuery, 
        detailedAnswerQuery, 
        oralAnswerQuery, 
        codeQuery, 
        tagsQuery
      );
      
      query.include('category');
      query.addDescending('updatedAt');
      query.limit(pageSize);
      query.skip((page - 1) * pageSize);
      
      const results = await query.find();
      const totalCount = await query.count();
      
      return {
        data: results.map(result => formatQuestionResponse(result)),
        pagination: {
          current: page,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      console.error('搜索题目失败:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }, false); // 搜索不缓存
};

/**
 * 获取所有题目（修复分页限制）- 确保获取全部数据
 */
export const getAllQuestions = async (useCache = false) => {
  // 离线模式处理
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从本地存储获取题目数据');
    return getOfflineQuestions();
  }

  if (!useCache) {
    // 清除缓存
    requestManager.clearCache('all-questions');

    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const allQuestions = [];
      let skip = 0;
      const limit = 100; // LeanCloud 单次查询限制
      let hasMore = true;

      // 循环获取所有数据
      while (hasMore) {
        const query = new AV.Query('Question');
        query.equalTo('createdBy', currentUser);
        query.include('category');
        query.descending('updatedAt');
        query.limit(limit);
        query.skip(skip);
        
        const batchResults = await query.find();
        allQuestions.push(...batchResults);
        
        // 检查是否还有更多数据
        hasMore = batchResults.length === limit;
        skip += limit;
        
        console.log(`📦 批量获取题目: 第 ${skip/limit} 批, 获取 ${batchResults.length} 条`);
      }

      const result = allQuestions.map(question => formatQuestionResponse(question));
      
      console.log('📊 getAllQuestions 实时查询结果:', {
        题目总数: result.length,
        批次: `${skip/limit} 批`,
        最新题目: result.slice(0, 3).map(q => ({ id: q.id, title: q.title }))
      });
      
      // 保存到离线存储
      saveQuestionsToOffline(result);
      
      return result;
    } catch (error) {
      console.error('获取所有题目失败:', error);
      
      // 网络请求失败时，尝试使用离线数据
      if (error.message.includes('offline') || error.message.includes('network') || error.message.includes('CORS')) {
        console.log('🌐 网络请求失败，尝试使用离线数据');
        return getOfflineQuestions();
      }
      
      throw error;
    }
  }
  
  // 原有缓存逻辑
  return requestManager.cachedRequest('all-questions', async () => {
    // 同样需要修复分页问题
    const allQuestions = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const query = new AV.Query('Question');
      query.equalTo('createdBy', currentUser);
      query.include('category');
      query.descending('updatedAt');
      query.limit(limit);
      query.skip(skip);
      
      const batchResults = await query.find();
      allQuestions.push(...batchResults);
      
      hasMore = batchResults.length === limit;
      skip += limit;
    }

    const result = allQuestions.map(question => formatQuestionResponse(question));
    saveQuestionsToOffline(result);
    return result;
  });
};

/**
 * 更新题目
 */
export const updateQuestion = async (questionId, updateData) => {
  // 离线模式下不允许更新题目
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法更新题目');
  }

  try {
    console.log('questionService: 更新题目', questionId, updateData);
    
    const question = AV.Object.createWithoutData('Question', questionId);
    
    // 记录旧的分类信息
    let oldCategory = null;
    if (updateData.categoryId) {
      const oldQuestion = await new AV.Query('Question')
        .include('category')
        .get(questionId);
      oldCategory = oldQuestion.get('category');
    }
    
    // 设置更新字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        // 如果是 categoryId，转换为 Pointer 对象
        if (key === 'categoryId') {
          const categoryPointer = createCategoryPointer(updateData[key]);
          question.set('category', categoryPointer);
        } else {
          question.set(key, updateData[key]);
        }
      }
    });
    
    const result = await question.save();
    console.log('questionService: 更新成功', result);
    
    // 如果分类发生变化，更新分类计数
    if (updateData.categoryId && oldCategory) {
      const newCategoryId = updateData.categoryId;
      const oldCategoryId = getCategoryId(oldCategory);
      
      if (oldCategoryId !== newCategoryId) {
        // 减少旧分类的计数
        if (oldCategoryId) {
          scheduleBatchUpdate(oldCategoryId, -1);
        }
        // 增加新分类的计数
        if (newCategoryId) {
          scheduleBatchUpdate(newCategoryId, 1);
        }
      }
    }
    
    // 清除缓存
    requestManager.clearCache(`question-${questionId}`);
    requestManager.clearCache('all-questions');
    
    // 重新获取更新后的题目信息
    const updatedQuestion = await new AV.Query('Question')
      .include('category')
      .get(questionId);
    
    return formatQuestionResponse(updatedQuestion);
  } catch (error) {
    console.error('questionService: 更新题目失败:', error);
    throw error;
  }
};

/**
 * 更新题目复习时间
 */
export const updateQuestionReviewTime = async (questionId) => {
  // 离线模式下不允许更新复习时间
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法更新复习时间');
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const question = AV.Object.createWithoutData('Question', questionId);
    question.set('lastReviewedAt', new Date());
    
    const result = await question.save();
    
    // 清除缓存
    requestManager.clearCache(`question-${questionId}`);
    requestManager.clearCache('all-questions');
    
    return result;
  } catch (error) {
    console.error('更新题目复习时间失败:', error);
    throw error;
  }
};

/**
 * 获取需要复习的题目
 */
export const getReviewQuestions = async (thresholdDays = 7) => {
  // 离线模式下返回空数组
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：无法获取复习题目');
    return [];
  }

  const cacheKey = `review-questions-${thresholdDays}`;
  
  return requestManager.cachedRequest(cacheKey, async () => {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      const query = new AV.Query('Question');
      query.equalTo('createdBy', currentUser);
      query.lessThan('lastReviewedAt', thresholdDate);
      query.include('category');
      query.addAscending('lastReviewedAt');
      
      const questions = await query.find();
      
      return questions.map(question => formatQuestionResponse(question));
    } catch (error) {
      console.error('获取复习题目失败:', error);
      throw error;
    }
  });
};

const updateCategoryCountImmediately = async (category, change) => {
  // 离线模式下跳过分类计数更新
  if (offlineService.shouldUseOfflineData()) {
    return;
  }

  if (!category) return;
  
  const categoryId = getCategoryId(category);
  if (!categoryId) return;

  try {
    const categoryQuery = new AV.Query('Category');
    const freshCategory = await categoryQuery.get(categoryId);
    
    const currentCount = freshCategory.get('questionCount') || 0;
    const newCount = Math.max(0, currentCount + change);
    
    freshCategory.set('questionCount', newCount);
    await freshCategory.save();
    
    console.log(`分类 ${freshCategory.get('name')} 题目数量立即更新: ${currentCount} -> ${newCount}`);
    
    // 清除相关缓存
    // 注意：这里需要访问 categoryService 的缓存配置
    // 在实际项目中，你可能需要导入 categoryService 或使用共享的缓存管理器
    
  } catch (error) {
    console.error(`立即更新分类 ${categoryId} 题目数量失败:`, error);
  }
};

/**
 * 清除所有缓存
 */
export const clearAllCache = () => {
  requestManager.clearCache();
};

// 导出辅助函数
export { batchUpdateCategoryCounts, createCategoryPointer };