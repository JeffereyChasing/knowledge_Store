// services/categoryService.js
import AV from 'leancloud-storage';
import { offlineService } from './offlineService';

// 初始化
let isInitialized = false;

export const initAV = () => {
  // 在离线模式下不初始化 LeanCloud
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：跳过 LeanCloud 初始化');
    return;
  }


  
  AV.init({
    appId: process.env.REACT_APP_LC_APP_ID,
    appKey: process.env.REACT_APP_LC_APP_KEY,
    serverURL: process.env.REACT_APP_LC_SERVER_URL
  });
};

/**
 * 查询选项
 */
export const QueryOptions = {
  SORT_BY_NAME: 'name',
  SORT_BY_QUESTION_COUNT: 'questionCount',
  SORT_BY_UPDATED_AT: 'updatedAt'
};

// 缓存配置
const cacheConfig = {
  // 分类列表缓存（5分钟）
  categories: {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000
  },
  // 分类详情缓存（3分钟）
  categoryDetails: new Map(),
  categoryDetailTtl: 3 * 60 * 1000,
  // 题目数量统计缓存（2分钟）
  questionCounts: new Map(),
  questionCountTtl: 2 * 60 * 1000
};

// 离线数据存储键
const OFFLINE_CATEGORIES_KEY = 'offline_categories';

/**
 * 清除所有缓存
 */
export const clearCategoryCache = () => {
  cacheConfig.categories.data = null;
  cacheConfig.categories.timestamp = 0;
  cacheConfig.categoryDetails.clear();
  cacheConfig.questionCounts.clear();
};

/**
 * 清除特定分类的缓存
 */
export const clearCategoryCacheById = (categoryId) => {
  if (categoryId) {
    cacheConfig.categoryDetails.delete(categoryId);
    cacheConfig.questionCounts.delete(categoryId);
  }
  // 同时清除分类列表缓存
  cacheConfig.categories.data = null;
  cacheConfig.categories.timestamp = 0;
};

/**
 * 检查缓存是否有效
 */
const isCacheValid = (timestamp, ttl) => {
  return timestamp && (Date.now() - timestamp < ttl);
};

/**
 * 获取离线分类数据
 */
const getOfflineCategories = () => {
  try {
    const cached = localStorage.getItem(OFFLINE_CATEGORIES_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      //('📦 从离线存储加载分类数据:', data.data.length, '个分类');
      return data;
    }
    
    // 如果没有离线数据，返回空数据
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 50
    };
  } catch (error) {
    console.error('获取离线分类数据失败:', error);
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 50
    };
  }
};

/**
 * 保存分类数据到离线存储
 */
