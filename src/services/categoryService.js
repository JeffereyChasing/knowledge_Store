// services/categoryService.js
import AV from 'leancloud-storage';

// 初始化
export const initAV = () => {
  AV.init({
    appId: process.env.REACT_APP_LC_APP_ID,  // React 项目
    // appId: process.env.VUE_APP_LC_APP_ID, // Vue 项目
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

/**
 * 获取所有类别（不分页）
 */
export const getAllCategories = async () => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const query = new AV.Query('Category');
    query.equalTo('createdBy', currentUser); // 只查询当前用户的分类
    query.include('createdBy'); // 包含创建者信息
    query.descending('updatedAt');
    
    const categories = await query.find();
    
    return categories.map(category => ({
      id: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: category.get('questionCount') || 0,
      createdAt: category.get('createdAt'),
      updatedAt: category.get('updatedAt'),
      createdBy: category.get('createdBy') // 确保返回创建者信息
    }));
  } catch (error) {
    console.error('获取所有分类失败:', error);
    throw error;
  }
};

/**
 * 分页获取类别列表
 */
export const getCategories = async (options = {}) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const query = new AV.Query('Category');
    query.equalTo('createdBy', currentUser);
    
    if (options.sortBy === QueryOptions.SORT_BY_UPDATED_AT) {
      query.descending('updatedAt');
    } else if (options.sortBy === QueryOptions.SORT_BY_CREATED_AT) {
      query.descending('createdAt');
    } else {
      query.descending('updatedAt');
    }

    if (options.page && options.pageSize) {
      const skip = (options.page - 1) * options.pageSize;
      query.limit(options.pageSize);
      query.skip(skip);
    }

    const categories = await query.find();
    
    // 直接使用缓存的题目数量，不需要额外查询
    const categoriesWithCount = categories.map((category) => ({
      id: category.id,
      name: category.get('name'),
      description: category.get('description'),
      questionCount: category.get('questionCount') || 0, // 使用缓存字段
      createdAt: category.get('createdAt'),
      updatedAt: category.get('updatedAt'),
      createdBy: category.get('createdBy')
    }));

    return {
      data: categoriesWithCount,
      total: categoriesWithCount.length,
      page: options.page || 1,
      pageSize: options.pageSize || categoriesWithCount.length
    };
  } catch (error) {
    console.error('获取分类失败:', error);
    throw error;
  }
};
/**
 * 根据ID获取单个类别详情
 */
export const getCategoryById = async (categoryId) => {
  try {
    const query = new AV.Query('Category');
    const category = await query.get(categoryId);
    
    if (!category) {
      throw new Error('未找到该类别');
    }
    
    return {
      id: category.id,
      name: category.get('name'),
      questionCount: category.get('questionCount') || 0,
      updatedAt: category.updatedAt,
      createdAt: category.createdAt
    };
  } catch (error) {
    console.error('获取类别详情失败:', error);
    throw new Error(`获取详情失败: ${error.message}`);
  }
};

/**
 * 获取分类及其题目列表
 */
export const getCategoryWithQuestions = async (categoryId) => {
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
    questionQuery.equalTo('createdBy', currentUser); // 只查询当前用户的题目
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

    return {
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
  } catch (error) {
    console.error('获取分类详情失败:', error);
    throw error;
  }
};


/**
 * 创建新类别
 */
export const createCategory = async (categoryData) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const Category = AV.Object.extend('Category');
    const category = new Category();
    
    category.set('name', categoryData.name);
    category.set('description', categoryData.description || '');
    category.set('createdBy', currentUser); // 设置创建者

    // 设置 ACL 权限
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, true);
    acl.setPublicReadAccess(false);
    category.setACL(acl);

    await category.save();
    
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
 * 更新类别（主要更新名称）
 */
export const updateCategory = async (categoryId, updateData) => {
  try {
    // 验证必需字段
    if (updateData.name && updateData.name.trim() === '') {
      throw new Error('类别名不能为空');
    }

    const category = AV.Object.createWithoutData('Category', categoryId);
    
    if (updateData.name) {
      category.set('name', updateData.name.trim());
    }
    
    const updatedCategory = await category.save();
    
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
 * 更新类别题目计数
 */
export const updateCategoryQuestionCount = async (categoryId) => {
  try {
    const category = AV.Object.createWithoutData('Category', categoryId);
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    questionQuery.equalTo('isActive', true);
    
    const count = await questionQuery.count();
    
    category.set('questionCount', count);
    await category.save();
    
    return count;
  } catch (error) {
    console.error('更新题目计数失败:', error);
    throw error;
  }
};

/**
 * 删除类别（同时删除关联的题目）
 */
export const deleteCategory = async (categoryId) => {
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
 * 批量获取类别统计信息
 */
export const getCategoriesStats = async () => {
  try {
    const categories = await getAllCategories();
    
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
 * 搜索类别
 */
export const searchCategories = async (searchTerm, options = {}) => {
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