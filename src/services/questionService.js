// services/questionService.js
import AV from 'leancloud-storage';

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

/**
 * 更新分类题目数量的辅助函数
 */
const updateCategoryQuestionCount = async (category, change) => {
  try {
    // 如果 category 是 Pointer 对象，需要先获取它的 ID
    let categoryId;
    
    if (typeof category === 'string') {
      // 如果直接传入的是分类ID
      categoryId = category;
    } else if (category.id) {
      // 如果是 Pointer 对象
      categoryId = category.id;
    } else if (category.objectId) {
      // 如果是 LeanCloud 对象
      categoryId = category.objectId;
    } else {
      console.error('无法识别的分类对象:', category);
      return;
    }
    
    // 重新获取分类对象以确保数据最新
    const categoryQuery = new AV.Query('Category');
    const freshCategory = await categoryQuery.get(categoryId);
    
    const currentCount = freshCategory.get('questionCount') || 0;
    const newCount = Math.max(0, currentCount + change); // 确保不会变成负数
    
    freshCategory.set('questionCount', newCount);
    await freshCategory.save();
    
    console.log(`分类 ${freshCategory.get('name')} 题目数量更新: ${currentCount} -> ${newCount}`);
  } catch (error) {
    console.error('更新分类题目数量失败:', error);
    // 这里不抛出错误，因为主要操作（创建/删除题目）已经成功
  }
};

/**
 * 创建题目
 */
export const createQuestion = async (questionData) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const Question = AV.Object.extend('Question');
    const question = new Question();
    
    question.set('title', questionData.title);
    question.set('detailedAnswer', questionData.detailedAnswer || '');
    question.set('oralAnswer', questionData.oralAnswer || '');
    question.set('code', questionData.code || '');
    question.set('url', questionData.url || '');
    question.set('tags', questionData.tags || []);
    question.set('difficulty', questionData.difficulty);
    question.set('proficiency', questionData.proficiency);
    question.set('appearanceLevel', questionData.appearanceLevel || 50);
    question.set('createdBy', currentUser);

    // 设置分类
    if (questionData.categoryId) {
      const category = AV.Object.createWithoutData('Category', questionData.categoryId);
      question.set('category', category);
      
      // 更新分类的题目数量缓存
      await updateCategoryQuestionCount(category, 1);
    }

    // 设置 ACL 权限
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, true);
    acl.setPublicReadAccess(false);
    question.setACL(acl);

    await question.save();
    
    return {
      id: question.id,
      title: question.get('title'),
      detailedAnswer: question.get('detailedAnswer'),
      oralAnswer: question.get('oralAnswer'),
      code: question.get('code'),
      url: question.get('url'),
      tags: question.get('tags'),
      difficulty: question.get('difficulty'),
      proficiency: question.get('proficiency'),
      appearanceLevel: question.get('appearanceLevel'),
      category: questionData.categoryId ? {
        id: questionData.categoryId,
        name: questionData.categoryName
      } : null,
      createdAt: question.get('createdAt'),
      updatedAt: question.get('updatedAt')
    };
  } catch (error) {
    console.error('创建题目失败:', error);
    throw error;
  }
};

/**
 * 获取类别的题目列表
 */
export const getQuestionsByCategory = async (categoryId, options = {}) => {
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
    
    const category = AV.Object.createWithoutData('Category', categoryId);
    const query = new AV.Query('Question');
    
    query.equalTo('category', category);
    query.equalTo('createdBy', currentUser); // 只查询当前用户的题目
    
    // 过滤条件
    if (difficulty) {
      query.equalTo('difficulty', difficulty);
    }
    
    if (proficiency) {
      query.equalTo('proficiency', proficiency);
    }
    
    if (tag) {
      query.containsAll('tags', [tag]);
    }
    
    // 排序
    if (sortOrder === 'asc') {
      query.addAscending(sortBy);
    } else {
      query.addDescending(sortBy);
    }
    
    // 分页
    query.limit(pageSize);
    query.skip((page - 1) * pageSize);
    
    // 选择需要的字段 - 包含 appearanceLevel
    query.select([
      'title', 
      'detailedAnswer', 
      'oralAnswer', 
      'code', 
      'url', 
      'tags', 
      'difficulty', 
      'proficiency', 
      'updatedAt',
      'appearanceLevel' // 添加 appearanceLevel
    ]);
    
    const results = await query.find();
    const totalCount = await query.count();
    
    return {
      data: results.map(result => {
        const category = result.get('category');
        return {
          id: result.id,
          title: result.get('title'),
          detailedAnswer: result.get('detailedAnswer'),
          oralAnswer: result.get('oralAnswer'),
          code: result.get('code'),
          url: result.get('url'),
          tags: result.get('tags') || [],
          difficulty: result.get('difficulty'),
          proficiency: result.get('proficiency'),
          appearanceLevel: result.get('appearanceLevel') || 50, // 确保返回 appearanceLevel
          category: category ? {
            id: category.id,
            name: category.get('name')
          } : null,
          updatedAt: result.get('updatedAt') || result.createdAt,
          createdAt: result.createdAt
        };
      }),
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
};

/**
 * 根据ID获取单个题目详情
 */
export const getQuestionById = async (questionId) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const query = new AV.Query('Question');
    query.equalTo('objectId', questionId);
    query.equalTo('createdBy', currentUser); // 验证用户权限
    query.include('category');
    
    // 选择需要的字段 - 包含 appearanceLevel
    query.select([
      'title', 
      'detailedAnswer', 
      'oralAnswer', 
      'code', 
      'url', 
      'tags', 
      'difficulty', 
      'proficiency', 
      'appearanceLevel'
    ]);
    
    const question = await query.get(questionId);
    
    if (!question) {
      throw new Error('未找到该题目或无权访问');
    }
    
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
      appearanceLevel: question.get('appearanceLevel') || 50, // 确保返回 appearanceLevel
      category: category ? {
        id: category.id,
        name: category.get('name')
      } : null,
      updatedAt: question.get('updatedAt') || question.createdAt,
      createdAt: question.createdAt
    };
  } catch (error) {
    console.error('获取题目详情失败:', error);
    throw new Error(`获取题目详情失败: ${error.message}`);
  }
};