const saveCategoriesToOffline = (categories) => {
  try {
    const data = {
      data: categories,
      total: categories.length,
      page: 1,
      pageSize: 50,
      timestamp: Date.now()
    };
    localStorage.setItem(OFFLINE_CATEGORIES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存分类数据到离线存储失败:', error);
  }
};

/**
 * 批量获取分类题目数量（修复版本）
 */
const getCategoriesQuestionCounts = async (categories) => {
  // 离线模式下返回空计数
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：跳过题目数量统计');
    const counts = {};
    categories.forEach(cat => {
      counts[cat.id] = 0;
    });
    return counts;
  }

  try {
    const categoryIds = categories.map(cat => cat.id);
    const questionCounts = {};
    const now = Date.now();
    
    // 初始化所有分类的计数为0
    categoryIds.forEach(categoryId => {
      questionCounts[categoryId] = 0;
    });
    
    // 检查缓存中已有的数据
    const uncachedCategoryIds = [];
    
    categoryIds.forEach(categoryId => {
      const cached = cacheConfig.questionCounts.get(categoryId);
      if (cached && isCacheValid(cached.timestamp, cacheConfig.questionCountTtl)) {
        questionCounts[categoryId] = cached.count;
      } else {
        uncachedCategoryIds.push(categoryId);
      }
    });
    
    // 如果有未缓存的分类，批量查询
    if (uncachedCategoryIds.length > 0) {
      try {
        // 方法1: 分别查询每个分类的题目数量（更准确）
        const countPromises = uncachedCategoryIds.map(async (categoryId) => {
          try {
            const categoryPointer = AV.Object.createWithoutData('Category', categoryId);
            const questionQuery = new AV.Query('Question');
            questionQuery.equalTo('category', categoryPointer);
            const count = await questionQuery.count();
            return { categoryId, count };
          } catch (error) {
            console.warn(`获取分类 ${categoryId} 题目数量失败:`, error);
            return { categoryId, count: 0 };
          }
        });
        
        const countResults = await Promise.all(countPromises);
        
        // 更新计数
        countResults.forEach(({ categoryId, count }) => {
          questionCounts[categoryId] = count;
        });
        
        // 更新缓存
        countResults.forEach(({ categoryId, count }) => {
          cacheConfig.questionCounts.set(categoryId, {
            count,
            timestamp: now
          });
        });
        
      } catch (batchError) {
        console.warn('批量获取题目数量失败，尝试备用方案:', batchError);
        
        // 备用方案：使用 containedIn 查询
        try {
          const categoryPointers = uncachedCategoryIds.map(id => 
            AV.Object.createWithoutData('Category', id)
          );
          
          const questionQuery = new AV.Query('Question');
          questionQuery.containedIn('category', categoryPointers);
          questionQuery.select(['category']);
          
          const questions = await questionQuery.find();
          
          // 统计题目数量
          questions.forEach(question => {
            const category = question.get('category');
            if (category) {
              const categoryId = category.id;
              questionCounts[categoryId] = (questionCounts[categoryId] || 0) + 1;
            }
          });
          
          // 更新缓存
          uncachedCategoryIds.forEach(categoryId => {
            const count = questionCounts[categoryId] || 0;
            cacheConfig.questionCounts.set(categoryId, {
              count,
              timestamp: now
            });
          });
        } catch (fallbackError) {
          console.warn('备用方案也失败:', fallbackError);
        }
      }
    }
    
    return questionCounts;
  } catch (error) {
    console.warn('批量获取题目数量失败:', error);
    return {};
  }
};

/**
 * 获取所有类别（不分页）- 带缓存
 */
export const getAllCategories = async () => {
  // 离线模式处理
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：从本地存储获取分类数据');
    const offlineData = getOfflineCategories();
    return offlineData.data || [];
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 检查缓存
    const now = Date.now();
    if (cacheConfig.categories.data && 
        isCacheValid(cacheConfig.categories.timestamp, cacheConfig.categories.ttl)) {
      return cacheConfig.categories.data;
    }

    const query = new AV.Query('Category');
    query.equalTo('createdBy', currentUser);
    query.include('createdBy');
    query.descending('updatedAt');
    
    const categories = await query.find();
    
    // 批量获取题目数量
    const questionCounts = await getCategoriesQuestionCounts(categories);
    
    const result = categories.map(category => ({
      id: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: questionCounts[category.id] !== undefined 
        ? questionCounts[category.id] 
        : category.get('questionCount') || 0,
      createdAt: category.get('createdAt'),
      updatedAt: category.get('updatedAt'),
      createdBy: category.get('createdBy')
    }));

    // 更新缓存和离线存储
    cacheConfig.categories.data = result;
    cacheConfig.categories.timestamp = now;
    saveCategoriesToOffline(result);

    return result;
  } catch (error) {
    console.error('获取所有分类失败:', error);
    
    // 网络请求失败时，尝试使用离线数据
    if (error.message.includes('offline') || error.message.includes('network') || error.message.includes('CORS')) {
      //('🌐 网络请求失败，尝试使用离线数据');
      const offlineData = getOfflineCategories();
      return offlineData.data || [];
    }
    
    throw error;
  }
};

/**
 * 分页获取类别列表 - 带缓存
 */
