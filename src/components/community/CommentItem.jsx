// components/community/CommentItem.jsx
import React, { useState } from 'react';
import { CommunityService } from '../../services/communityService';
import AV from 'leancloud-storage';
import './CommentItem.css';

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
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const CommentItem = ({ comment, onReply, onUpdate }) => {
  const [likes, setLikes] = useState(comment.get('likes') || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.get('content') || '');
  const [saving, setSaving] = useState(false);

  // 获取用户信息
  const getAvatarUrl = () => {
    return comment.get('author')?.get('avatar') || '/default-avatar.png';
  };

  const getUsername = () => {
    return comment.get('author')?.get('username') || '匿名用户';
  };

  // 检查当前用户是否是评论作者
  const isAuthor = () => {
    const currentUser = AV.User.current();
    return currentUser && comment.get('author')?.id === currentUser.id;
  };

  // 处理点赞
  const handleLike = async () => {
    try {
      const result = await CommunityService.toggleLike(comment.id, 'comment');
      setLikes(result.liked ? likes + 1 : Math.max(0, likes - 1));
      setIsLiked(result.liked);
    } catch (error) {
      console.error('点赞评论失败:', error);
    }
  };

  // 处理回复
  const handleReplyClick = () => {
    onReply(comment);
  };

  // 处理编辑
  const handleEdit = () => {
    setEditing(true);
    setEditContent(comment.get('content') || '');
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    setSaving(true);
    try {
      // 这里需要实现更新评论的 API
      // await CommunityService.updateComment(comment.id, { content: editContent });
      setEditing(false);
      onUpdate(); // 刷新评论列表
    } catch (error) {
      console.error('更新评论失败:', error);
      alert('更新评论失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditing(false);
    setEditContent(comment.get('content') || '');
  };

  // 处理删除
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这条评论吗？此操作不可撤销。')) {
      return;
    }

    try {
      // 这里需要实现删除评论的 API
      // await CommunityService.deleteComment(comment.id);
      onUpdate(); // 刷新评论列表
    } catch (error) {
      console.error('删除评论失败:', error);
      alert('删除评论失败: ' + error.message);
    }
  };

  // 渲染评论内容（支持简单的 Markdown）
  const renderContent = () => {
    const content = comment.get('content') || '';
    
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      className="comment-item"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 评论头部 */}
      <div className="comment-header">
        <div className="comment-author">
          <img 
            src={getAvatarUrl()} 
            alt="用户头像"
            className="comment-avatar"
          />
          <div className="author-info">
            <span className="author-name">{getUsername()}</span>
            {isAuthor() && (
              <span className="author-badge">作者</span>
            )}
            <span className="comment-time">
              {formatTime(comment.get('createdAt'))}
            </span>
          </div>
        </div>

        {/* 评论操作 */}
        {showActions && (
          <div className="comment-actions">
            <button 
              className="action-btn reply-btn"
              onClick={handleReplyClick}
              title="回复"
            >
              ↩️
            </button>
            
            {isAuthor() && (
              <>
                <button 
                  className="action-btn edit-btn"
                  onClick={handleEdit}
                  title="编辑"
                >
                  ✏️
                </button>
                <button 
                  className="action-btn delete-btn"
                  onClick={handleDelete}
                  title="删除"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 评论内容 */}
      <div className="comment-content">
        {editing ? (
          <div className="edit-comment">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows="3"
              className="edit-textarea"
              maxLength="1000"
            />
            <div className="edit-actions">
              <button 
                onClick={handleCancelEdit}
                className="cancel-edit-btn"
                disabled={saving}
              >
                取消
              </button>
              <button 
                onClick={handleSaveEdit}
                className="save-edit-btn"
                disabled={!editContent.trim() || saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="comment-text"
            dangerouslySetInnerHTML={{ __html: renderContent() }}
          />
        )}
      </div>

      {/* 评论底部 */}
      <div className="comment-footer">
        <button 
          className={`like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <span className="like-icon">👍</span>
          <span className="like-count">{likes}</span>
        </button>

        <button 
          className="reply-footer-btn"
          onClick={handleReplyClick}
        >
          回复
        </button>
      </div>

      {/* 回复指示器 */}
      {comment.get('parent') && (
        <div className="reply-indicator">
          回复 <span className="reply-to">@{comment.get('parent')?.get('author')?.get('username') || '用户'}</span>
        </div>
      )}
    </div>
  );
};

export default CommentItem;