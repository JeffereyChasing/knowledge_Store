// scripts/notion-to-leancloud.js
const { Client } = require('@notionhq/client');
const AV = require('leancloud-storage');

// 配置
const config = {
  notion: {
    auth: process.env.NOTION_TOKEN, // 你的 Notion API 密钥
    databaseId: process.env.NOTION_DATABASE_ID, // 你的数据库 ID
  },
  leancloud: {
    appId: process.env.LEANCLOUD_APP_ID,
    appKey: process.env.LEANCLOUD_APP_KEY,
    serverURL: process.env.LEANCLOUD_SERVER_URL,
  }
};

// 初始化客户端
const notion = new Client({ auth: config.notion.auth });
AV.init(config.leancloud);

/**
 * 从 Notion 获取数据
 */
async function fetchNotionData() {
  try {
    console.log('开始从 Notion 获取数据...');
    
    const response = await notion.databases.query({
      database_id: config.notion.databaseId,
    });
    
    console.log(`获取到 ${response.results.length} 条记录`);
    return response.results;
  } catch (error) {
    console.error('获取 Notion 数据失败:', error);
    throw error;
  }
}

/**
 * 转换 Notion 数据格式为 LeanCloud 格式
 */
function transformNotionData(notionPages) {
  return notionPages.map(page => {
    const properties = page.properties;
    
    // 根据你的 Notion 数据库字段调整这里的映射
    return {
      title: getPropertyValue(properties.Title || properties.Name),
      answer: getPropertyValue(properties.Answer || properties.Content),
      tags: getMultiSelectValue(properties.Tags),
      difficulty: getSelectValue(properties.Difficulty),
      category: getRelationValue(properties.Category),
      proficiency: getSelectValue(properties.Proficiency),
      completionTime: getNumberValue(properties.CompletionTime),
      // 添加其他需要的字段
    };
  }).filter(item => item.title); // 过滤掉没有标题的项
}

// 辅助函数
function getPropertyValue(property) {
  if (!property) return '';
  
  switch (property.type) {
    case 'title':
      return property.title.map(t => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text.map(t => t.plain_text).join('') || '';
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select.map(ms => ms.name);
    case 'date':
      return property.date?.start || '';
    default:
      return '';
  }
}

function getMultiSelectValue(property) {
  return property?.multi_select?.map(ms => ms.name) || [];
}

function getSelectValue(property) {
  return property?.select?.name || '';
}

function getNumberValue(property) {
  return property?.number || 0;
}

function getRelationValue(property) {
  // 这里需要处理关联关系，可能需要额外的 API 调用
  return property?.relation?.[0]?.id || null;
}

/**
 * 导入数据到 LeanCloud
 */
async function importToLeanCloud(questions) {
  const Question = AV.Object.extend('Question');
  const Category = AV.Object.extend('Category');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const questionData of questions) {
    try {
      const question = new Question();
      
      // 设置基本属性
      question.set('title', questionData.title);
      question.set('answer', questionData.answer);
      question.set('tags', questionData.tags || []);
      question.set('difficulty', questionData.difficulty || 'medium');
      question.set('proficiency', questionData.proficiency || 'beginner');
      question.set('completionTime', questionData.completionTime || 0);
      question.set('isActive', true);
      
      // 处理分类关联
      if (questionData.category) {
        // 这里需要根据你的分类结构进行处理
        // 可能需要先创建或查找对应的分类
        const category = await findOrCreateCategory(questionData.category);
        question.set('category', category);
      }
      
      await question.save();
      successCount++;
      console.log(`✅ 导入成功: ${questionData.title}`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 导入失败: ${questionData.title}`, error);
    }
  }
  
  console.log(`\n导入完成: ${successCount} 成功, ${errorCount} 失败`);
}

/**
 * 查找或创建分类
 */
async function findOrCreateCategory(categoryInfo) {
  const query = new AV.Query('Category');
  query.equalTo('name', categoryInfo.name || '默认分类');
  
  let category = await query.first();
  
  if (!category) {
    category = new AV.Object.extend('Category')();
    category.set('name', categoryInfo.name || '默认分类');
    category.set('questionCount', 0);
    await category.save();
  }
  
  return category;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 从 Notion 获取数据
    const notionPages = await fetchNotionData();
    
    // 2. 转换数据格式
    const questions = transformNotionData(notionPages);
    console.log(`转换成功 ${questions.length} 条数据`);
    
    // 3. 导入到 LeanCloud
    await importToLeanCloud(questions);
    
    console.log('🎉 数据导入完成！');
    
  } catch (error) {
    console.error('导入过程出错:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main };