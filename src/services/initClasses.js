// initClasses.js
import AV from 'leancloud-storage';



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

// 社区相关 Class 名称
const CommunityClasses = {
  POST: 'Post',
  COMMENT: 'Comment',
  LIKE: 'Like',
  FOLLOW: 'Follow'
};

// 帖子状态选项
const PostStatusOptions = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  DELETED: 'deleted'
};

// 帖子排序选项
const PostSortOptions = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  LAST_COMMENTED_AT: 'lastCommentedAt',
  LIKES: 'likes',
  VIEWS: 'views',
  COMMENT_COUNT: 'commentCount'
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

// ==================== 社区功能相关函数 ====================

/**
 * 创建社区相关的数据表（Post, Comment, Like, Follow）
 */
export const createCommunityClasses = async () => {
  try {
    
    const results = {
      Post: await createPostClass(),
      Comment: await createCommentClass(),
      Like: await createLikeClass(),
      Follow: await createFollowClass()
    };
    
    return results;
  } catch (error) {
    throw new Error(`创建社区数据表失败: ${error.message}`);
  }
};

/**
 * 创建 Post 类（帖子表）
 */
const createPostClass = async () => {
  try {
    // 检查是否已存在
    const query = new AV.Query(CommunityClasses.POST);
    const existing = await query.first().catch(() => null);
    if (existing) {
      return { exists: true, message: 'Post class already exists' };
    }

    // 创建 Post 类（实际上在 LeanCloud 中类会自动创建，这里我们创建示例数据来验证）
    const Post = AV.Object.extend(CommunityClasses.POST);
    const testPost = new Post();
    
    // 设置字段
    testPost.set('title', '测试帖子标题');
    testPost.set('content', '这是一个测试帖子的内容，用于验证 Post 类的创建。');
    testPost.set('author', AV.User.current());
    testPost.set('tags', ['测试', '示例']);
    testPost.set('likes', 0);
    testPost.set('views', 0);
    testPost.set('commentCount', 0);
    testPost.set('isPublic', true);
    testPost.set('isPinned', false);
    testPost.set('status', PostStatusOptions.PUBLISHED);
    
    // 设置 ACL（权限控制）
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);    // 所有人可读
    acl.setPublicWriteAccess(false);  // 只有作者可写
    if (AV.User.current()) {
      acl.setWriteAccess(AV.User.current(), true);
    }
    testPost.setACL(acl);
    
    await testPost.save();
    console.log('✅ Post 类创建成功并添加测试数据');
    
    // 删除测试数据
    await testPost.destroy();
    console.log('🧹 已清理测试数据');
    
    return { 
      success: true, 
      message: 'Post class created successfully' 
    };
  } catch (error) {
    console.error('创建 Post 类失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 创建 Comment 类（评论表）
 */
const createCommentClass = async () => {
  try {
    // 检查是否已存在
    const query = new AV.Query(CommunityClasses.COMMENT);
    const existing = await query.first().catch(() => null);
    if (existing) {
      console.log('📝 Comment 类已存在，跳过创建');
      return { exists: true, message: 'Comment class already exists' };
    }

    // 创建 Comment 类
    const Comment = AV.Object.extend(CommunityClasses.COMMENT);
    const testComment = new Comment();
    
    // 设置字段
    testComment.set('content', '这是一个测试评论内容。');
    testComment.set('author', AV.User.current());
    testComment.set('likes', 0);
    
    // 设置 ACL
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    if (AV.User.current()) {
      acl.setWriteAccess(AV.User.current(), true);
    }
    testComment.setACL(acl);
    
    await testComment.save();
    console.log('✅ Comment 类创建成功并添加测试数据');
    
    // 删除测试数据
    await testComment.destroy();
    console.log('🧹 已清理测试数据');
    
    return { 
      success: true, 
      message: 'Comment class created successfully' 
    };
  } catch (error) {
    console.error('创建 Comment 类失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 创建 Like 类（点赞关系表）
 */
const createLikeClass = async () => {
  try {
    // 检查是否已存在
    const query = new AV.Query(CommunityClasses.LIKE);
    const existing = await query.first().catch(() => null);
    if (existing) {
      console.log('📝 Like 类已存在，跳过创建');
      return { exists: true, message: 'Like class already exists' };
    }

    // 创建 Like 类
    const Like = AV.Object.extend(CommunityClasses.LIKE);
    const testLike = new Like();
    
    // 设置字段
    testLike.set('user', AV.User.current());
    
    // 设置 ACL
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    if (AV.User.current()) {
      acl.setWriteAccess(AV.User.current(), true);
    }
    testLike.setACL(acl);
    
    await testLike.save();
    console.log('✅ Like 类创建成功并添加测试数据');
    
    // 删除测试数据
    await testLike.destroy();
    console.log('🧹 已清理测试数据');
    
    return { 
      success: true, 
      message: 'Like class created successfully' 
    };
  } catch (error) {
    console.error('创建 Like 类失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 创建 Follow 类（关注关系表）
 */
const createFollowClass = async () => {
  try {
    // 检查是否已存在
    const query = new AV.Query(CommunityClasses.FOLLOW);
    const existing = await query.first().catch(() => null);
    if (existing) {
      console.log('📝 Follow 类已存在，跳过创建');
      return { exists: true, message: 'Follow class already exists' };
    }

    // 创建 Follow 类
    const Follow = AV.Object.extend(CommunityClasses.FOLLOW);
    const testFollow = new Follow();
    
    // 设置字段
    testFollow.set('follower', AV.User.current());
    
    // 设置 ACL
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    if (AV.User.current()) {
      acl.setWriteAccess(AV.User.current(), true);
    }
    testFollow.setACL(acl);
    
    await testFollow.save();
    console.log('✅ Follow 类创建成功并添加测试数据');
    
    // 删除测试数据
    await testFollow.destroy();
    console.log('🧹 已清理测试数据');
    
    return { 
      success: true, 
      message: 'Follow class created successfully' 
    };
  } catch (error) {
    console.error('创建 Follow 类失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 生成社区示例数据
 */
export const generateCommunitySampleData = async () => {
  try {
    console.log('🚀 开始生成社区示例数据...');
    
    // 首先确保数据表已创建
    await createCommunityClasses();
    
    const results = {
      posts: await createSamplePosts(),
      comments: await createSampleComments(),
      likes: await createSampleLikes()
    };
    
    console.log('✅ 社区示例数据生成完成:', results);
    return {
      success: true,
      ...results,
      message: `成功生成 ${results.posts.length} 个帖子, ${results.comments.length} 条评论, ${results.likes.length} 个点赞`
    };
  } catch (error) {
    console.error('❌ 生成社区示例数据失败:', error);
    throw new Error(`生成社区示例数据失败: ${error.message}`);
  }
};

/**
 * 创建示例帖子
 */
const createSamplePosts = async () => {
  const currentUser = AV.User.current();
  if (!currentUser) {
    console.log('⚠️ 用户未登录，跳过创建示例帖子');
    return [];
  }

  const Post = AV.Object.extend(CommunityClasses.POST);
  const samplePosts = [
    {
      title: '欢迎来到学习社区！',
      content: `大家好！欢迎来到我们的学习社区。这里是一个分享编程学习心得、交流刷题经验的地方。

## 社区规则：
1. 友善交流，互相帮助
2. 分享有价值的内容
3. 尊重他人观点
4. 保持内容相关性

希望大家都能在这里有所收获！🎉`,
      tags: ['欢迎', '公告', '社区'],
      isPublic: true,
      isPinned: true
    },
    {
      title: 'JavaScript 闭包的理解与实践',
      content: `今天来分享一下我对 JavaScript 闭包的理解...

## 什么是闭包？
闭包是指那些能够访问自由变量的函数。

## 实际应用场景：
1. 模块化开发
2. 私有变量
3. 函数柯里化

大家有什么补充的吗？`,
      tags: ['JavaScript', '闭包', '前端'],
      isPublic: true,
      isPinned: false
    },
    {
      title: 'React Hooks 使用心得',
      content: `使用 React Hooks 有一段时间了，分享一些实践经验：

- useState: 状态管理
- useEffect: 副作用处理
- useContext: 上下文传递
- useMemo: 性能优化

你们觉得哪个 Hook 最实用？`,
      tags: ['React', 'Hooks', '前端'],
      isPublic: true,
      isPinned: false
    }
  ];

  const posts = [];
  for (const data of samplePosts) {
    const post = new Post();
    post.set('title', data.title);
    post.set('content', data.content);
    post.set('author', currentUser);
    post.set('tags', data.tags);
    post.set('likes', Math.floor(Math.random() * 10));
    post.set('views', Math.floor(Math.random() * 50));
    post.set('commentCount', Math.floor(Math.random() * 5));
    post.set('isPublic', data.isPublic);
    post.set('isPinned', data.isPinned);
    post.set('status', PostStatusOptions.PUBLISHED);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    acl.setWriteAccess(currentUser, true);
    post.setACL(acl);
    
    const saved = await post.save();
    posts.push(saved);
    console.log(`✅ 创建帖子: "${data.title}"`);
  }
  
  return posts;
};

/**
 * 创建示例评论
 */
const createSampleComments = async () => {
  const currentUser = AV.User.current();
  if (!currentUser) {
    console.log('⚠️ 用户未登录，跳过创建示例评论');
    return [];
  }

  // 获取刚创建的帖子
  const postQuery = new AV.Query(CommunityClasses.POST);
  const posts = await postQuery.find();
  
  if (posts.length === 0) {
    console.log('⚠️ 没有找到帖子，跳过创建评论');
    return [];
  }

  const Comment = AV.Object.extend(CommunityClasses.COMMENT);
  const sampleComments = [
    { content: '欢迎欢迎！期待更多精彩内容！🎊' },
    { content: '闭包的讲解很清晰，感谢分享！' },
    { content: '我觉得 useEffect 最实用，能处理各种副作用。' },
    { content: '新人报道，请多指教！' },
    { content: 'Hooks 确实让 React 开发更简洁了。' }
  ];

  const comments = [];
  for (let i = 0; i < sampleComments.length; i++) {
    const comment = new Comment();
    comment.set('content', sampleComments[i].content);
    comment.set('author', currentUser);
    comment.set('post', posts[i % posts.length]); // 轮流分配到不同帖子
    comment.set('likes', Math.floor(Math.random() * 5));
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    acl.setWriteAccess(currentUser, true);
    comment.setACL(acl);
    
    const saved = await comment.save();
    comments.push(saved);
    console.log(`✅ 创建评论: "${sampleComments[i].content.substring(0, 20)}..."`);
  }
  
  return comments;
};

/**
 * 创建示例点赞
 */
const createSampleLikes = async () => {
  const currentUser = AV.User.current();
  if (!currentUser) {
    console.log('⚠️ 用户未登录，跳过创建示例点赞');
    return [];
  }

  // 获取刚创建的帖子和评论
  const postQuery = new AV.Query(CommunityClasses.POST);
  const posts = await postQuery.find();
  
  const commentQuery = new AV.Query(CommunityClasses.COMMENT);
  const comments = await commentQuery.find();

  const Like = AV.Object.extend(CommunityClasses.LIKE);
  const likes = [];

  // 为第一个帖子点赞
  if (posts.length > 0) {
    const like = new Like();
    like.set('user', currentUser);
    like.set('post', posts[0]);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setWriteAccess(currentUser, true);
    like.setACL(acl);
    
    const saved = await like.save();
    likes.push(saved);
    console.log('✅ 创建帖子点赞');
  }

  // 为第一个评论点赞
  if (comments.length > 0) {
    const like = new Like();
    like.set('user', currentUser);
    like.set('comment', comments[0]);
    
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setWriteAccess(currentUser, true);
    like.setACL(acl);
    
    const saved = await like.save();
    likes.push(saved);
    console.log('✅ 创建评论点赞');
  }
  
  return likes;
};

/**
 * 清除社区数据
 */
export const clearCommunityData = async () => {
  try {
    
    let deletedCount = {
      posts: 0,
      comments: 0,
      likes: 0,
      follows: 0
    };
    
    // 清除点赞数据
    try {
      const likeQuery = new AV.Query(CommunityClasses.LIKE);
      const likes = await likeQuery.find();
      if (likes.length > 0) {
        await AV.Object.destroyAll(likes);
        deletedCount.likes = likes.length;
      }
    } catch (error) {
    }
    
    // 清除评论数据
    try {
      const commentQuery = new AV.Query(CommunityClasses.COMMENT);
      const comments = await commentQuery.find();
      if (comments.length > 0) {
        await AV.Object.destroyAll(comments);
        deletedCount.comments = comments.length;
      }
    } catch (error) {
    }
    
    // 清除帖子数据
    try {
      const postQuery = new AV.Query(CommunityClasses.POST);
      const posts = await postQuery.find();
      if (posts.length > 0) {
        await AV.Object.destroyAll(posts);
        deletedCount.posts = posts.length;
      }
    } catch (error) {
    }
    
    // 清除关注数据
    try {
      const followQuery = new AV.Query(CommunityClasses.FOLLOW);
      const follows = await followQuery.find();
      if (follows.length > 0) {
        await AV.Object.destroyAll(follows);
        deletedCount.follows = follows.length;
      }
    } catch (error) {
    }
    
    const message = `社区数据清除完成: ${deletedCount.posts} 帖子, ${deletedCount.comments} 评论, ${deletedCount.likes} 点赞, ${deletedCount.follows} 关注`;
    
    return {
      success: true,
      ...deletedCount,
      message
    };
  } catch (error) {
    console.error('❌ 清除社区数据失败:', error);
    throw new Error(`清除社区数据失败: ${error.message}`);
  }
};

// ==================== 原有函数（保持不变） ====================

/**
 * Notion 同步云函数
 */
export const syncProblemsFromNotion = async () => {
  try {
    
    // 检查环境变量是否配置
    if (!process.env.REACT_APP_NOTION_TOKEN || !process.env.REACT_APP_NOTION_DATABASE_ID) {
      throw new Error('Notion 环境变量未配置，请检查 REACT_APP_NOTION_TOKEN 和 REACT_APP_NOTION_DATABASE_ID');
    }

    // 调用云函数（如果部署了云引擎版本）
    try {
      const result = await AV.Cloud.run('syncProblemsFromNotion');
      return result;
    } catch (cloudError) {
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

// 导出所有常量和函数
export { 
  DifficultyOptions, 
  ProficiencyOptions, 
  NotionFieldMapping,
  CommunityClasses,
  PostStatusOptions,
  PostSortOptions
};

// 全局可用
if (typeof window !== 'undefined') {
  // 原有函数
  window.generateSampleData = generateSampleData;
  window.clearAllData = clearAllData;
  window.checkDataStatus = checkDataStatus;
  window.syncProblemsFromNotion = syncProblemsFromNotion;
  window.checkNotionConnection = checkNotionConnection;
  window.defineNotionCloudFunctions = defineNotionCloudFunctions;
  
  // 新增社区函数
  window.createCommunityClasses = createCommunityClasses;
  window.generateCommunitySampleData = generateCommunitySampleData;
  window.clearCommunityData = clearCommunityData;
  
  console.log(`
🎯 数据库管理工具已加载！

📚 数据管理:
1. generateSampleData()          - 生成示例数据
2. clearAllData()                - 清除所有数据
3. checkDataStatus()             - 检查数据状态

🔄 Notion 同步:
4. syncProblemsFromNotion()      - 从 Notion 导入题目
5. checkNotionConnection()       - 检查 Notion 连接状态
6. defineNotionCloudFunctions()  - 定义云函数（用于云引擎）

👥 社区功能:
7. createCommunityClasses()      - 创建社区数据表
8. generateCommunitySampleData() - 生成社区示例数据
9. clearCommunityData()          - 清除社区数据

💡 使用提示:
- 首次使用请运行 generateSampleData() 创建示例数据
- 使用社区功能前运行 createCommunityClasses() 创建数据表
- 配置 Notion 环境变量后使用 syncProblemsFromNotion() 同步
- 云函数需要在 LeanCloud 云引擎部署
  `);
}