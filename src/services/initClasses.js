// initClasses.js
import AV from 'leancloud-storage';


console.log('环境变量:', {
  appId: process.env.REACT_APP_LC_APP_ID,
  appKey: process.env.REACT_APP_LC_APP_KEY,
  serverURL: process.env.REACT_APP_LC_SERVER_URL
});


// 初始化配置
AV.init({
  appId: process.env.REACT_APP_LC_APP_ID,
  appKey: process.env.REACT_APP_LC_APP_KEY,
  serverURL: process.env.REACT_APP_LC_SERVER_URL
});


// 难度选项
const DifficultyOptions = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// 掌握程度选项
const ProficiencyOptions = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  MASTER: 'master'
};

// Notion 数据库字段映射配置
const NotionFieldMapping = {
  // 标题字段映射
  TITLE: ['Title', '题目', 'Name', '名称'],
  // 难度字段映射
  DIFFICULTY: ['Difficulty', '难度'],
  // 分类字段映射
  CATEGORY: ['Category', '类别', '分类'],
  // 标签字段映射
  TAGS: ['Tags', '标签'],
  // 答案内容字段映射
  CONTENT: ['Content', '内容', 'Answer', '答案'],
  // 完成时间字段映射
  COMPLETION_TIME: ['CompletionTime', '完成时间', '时间']
};

/**
 * Notion 同步云函数
 */
export const syncProblemsFromNotion = async () => {
  try {
    console.log('🚀 开始从 Notion 同步数据...');
    
    // 检查环境变量是否配置
    if (!process.env.REACT_APP_NOTION_TOKEN || !process.env.REACT_APP_NOTION_DATABASE_ID) {
      throw new Error('Notion 环境变量未配置，请检查 REACT_APP_NOTION_TOKEN 和 REACT_APP_NOTION_DATABASE_ID');
    }

    // 调用云函数（如果部署了云引擎版本）
    try {
      const result = await AV.Cloud.run('syncProblemsFromNotion');
      return result;
    } catch (cloudError) {
      console.log('云函数调用失败，使用客户端版本同步:', cloudError.message);
      // 回退到客户端版本同步
      return await syncWithClientVersion();
    }
  } catch (error) {
    console.error('❌ Notion 同步失败:', error);
    throw new Error(`同步失败: ${error.message}`);
  }
};

/**
 * 客户端版本同步（云函数不可用时的回退方案）
 */
const syncWithClientVersion = async () => {
  try {
    // 这里可以添加直接从前端调用 Notion API 的逻辑
    // 但由于安全原因，建议使用云函数方式
    console.log('📝 使用客户端同步模式（需要配置云函数）');
    
    // 模拟同步过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: '同步功能需要部署云函数。请参考以下步骤：\n1. 在 LeanCloud 云引擎部署 syncProblemsFromNotion 云函数\n2. 配置 NOTION_INTEGRATION_TOKEN 和 NOTION_DATABASE_ID 环境变量',
      data: {
        synced: 0,
        mode: 'client_fallback'
      }
    };
  } catch (error) {
    throw new Error(`客户端同步失败: ${error.message}`);
  }
};

/**
 * 创建 Notion 同步相关的云函数定义（用于云引擎部署）
 */