export const getCategories = async (options = {}) => {
  // 离线模式处理
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：从本地存储获取分类数据');
    return getOfflineCategories();
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 检查缓存（仅对默认查询使用缓存）
    const isDefaultQuery = !options.page && !options.pageSize && 
                          (!options.sortBy || options.sortBy === QueryOptions.SORT_BY_UPDATED_AT);
    
    const now = Date.now();
    if (isDefaultQuery && cacheConfig.categories.data && 
        isCacheValid(cacheConfig.categories.timestamp, cacheConfig.categories.ttl)) {
      return {
        data: cacheConfig.categories.data,
        total: cacheConfig.categories.data.length,
        page: 1,
        pageSize: cacheConfig.categories.data.length
      };
    }

    const query = new AV.Query('Category');
    query.equalTo('createdBy', currentUser);
    
    // 设置排序
    if (options.sortBy === QueryOptions.SORT_BY_UPDATED_AT) {
      query.descending('updatedAt');
    } else if (options.sortBy === QueryOptions.SORT_BY_CREATED_AT) {
      query.descending('createdAt');
    } else {
      query.descending('updatedAt');
    }

    // 设置分页
    if (options.page && options.pageSize) {
      const skip = (options.page - 1) * options.pageSize;
      query.limit(options.pageSize);
      query.skip(skip);
    }

    const categories = await query.find();
    
    // 批量获取题目数量
    const questionCounts = await getCategoriesQuestionCounts(categories);

    const categoriesWithCount = categories.map((category) => ({
      id: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: questionCounts[category.id] !== undefined 
        ? questionCounts[category.id] 
        : category.get('questionCount') || 0,
      createdAt: category.get('createdAt'),
      updatedAt: category.get('updatedAt'),
      createdBy: category.get('createdBy')
    }));

    const result = {
      data: categoriesWithCount,
      total: categoriesWithCount.length,
      page: options.page || 1,
      pageSize: options.pageSize || categoriesWithCount.length
    };

    // 如果是默认查询，更新缓存和离线存储
    if (isDefaultQuery) {
      cacheConfig.categories.data = categoriesWithCount;
      cacheConfig.categories.timestamp = now;
      saveCategoriesToOffline(categoriesWithCount);
    }

    return result;
  } catch (error) {
    console.error('获取分类失败:', error);
    
    // 网络请求失败时，尝试使用离线数据
    if (error.message.includes('offline') || error.message.includes('network') || error.message.includes('CORS')) {
      //('🌐 网络请求失败，尝试使用离线数据');
      return getOfflineCategories();
    }
    
    throw error;
  }
};

/**
 * 根据ID获取单个类别详情 - 带缓存
 */
export const getCategoryById = async (categoryId) => {
  // 离线模式下返回空数据
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：无法获取单个分类详情');
    throw new Error('离线模式下无法获取分类详情');
  }

  try {
    // 检查缓存
    const cached = cacheConfig.categoryDetails.get(categoryId);
    const now = Date.now();
    if (cached && isCacheValid(cached.timestamp, cacheConfig.categoryDetailTtl)) {
      return cached.data;
    }

    const query = new AV.Query('Category');
    const category = await query.get(categoryId);
    
    if (!category) {
      throw new Error('未找到该类别');
    }
    
    // 获取准确的题目数量
    let questionCount = category.get('questionCount') || 0;
    try {
      const questionQuery = new AV.Query('Question');
      questionQuery.equalTo('category', category);
      questionCount = await questionQuery.count();
    } catch (countError) {
      console.warn('获取题目数量失败，使用缓存值:', countError);
    }
    
    const result = {
      id: category.id,
      name: category.get('name'),
      questionCount,
      updatedAt: category.updatedAt,
      createdAt: category.createdAt
    };

    // 更新缓存
    cacheConfig.categoryDetails.set(categoryId, {
      data: result,
      timestamp: now
    });

    return result;
  } catch (error) {
    console.error('获取类别详情失败:', error);
    throw new Error(`获取详情失败: ${error.message}`);
  }
};

/**
 * 获取分类及其题目列表 - 带缓存
 */
export const getCategoryWithQuestions = async (categoryId) => {
  // 离线模式下返回空数据
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：无法获取分类题目列表');
    throw new Error('离线模式下无法获取分类题目列表');
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 获取分类
    const categoryQuery = new AV.Query('Category');
    const category = await categoryQuery.get(categoryId);
    
    // 验证分类是否属于当前用户
    const categoryCreator = category.get('createdBy');
    if (categoryCreator.id !== currentUser.id) {
      throw new Error('无权访问此分类');
    }

    // 获取该分类下的题目
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    questionQuery.equalTo('createdBy', currentUser);
    questionQuery.include('category');
    questionQuery.descending('updatedAt');
    
    const questions = await questionQuery.find();
    
    const formattedQuestions = questions.map(question => ({
      id: question.id,
      title: question.get('title'),
      detailedAnswer: question.get('detailedAnswer'),
      oralAnswer: question.get('oralAnswer'),
      code: question.get('code'),
      difficulty: question.get('difficulty'),
      appearanceLevel: question.get('appearanceLevel'),
      proficiency: question.get('proficiency'),
      tags: question.get('tags') || [],
      category: {
        id: question.get('category').id,
        name: question.get('category').get('name')
      },
      createdAt: question.get('createdAt'),
      updatedAt: question.get('updatedAt')
    }));

    const result = {
      category: {
        id: category.id,
        name: category.get('name'),
        description: category.get('description'),
        questionCount: questions.length,
        createdAt: category.get('createdAt'),
        updatedAt: category.get('updatedAt')
      },
      questions: formattedQuestions
    };

    // 更新题目数量缓存
    const now = Date.now();
    cacheConfig.questionCounts.set(categoryId, {
      count: questions.length,
      timestamp: now
    });

    return result;
  } catch (error) {
    console.error('获取分类详情失败:', error);
    throw error;
  }
};

