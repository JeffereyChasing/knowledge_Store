// components/community/PostCard.jsx
import React, { useState } from 'react';
import { CommunityService } from '../../services/communityService';
import CommentSection from './CommentSection';
import './PostCard.css';

// 格式化时间函数
const formatTime = (date) => {
  if (!date) return "刚刚";
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  });
};

const PostCard = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState(post.get('likes') || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [views, setViews] = useState(post.get('views') || 0);
  
  // 获取用户头像
  const getAvatarUrl = () => {
    return post.get('author')?.get('avatar') || '/default-avatar.png';
  };

  // 获取用户名
  const getUsername = () => {
    return post.get('author')?.get('username') || '匿名用户';
  };

  // 处理点赞
  const handleLike = async () => {
    try {
      const result = await CommunityService.toggleLike(post.id);
      setLikes(result.liked ? likes + 1 : Math.max(0, likes - 1));
      setIsLiked(result.liked);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 处理查看评论
  const handleToggleComments = () => {
    setShowComments(!showComments);
    // 增加浏览数（只在第一次展开评论时）
    if (!showComments) {
      setViews(prev => prev + 1);
    }
  };

  // 获取难度颜色
  const getDifficultyColor = () => {
    const difficulty = post.get('difficulty') || 'medium';
    switch (difficulty) {
      case 'easy': return '#52c41a';
      case 'medium': return '#faad14';
      case 'hard': return '#f5222d';
      default: return '#666';
    }
  };

  // 获取标签颜色
  const getTagColor = (index) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];
    return colors[index % colors.length];
  };

  // 渲染内容（支持简单的 Markdown）
  const renderContent = () => {
    const content = post.get('content') || '';
    
    // 简单的 Markdown 处理
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  // 获取内容预览
  const getContentPreview = () => {
    const content = post.get('content') || '';
    const plainText = content.replace(/[#*`]/g, '');
    return plainText.length > 150 
      ? plainText.substring(0, 150) + '...' 
      : plainText;
  };

  return (
    <div className="post-card">
      {/* 帖子头部 */}
      <div className="post-header">
        <div className="author-section">
          <img 
            src={getAvatarUrl()} 
            alt="用户头像"
            className="author-avatar"
            style={{ width: '40px', height: '40px' }} // 内联样式作为备选

          />
          <div className="author-info">
            <div className="author-name">{getUsername()}</div>
            <div className="post-meta">
              <span className="post-time">
                {formatTime(post.get('createdAt'))}
              </span>
              {post.get('isPinned') && (
                <span className="pinned-badge">📌 置顶</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="post-status">
          {post.get('difficulty') && (
            <span 
              className="difficulty-badge"
              style={{ backgroundColor: getDifficultyColor() }}
            >
              {post.get('difficulty') === 'easy' ? '简单' : 
               post.get('difficulty') === 'medium' ? '中等' : '困难'}
            </span>
          )}
        </div>
      </div>

      {/* 帖子内容 */}
      <div className="post-content">
        <h3 className="post-title">{post.get('title')}</h3>
        
        <div 
          className="post-body"
          dangerouslySetInnerHTML={{ __html: renderContent() }}
        />
        
        {/* 内容过长时的阅读更多 */}
        {(post.get('content') || '').length > 150 && !showComments && (
          <button 
            className="read-more-btn"
            onClick={() => setShowComments(true)}
          >
            阅读全文
          </button>
        )}
      </div>

      {/* 标签区域 */}
      {post.get('tags') && post.get('tags').length > 0 && (
        <div className="post-tags">
          {post.get('tags').map((tag, index) => (
            <span
              key={tag}
              className="post-tag"
              style={{ 
                backgroundColor: getTagColor(index) + '20',
                color: getTagColor(index),
                borderColor: getTagColor(index) + '40'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 帖子统计和操作 */}
      <div className="post-footer">
        <div className="post-stats">
          <button 
            className={`stat-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className="stat-icon">👍</span>
            <span className="stat-count">{likes}</span>
          </button>
          
          <button 
            className={`stat-btn comment-btn ${showComments ? 'active' : ''}`}
            onClick={handleToggleComments}
          >
            <span className="stat-icon">💬</span>
            <span className="stat-count">{post.get('commentCount') || 0}</span>
          </button>
          
          <div className="stat-btn view-btn">
            <span className="stat-icon">👁️</span>
            <span className="stat-count">{views}</span>
          </div>
        </div>

        <div className="post-actions">
          <button className="action-btn share-btn">
            🔗 分享
          </button>
          <button className="action-btn bookmark-btn">
            📌 收藏
          </button>
        </div>
      </div>

      {/* 评论区域 */}
      {showComments && (
        <CommentSection postId={post.id} />
      )}
    </div>
  );
};

export default PostCard;