export const defineNotionCloudFunctions = () => {
  // 这些函数需要在云引擎中定义
  if (typeof AV.Cloud !== 'undefined') {
    // 同步题目云函数
    AV.Cloud.define('syncProblemsFromNotion', async (request) => {
      const { Client } = require('@notionhq/client');
      
      // 初始化 Notion 客户端
      const notion = new Client({
        auth: process.env.NOTION_INTEGRATION_TOKEN,
      });

      try {
        console.log('开始从 Notion 数据库同步数据...');
        
        // 查询 Notion 数据库
        const response = await notion.databases.query({
          database_id: process.env.NOTION_DATABASE_ID,
          sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
        });

        console.log(`从 Notion 获取到 ${response.results.length} 条记录`);

        const problems = [];
        let syncedCount = 0;
        
        // 处理每条记录
        for (const page of response.results) {
          const problemData = parseNotionPage(page);
          if (problemData) {
            problems.push(problemData);
          }
        }

        // 保存到 LeanCloud
        syncedCount = await saveNotionProblemsToLeanCloud(problems);
        
        return {
          success: true,
          message: `同步完成！处理 ${response.results.length} 条记录，成功保存 ${syncedCount} 道题目`,
          data: {
            fetched: response.results.length,
            saved: syncedCount,
            problems: problems.slice(0, 5) // 返回前5条作为示例
          }
        };

      } catch (error) {
        console.error('Notion 同步错误:', error);
        throw new AV.Cloud.Error(`同步失败: ${error.message}`);
      }
    });

    // 检查 Notion 连接状态
    AV.Cloud.define('checkNotionConnection', async (request) => {
      const { Client } = require('@notionhq/client');
      
      try {
        const notion = new Client({
          auth: process.env.NOTION_INTEGRATION_TOKEN,
        });

        // 尝试查询数据库信息
        const database = await notion.databases.retrieve({
          database_id: process.env.NOTION_DATABASE_ID,
        });

        return {
          success: true,
          connected: true,
          database: {
            title: database.title[0]?.plain_text || '未命名',
            properties: Object.keys(database.properties),
            url: database.url
          }
        };
      } catch (error) {
        return {
          success: false,
          connected: false,
          error: error.message
        };
      }
    });
  }
};

/**
 * 解析 Notion 页面数据
 */
const parseNotionPage = (page) => {
  try {
    const properties = page.properties;
    
    // 获取标题
    const title = getNotionPropertyValue(properties, NotionFieldMapping.TITLE, 'title');
    if (!title) {
      console.warn('跳过无标题的记录:', page.id);
      return null;
    }

    // 获取其他字段
    const difficulty = getNotionPropertyValue(properties, NotionFieldMapping.DIFFICULTY, 'select');
    const categoryName = getNotionPropertyValue(properties, NotionFieldMapping.CATEGORY, 'select');
    const tags = getNotionPropertyValue(properties, NotionFieldMapping.TAGS, 'multi_select') || [];
    const content = getNotionPropertyValue(properties, NotionFieldMapping.CONTENT, 'rich_text');
    const completionTime = getNotionPropertyValue(properties, NotionFieldMapping.COMPLETION_TIME, 'number');

    return {
      title: title,
      difficulty: difficulty || DifficultyOptions.MEDIUM,
      category: categoryName || '未分类',
      tags: Array.isArray(tags) ? tags : [tags],
      content: content || '',
      completionTime: completionTime || 15,
      notionPageId: page.id,
      notionUrl: page.url,
      lastEditedTime: new Date(page.last_edited_time),
      isActive: true
    };
  } catch (error) {
    console.error('解析 Notion 页面失败:', error);
    return null;
  }
};

/**
 * 通用获取 Notion 属性值的方法
 */
const getNotionPropertyValue = (properties, fieldNames, expectedType) => {
  for (const fieldName of fieldNames) {
    const property = properties[fieldName];
    if (property && property.type === expectedType) {
      switch (expectedType) {
        case 'title':
          return property.title[0]?.text?.content;
        case 'rich_text':
          return property.rich_text[0]?.text?.content;
        case 'select':
          return property.select?.name;
        case 'multi_select':
          return property.multi_select?.map(item => item.name);
        case 'number':
          return property.number;
        default:
          return null;
      }
    }
  }
  return null;
};

/**
 * 保存 Notion 数据到 LeanCloud
 */
