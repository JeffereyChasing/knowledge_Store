// services/communityService.js
import AV from 'leancloud-storage';

export class CommunityService {
  // 获取帖子列表
  static async getPosts(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      keyword = '',
      tag = '',
      authorId = ''
    } = options;

    const query = new AV.Query('Post');
    query.equalTo('isPublic', true);
    query.equalTo('status', 'published');
    
    // 关键词搜索
    if (keyword) {
      const titleQuery = new AV.Query('Post');
      titleQuery.contains('title', keyword);
      
      const contentQuery = new AV.Query('Post');
      contentQuery.contains('content', keyword);
      
      query = AV.Query.or(titleQuery, contentQuery);
    }
    
    // 标签筛选
    if (tag) {
      query.equalTo('tags', tag);
    }
    
    // 作者筛选
    if (authorId) {
      const author = AV.Object.createWithoutData('_User', authorId);
      query.equalTo('author', author);
    }
    
    query.include('author');
    query.limit(pageSize);
    query.skip((page - 1) * pageSize);
    query.descending(sortBy);
    
    return query.find();
  }

  // 创建帖子
  static async createPost(postData) {
    const currentUser = AV.User.current();
    if (!currentUser) throw new Error('请先登录');
    
    const Post = AV.Object.extend('Post');
    const post = new Post();
    
    post.set('title', postData.title);
    post.set('content', postData.content);
    post.set('author', currentUser);
    post.set('tags', postData.tags || []);
    post.set('isPublic', postData.isPublic !== false);
    post.set('status', 'published');
    post.set('likes', 0);
    post.set('views', 0);
    post.set('commentCount', 0);
    
    return post.save();
  }

  // 获取帖子详情
  static async getPostById(id) {
    const query = new AV.Query('Post');
    query.include('author');
    const post = await query.get(id);
    
    // 增加浏览数
    post.increment('views', 1);
    await post.save();
    
    return post;
  }

  // 获取评论
  static async getComments(postId, options = {}) {
    const { page = 1, pageSize = 50 } = options;
    
    const query = new AV.Query('Comment');
    const post = AV.Object.createWithoutData('Post', postId);
    query.equalTo('post', post);
    query.include('author');
    query.include('parent');
    query.ascending('createdAt');
    query.limit(pageSize);
    query.skip((page - 1) * pageSize);
    
    return query.find();
  }

  // 添加评论
  static async addComment(postId, content, parentId = null) {
    const currentUser = AV.User.current();
    if (!currentUser) throw new Error('请先登录');
    
    const Comment = AV.Object.extend('Comment');
    const comment = new Comment();
    
    const post = AV.Object.createWithoutData('Post', postId);
    comment.set('post', post);
    comment.set('author', currentUser);
    comment.set('content', content);
    comment.set('likes', 0);
    
    if (parentId) {
      const parent = AV.Object.createWithoutData('Comment', parentId);
      comment.set('parent', parent);
    }
    
    // 更新帖子的评论数和最后评论时间
    post.increment('commentCount', 1);
    post.set('lastCommentedAt', new Date());
    await post.save();
    
    return comment.save();
  }

  // 点赞/取消点赞
  static async toggleLike(postId) {
    const currentUser = AV.User.current();
    if (!currentUser) throw new Error('请先登录');
    
    const Like = AV.Object.extend('Like');
    const query = new AV.Query('Like');
    const post = AV.Object.createWithoutData('Post', postId);
    
    query.equalTo('user', currentUser);
    query.equalTo('post', post);
    
    const existingLike = await query.first();
    
    if (existingLike) {
      // 取消点赞
      await existingLike.destroy();
      
      const postObj = await new AV.Query('Post').get(postId);
      postObj.increment('likes', -1);
      await postObj.save();
      
      return { liked: false };
    } else {
      // 添加点赞
      const like = new Like();
      like.set('user', currentUser);
      like.set('post', post);
      await like.save();
      
      const postObj = await new AV.Query('Post').get(postId);
      postObj.increment('likes', 1);
      await postObj.save();
      
      return { liked: true };
    }
  }

  // 获取热门标签
  static async getPopularTags(limit = 10) {
    // 这里可以使用 LeanCloud 的聚合查询
    // 简化版本：从所有帖子中统计标签
    const query = new AV.Query('Post');
    query.equalTo('isPublic', true);
    query.equalTo('status', 'published');
    const posts = await query.find();
    
    const tagCount = {};
    posts.forEach(post => {
      const tags = post.get('tags') || [];
      tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }
}