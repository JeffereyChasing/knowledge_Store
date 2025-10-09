// services/questionService.js
import AV from 'leancloud-storage';
import { offlineService } from './offlineService';
import { cacheService } from './cacheService';

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
 * 延迟函数
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 检查用户登录状态
 */
const checkUserAuth = () => {
  const currentUser = AV.User.current();
  if (!currentUser) {
    throw new Error('用户未登录');
  }
  return currentUser;
};

/**
 * 检查离线模式
 */
const checkOfflineMode = (operation = '操作') => {
  if (offlineService.shouldUseOfflineData()) {
    console.log(`📦 离线模式：无法${operation}`);
    throw new Error(`离线模式下无法${operation}`);
  }
};

/**
 * 创建题目
 */
export const createQuestion = async (questionData) => {
  checkOfflineMode('创建题目');

  try {
    const currentUser = checkUserAuth();

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
    
    return formatQuestionResponse(question);
  } catch (error) {
    console.error('创建题目失败:', error);
    throw error;
  }
};

/**
 * 获取类别的题目列表
 */
export const getQuestionsByCategory = async (categoryId, options = {}) => {
  // 离线模式下从缓存获取数据
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从缓存获取分类题目列表');
    const cached = await cacheService.getCachedQuestions();
    const categoryQuestions = cached.questions.filter(q => 
      q.category && getCategoryId(q.category) === categoryId
    );
    
    // 应用过滤条件
    let filteredQuestions = categoryQuestions;
    const { difficulty, proficiency, tag } = options;
    
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }
    if (proficiency) {
      filteredQuestions = filteredQuestions.filter(q => q.proficiency === proficiency);
    }
    if (tag) {
      filteredQuestions = filteredQuestions.filter(q => q.tags.includes(tag));
    }
    
    const { page = 1, pageSize = 10 } = options;
    const startIndex = (page - 1) * pageSize;
    const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + pageSize);
    
    return {
      data: paginatedQuestions,
      pagination: {
        current: page,
        pageSize,
        total: filteredQuestions.length,
        totalPages: Math.ceil(filteredQuestions.length / pageSize)
      }
    };
  }

  await delay(REQUEST_DELAY);
  
  try {
    const currentUser = checkUserAuth();

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
    query.include('category');
    
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
    
    const response = {
      data: results.map(result => formatQuestionResponse(result)),
      pagination: {
        current: page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
    
    return response;
  } catch (error) {
    console.error('获取题目列表失败:', error);
    throw new Error(`获取题目失败: ${error.message}`);
  }
};

/**
 * 根据ID获取单个题目详情
 */
export const getQuestionById = async (id) => {
  // 离线模式下从缓存获取数据
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从缓存获取单个题目详情');
    const cached = await cacheService.getCachedQuestions();
    const question = cached.questions.find(q => q.id === id || q.objectId === id);
    
    if (!question) {
      throw new Error('题目不存在或未缓存');
    }
    
    return question;
  }

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
};

/**
 * 批量获取题目详情（优化性能）
 */
export const getQuestionsBatch = async (questionIds) => {
  if (!questionIds || questionIds.length === 0) return [];

  // 离线模式下从缓存获取数据
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从缓存批量获取题目');
    const cached = await cacheService.getCachedQuestions();
    return cached.questions.filter(q => 
      questionIds.includes(q.id) || questionIds.includes(q.objectId)
    );
  }

  // 分批处理，避免过多请求
  const batches = [];
  for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
    batches.push(questionIds.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  
  for (const batch of batches) {
    await delay(REQUEST_DELAY);
    
    try {
      const currentUser = checkUserAuth();

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
  checkOfflineMode('删除题目');

  try {
    const currentUser = checkUserAuth();

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
  // 离线模式下从缓存搜索
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：在缓存中搜索题目');
    const cached = await cacheService.getCachedQuestions();
    
    const searchLower = searchTerm.toLowerCase();
    const searchedQuestions = cached.questions.filter(question => 
      question.title.toLowerCase().includes(searchLower) ||
      question.detailedAnswer.toLowerCase().includes(searchLower) ||
      question.oralAnswer.toLowerCase().includes(searchLower) ||
      question.code.toLowerCase().includes(searchLower) ||
      (question.tags && question.tags.some(tag => 
        tag.toLowerCase().includes(searchLower)
      ))
    );
    
    const { page = 1, pageSize = 10 } = options;
    const startIndex = (page - 1) * pageSize;
    const paginatedQuestions = searchedQuestions.slice(startIndex, startIndex + pageSize);
    
    return {
      data: paginatedQuestions,
      pagination: {
        current: page,
        pageSize,
        total: searchedQuestions.length,
        totalPages: Math.ceil(searchedQuestions.length / pageSize)
      }
    };
  }

  await delay(REQUEST_DELAY);
  
  try {
    const currentUser = checkUserAuth();

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
};

/**
 * 获取所有题目 - 确保获取全部数据
 */
export const getAllQuestions = async () => {
  // 离线模式处理
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从缓存获取所有题目数据');
    const cached = await cacheService.getCachedQuestions();
    return cached.questions;
  }

  await delay(REQUEST_DELAY);
  
  try {
    const currentUser = checkUserAuth();

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
    
    // 保存到缓存服务
    await cacheService.cacheQuestions(result);
    
    return result;
  } catch (error) {
    console.error('获取所有题目失败:', error);
    
    // 网络请求失败时，尝试使用缓存数据
    if (error.message.includes('offline') || error.message.includes('network') || error.message.includes('CORS')) {
      console.log('🌐 网络请求失败，尝试使用缓存数据');
      const cached = await cacheService.getCachedQuestions();
      return cached.questions;
    }
    
    throw error;
  }
};

/**
 * 更新题目
 */
export const updateQuestion = async (questionId, updateData) => {
  checkOfflineMode('更新题目');

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
  checkOfflineMode('更新复习时间');

  try {
    const currentUser = checkUserAuth();

    const question = AV.Object.createWithoutData('Question', questionId);
    question.set('lastReviewedAt', new Date());
    
    const result = await question.save();
    
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
  // 离线模式下从缓存获取
  if (offlineService.shouldUseOfflineData()) {
    console.log('📦 离线模式：从缓存获取复习题目');
    const cached = await cacheService.getCachedQuestions();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
    
    return cached.questions.filter(question => {
      if (!question.lastReviewedAt) return true;
      const lastReviewed = new Date(question.lastReviewedAt);
      return lastReviewed < thresholdDate;
    });
  }

  try {
    const currentUser = checkUserAuth();

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
};

/**
 * 立即更新分类计数
 */
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
  } catch (error) {
    console.error(`立即更新分类 ${categoryId} 题目数量失败:`, error);
  }
};

/**
 * 刷新缓存 - 重新获取所有数据并更新缓存
 */
export const refreshCache = async () => {
  try {
    console.log('🔄 开始刷新题目缓存');
    const questions = await getAllQuestions();
    await cacheService.cacheQuestions(questions);
    console.log('✅ 题目缓存刷新完成');
    return questions;
  } catch (error) {
    console.error('❌ 刷新缓存失败:', error);
    throw error;
  }
};

// 导出辅助函数
export { batchUpdateCategoryCounts, createCategoryPointer };