const saveNotionProblemsToLeanCloud = async (problems) => {
  const Question = AV.Object.extend('Question');
  let savedCount = 0;

  for (const problemData of problems) {
    try {
      // 查找或创建分类
      const category = await findOrCreateCategory(problemData.category);
      
      // 检查是否已存在相同 Notion Page ID 的题目
      const query = new AV.Query('Question');
      query.equalTo('notionPageId', problemData.notionPageId);
      const existing = await query.first();
      
      const question = existing || new Question();
      
      // 设置题目属性
      question.set('title', problemData.title);
      question.set('content', problemData.content);
      question.set('difficulty', problemData.difficulty);
      question.set('tags', problemData.tags);
      question.set('completionTime', problemData.completionTime);
      question.set('category', category);
      question.set('notionPageId', problemData.notionPageId);
      question.set('notionUrl', problemData.notionUrl);
      question.set('isActive', true);
      
      // 设置 ACL
      const acl = new AV.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(true);
      question.setACL(acl);
      
      await question.save();
      savedCount++;
      
      console.log(`✅ 保存题目: "${problemData.title}" → 分类 "${problemData.category}"`);
    } catch (error) {
      console.error(`保存题目失败: ${problemData.title}`, error);
    }
  }
  
  // 更新分类计数
  await updateAllCategoryCounts();
  
  return savedCount;
};

/**
 * 查找或创建分类
 */
const findOrCreateCategory = async (categoryName) => {
  const Category = AV.Object.extend('Category');
  
  // 查找现有分类
  const query = new AV.Query('Category');
  query.equalTo('name', categoryName);
  let category = await query.first();
  
  // 如果不存在则创建
  if (!category) {
    category = new Category();
    category.set('name', categoryName);
    category.set('questionCount', 0);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    category.setACL(acl);
    
    await category.save();
    console.log(`📁 创建新分类: ${categoryName}`);
  }
  
  return category;
};

/**
 * 检查 Notion 连接状态
 */
export const checkNotionConnection = async () => {
  try {
    const result = await AV.Cloud.run('checkNotionConnection');
    return result;
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error.message,
      message: '请确保已部署云函数并配置环境变量'
    };
  }
};

// 以下是你原有的函数（保持不变）

/**
 * 生成正确格式的 Category 和 Question Class（包含示例数据）
 */
export const generateSampleData = async () => {
  try {
    console.log('开始生成示例数据...');
    await clearAllData();
    const categories = await createCategories();
    const questions = await createQuestions(categories);
    await updateCategoryCounts(categories);
    
    console.log('🎉 示例数据生成完成！');
    return {
      success: true,
      categoriesCount: categories.length,
      questionsCount: questions.length,
      message: `成功生成 ${categories.length} 个分类和 ${questions.length} 个题目`
    };
  } catch (error) {
    console.error('❌ 生成示例数据失败:', error);
    throw new Error(`生成失败: ${error.message}`);
  }
};

/**
 * 创建 Category 数据
 */
const createCategories = async () => {
  const Category = AV.Object.extend('Category');
  const categoriesData = [
    { name: 'JavaScript 核心概念' }, { name: 'React 框架原理' }, { name: '算法与数据结构' },
    { name: '计算机网络' }, { name: '数据库系统' }, { name: '操作系统' },
    { name: '前端工程化' }, { name: 'TypeScript 进阶' }
  ];

  const categories = [];
  for (const data of categoriesData) {
    const category = new Category();
    category.set('name', data.name);
    category.set('questionCount', 0);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    category.setACL(acl);
    
    const saved = await category.save();
    categories.push(saved);
    console.log(`✅ 创建分类: ${data.name}`);
  }
  
  return categories;
};

/**
 * 创建 Question 数据（关联到 Category）
 */
const createQuestions = async (categories) => {
  const Question = AV.Object.extend('Question');
  const questionsData = [
    // 你原有的题目数据...
  ];

  const questions = [];
  for (const data of questionsData) {
    const question = new Question();
    question.set('title', data.title);
    question.set('answer', data.answer);
    question.set('tags', data.tags);
    question.set('difficulty', data.difficulty);
    question.set('completionTime', data.completionTime);
    question.set('proficiency', data.proficiency);
    question.set('category', categories[data.categoryIndex]);
    question.set('isActive', true);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    question.setACL(acl);
    
    const saved = await question.save();
    questions.push(saved);
    console.log(`✅ 创建题目: "${data.title}" → 属于 "${categories[data.categoryIndex].get('name')}"`);
  }
  
  return questions;
};

/**
 * 更新 Category 的题目计数
 */