/**
 * 删除题目
 */
export const deleteQuestion = async (questionId) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 验证题目是否属于当前用户
    const query = new AV.Query('Question');
    query.equalTo('objectId', questionId);
    query.equalTo('createdBy', currentUser);
    const question = await query.first();
    
    if (!question) {
      throw new Error('题目不存在或无权删除');
    }

    // 获取分类信息用于更新计数
    const category = question.get('category');
    
    await question.destroy();
    
    // 更新分类的题目数量缓存
    if (category) {
      await updateCategoryQuestionCount(category, -1);
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
    // 选择需要的字段 - 包含 appearanceLevel
    query.select([
      'title', 
      'detailedAnswer', 
      'oralAnswer', 
      'code', 
      'url', 
      'tags', 
      'difficulty', 
      'proficiency', 
      'appearanceLevel'
    ]);
    query.addDescending('updatedAt');
    query.limit(pageSize);
    query.skip((page - 1) * pageSize);
    
    const results = await query.find();
    const totalCount = await query.count();
    
    return {
      data: results.map(result => {
        const category = result.get('category');
        return {
          id: result.id,
          title: result.get('title'),
          detailedAnswer: result.get('detailedAnswer'),
          oralAnswer: result.get('oralAnswer'),
          code: result.get('code'),
          url: result.get('url'),
          tags: result.get('tags') || [],
          difficulty: result.get('difficulty'),
          proficiency: result.get('proficiency'),
          appearanceLevel: result.get('appearanceLevel') || 50, // 确保返回 appearanceLevel
          category: category ? {
            id: category.id,
            name: category.get('name')
          } : null,
          updatedAt: result.get('updatedAt') || result.createdAt,
          createdAt: result.createdAt
        };
      }),
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
 * 获取所有题目
 */
export const getAllQuestions = async () => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const query = new AV.Query('Question');
    query.equalTo('createdBy', currentUser); // 只查询当前用户的题目
    query.include('category');
    query.descending('updatedAt');
    
    const questions = await query.find();
    
    return questions.map(question => ({
      id: question.id,
      title: question.get('title'),
      detailedAnswer: question.get('detailedAnswer'),
      oralAnswer: question.get('oralAnswer'),
      code: question.get('code'),
      difficulty: question.get('difficulty'),
      appearanceLevel: question.get('appearanceLevel'),
      proficiency: question.get('proficiency'),
      tags: question.get('tags') || [],
      category: question.get('category') ? {
        id: question.get('category').id,
        name: question.get('category').get('name')
      } : null,
      createdAt: question.get('createdAt'),
      updatedAt: question.get('updatedAt')
    }));
  } catch (error) {
    console.error('获取所有题目失败:', error);
    throw error;
  }
};

/**
 * 更新题目
 */
export const updateQuestion = async (questionId, updates) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const question = AV.Object.createWithoutData('Question', questionId);
    
    // 验证题目是否属于当前用户
    const query = new AV.Query('Question');
    query.equalTo('objectId', questionId);
    query.equalTo('createdBy', currentUser);
    const originalQuestion = await query.first();
    
    if (!originalQuestion) {
      throw new Error('题目不存在或无权修改');
    }

    Object.keys(updates).forEach(key => {
      question.set(key, updates[key]);
    });

    await question.save();
    return question;
  } catch (error) {
    console.error('更新题目失败:', error);
    throw error;
  }
};

// 导出辅助函数（如果需要）
export { updateCategoryQuestionCount };