/**
 * 创建新类别 - 清除相关缓存
 */
export const createCategory = async (categoryData) => {
  // 离线模式下不允许创建分类
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法创建分类');
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const Category = AV.Object.extend('Category');
    const category = new Category();
    
    category.set('name', categoryData.name);
    category.set('description', categoryData.description || '');
    category.set('createdBy', currentUser);

    // 设置 ACL 权限
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, true);
    acl.setPublicReadAccess(false);
    category.setACL(acl);

    await category.save();
    
    // 清除分类列表缓存
    clearCategoryCache();

    return {
      id: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: 0,
      createdAt: category.get('createdAt'),
      updatedAt: category.get('updatedAt')
    };
  } catch (error) {
    console.error('创建分类失败:', error);
    throw error;
  }
};

/**
 * 更新类别 - 清除相关缓存
 */
export const updateCategory = async (categoryId, updateData) => {
  // 离线模式下不允许更新分类
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法更新分类');
  }

  try {
    if (updateData.name && updateData.name.trim() === '') {
      throw new Error('类别名不能为空');
    }

    const category = AV.Object.createWithoutData('Category', categoryId);
    
    if (updateData.name) {
      category.set('name', updateData.name.trim());
    }
    
    const updatedCategory = await category.save();
    
    // 清除相关缓存
    clearCategoryCacheById(categoryId);

    return {
      id: updatedCategory.id,
      name: updatedCategory.get('name'),
      questionCount: updatedCategory.get('questionCount'),
      updatedAt: updatedCategory.updatedAt
    };
  } catch (error) {
    console.error('更新类别失败:', error);
    throw new Error(`更新失败: ${error.message}`);
  }
};

/**
 * 更新类别题目计数 - 清除相关缓存
 */
export const updateCategoryQuestionCount = async (categoryId) => {
  // 离线模式下不允许更新计数
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法更新题目计数');
  }

  try {
    const category = AV.Object.createWithoutData('Category', categoryId);
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    
    const count = await questionQuery.count();
    
    category.set('questionCount', count);
    await category.save();
    
    // 清除相关缓存
    clearCategoryCacheById(categoryId);

    return count;
  } catch (error) {
    console.error('更新题目计数失败:', error);
    throw error;
  }
};

/**
 * 删除类别 - 清除相关缓存
 */
export const deleteCategory = async (categoryId) => {
  // 离线模式下不允许删除分类
  if (offlineService.shouldUseOfflineData()) {
    throw new Error('离线模式下无法删除分类');
  }

  try {
    const category = AV.Object.createWithoutData('Category', categoryId);
    
    // 先删除该类别下的所有题目
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    const questions = await questionQuery.find();
    
    let deletedQuestions = 0;
    if (questions.length > 0) {
      await AV.Object.destroyAll(questions);
      deletedQuestions = questions.length;
    }
    
    // 再删除类别本身
    await category.destroy();
    
    // 清除相关缓存
    clearCategoryCacheById(categoryId);

    return { 
      success: true, 
      message: `类别及关联的 ${deletedQuestions} 个题目已删除`,
      deletedQuestions
    };
  } catch (error) {
    console.error('删除类别失败:', error);
    throw new Error(`删除失败: ${error.message}`);
  }
};

/**
 * 批量获取类别统计信息 - 带缓存
 */