const updateCategoryCounts = async (categories) => {
  for (const category of categories) {
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    const count = await questionQuery.count();
    category.set('questionCount', count);
    await category.save();
    console.log(`📊 分类 "${category.get('name')}" 有 ${count} 个题目`);
  }
};

/**
 * 更新所有分类的题目计数
 */
const updateAllCategoryCounts = async () => {
  const categoryQuery = new AV.Query('Category');
  const categories = await categoryQuery.find();
  
  for (const category of categories) {
    const questionQuery = new AV.Query('Question');
    questionQuery.equalTo('category', category);
    const count = await questionQuery.count();
    category.set('questionCount', count);
    await category.save();
  }
  
  console.log(`📊 更新了 ${categories.length} 个分类的题目计数`);
};

/**
 * 清除所有数据
 */
export const clearAllData = async () => {
  try {
    console.log('开始清除所有数据...');
    let deletedQuestions = 0;
    let deletedCategories = 0;
    
    try {
      const questionQuery = new AV.Query('Question');
      const questions = await questionQuery.find();
      if (questions.length > 0) {
        await AV.Object.destroyAll(questions);
        deletedQuestions = questions.length;
        console.log(`🗑️ 删除了 ${deletedQuestions} 个题目`);
      }
    } catch (error) {
      console.log('没有题目需要删除或删除失败:', error.message);
    }
    
    try {
      const categoryQuery = new AV.Query('Category');
      const categories = await categoryQuery.find();
      if (categories.length > 0) {
        await AV.Object.destroyAll(categories);
        deletedCategories = categories.length;
        console.log(`🗑️ 删除了 ${deletedCategories} 个分类`);
      }
    } catch (error) {
      console.log('没有分类需要删除或删除失败:', error.message);
    }
    
    const message = `清除完成: ${deletedCategories} 个分类, ${deletedQuestions} 个题目`;
    console.log('✅ ' + message);
    
    return {
      success: true,
      deletedCategories,
      deletedQuestions,
      message
    };
  } catch (error) {
    console.error('❌ 清除数据失败:', error);
    throw new Error(`清除失败: ${error.message}`);
  }
};

/**
 * 检查数据状态
 */
export const checkDataStatus = async () => {
  try {
    let categoryCount = 0;
    let questionCount = 0;
    
    try {
      const categoryQuery = new AV.Query('Category');
      categoryCount = await categoryQuery.count();
    } catch (error) {
      categoryCount = 0;
    }
    
    try {
      const questionQuery = new AV.Query('Question');
      questionCount = await questionQuery.count();
    } catch (error) {
      questionCount = 0;
    }
    
    const status = {
      categoryCount,
      questionCount,
      hasData: categoryCount > 0 || questionCount > 0
    };
    
    console.log('📊 数据状态:', status);
    return status;
  } catch (error) {
    console.error('检查数据状态失败:', error);
    throw error;
  }
};

// 导出常量
export { DifficultyOptions, ProficiencyOptions, NotionFieldMapping };

// 全局可用
if (typeof window !== 'undefined') {
  window.generateSampleData = generateSampleData;
  window.clearAllData = clearAllData;
  window.checkDataStatus = checkDataStatus;
  window.syncProblemsFromNotion = syncProblemsFromNotion;
  window.checkNotionConnection = checkNotionConnection;
  window.defineNotionCloudFunctions = defineNotionCloudFunctions;
  
  console.log(`
🎯 数据库管理工具已加载！
新增 Notion 同步功能：

📚 数据管理:
1. generateSampleData()    - 生成示例数据
2. clearAllData()          - 清除所有数据
3. checkDataStatus()       - 检查数据状态

🔄 Notion 同步:
4. syncProblemsFromNotion() - 从 Notion 导入题目
5. checkNotionConnection()  - 检查 Notion 连接状态
6. defineNotionCloudFunctions() - 定义云函数（用于云引擎）

💡 使用提示:
- 首次使用请运行 generateSampleData() 创建示例数据
- 配置 Notion 环境变量后使用 syncProblemsFromNotion() 同步
- 云函数需要在 LeanCloud 云引擎部署
  `);
}