export const getCategoriesStats = async () => {
  try {
    const categories = await getAllCategories(); // 使用带缓存的函数
    
    const stats = {
      totalCategories: categories.length,
      totalQuestions: categories.reduce((sum, cat) => sum + (cat.questionCount || 0), 0),
      averageQuestionsPerCategory: categories.length > 0 
        ? (categories.reduce((sum, cat) => sum + (cat.questionCount || 0), 0) / categories.length).toFixed(1)
        : 0,
      categoriesWithQuestions: categories.filter(cat => (cat.questionCount || 0) > 0).length,
      emptyCategories: categories.filter(cat => (cat.questionCount || 0) === 0).length
    };
    
    return stats;
  } catch (error) {
    console.error('获取类别统计失败:', error);
    throw new Error(`获取统计失败: ${error.message}`);
  }
};

/**
 * 搜索类别 - 不使用缓存
 */
export const searchCategories = async (searchTerm, options = {}) => {
  // 离线模式下返回空结果
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：无法搜索分类');
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

  try {
    const { page = 1, pageSize = 10 } = options;
    
    const query = new AV.Query('Category');
    query.contains('name', searchTerm);
    query.addDescending('updatedAt');
    query.limit(pageSize);
    query.skip((page - 1) * pageSize);
    
    const results = await query.find();
    const totalCount = await query.count();
    
    return {
      data: results.map(result => ({
        id: result.id,
        name: result.get('name'),
        questionCount: result.get('questionCount') || 0,
        updatedAt: result.updatedAt,
        createdAt: result.createdAt
      })),
      pagination: {
        current: page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
  } catch (error) {
    console.error('搜索类别失败:', error);
    throw new Error(`搜索失败: ${error.message}`);
  }
};

/**
 * 获取分类下的题目 - 不使用缓存（因为题目经常变动）
 */
export const getQuestionsByCategory = async (categoryId, options = {}) => {
  // 离线模式下返回空结果
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：无法获取分类题目');
    return {
      data: []
    };
  }

  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const { 
      page = 1, 
      pageSize = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;
    
    const categoryPointer = AV.Object.createWithoutData('Category', categoryId);
    const query = new AV.Query('Question');
    
    query.equalTo('category', categoryPointer);
    query.equalTo('createdBy', currentUser);
    query.include('category');
    
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
    
    return {
      data: results.map(question => {
        const category = question.get('category');
        return {
          id: question.id,
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
      })
    };
  } catch (error) {
    console.error('获取分类题目失败:', error);
    throw new Error(`获取题目失败: ${error.message}`);
  }
};

// 获取所有题目（分页方式）
export const getAllQuestionsPaginated = async (options = {}) => {
  // 离线模式下返回空结果
  if (offlineService.shouldUseOfflineData()) {
    //('📦 离线模式：无法获取分页题目');
    return {
      data: [],
      total: 0,
      hasMore: false
    };
  }

  const {
    page = 0,
    pageSize = 50,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = options;

  try {
    const query = new AV.Query('Question');
    
    // 包含分类信息
    query.include('category');
    
    // 排序
    if (sortBy === 'title') {
      query.addAscending('title');
    } else if (sortBy === 'difficulty') {
      query.addAscending('difficulty');
    } else if (sortBy === 'appearanceLevel') {
      query.addDescending('appearanceLevel');
    } else {
      query.addDescending('updatedAt');
    }
    
    // 分页
    query.limit(pageSize);
    query.skip(page * pageSize);
    
    const results = await query.find();
    
    const questions = results.map(item => ({
      id: item.id,
      title: item.get('title'),
      detailedAnswer: item.get('detailedAnswer'),
      oralAnswer: item.get('oralAnswer'),
      code: item.get('code'),
      difficulty: item.get('difficulty'),
      proficiency: item.get('proficiency'),
      appearanceLevel: item.get('appearanceLevel'),
      tags: item.get('tags') || [],
      lastReviewedAt: item.get('lastReviewedAt'),
      createdAt: item.get('createdAt'),
      updatedAt: item.get('updatedAt'),
      category: item.get('category') ? {
        id: item.get('category').id,
        name: item.get('category').get('name'),
        description: item.get('category').get('description')
      } : null
    }));
    
    return {
      data: questions,
      total: questions.length,
      hasMore: questions.length === pageSize
    };
  } catch (error) {
    console.error('获取题目失败:', error);
    throw error;
  }
};