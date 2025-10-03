// components/community/CommentSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { CommunityService } from '../../services/communityService';
import CommentItem from './CommentItem';
import AV from 'leancloud-storage';
import './CommentSection.css';

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular
  const [replyingTo, setReplyingTo] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadComments();
  }, [postId, sortBy]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const commentsData = await CommunityService.getComments(postId);
      
      // 排序评论
      const sortedComments = [...commentsData].sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.get('createdAt')) - new Date(b.get('createdAt'));
          case 'popular':
            return (b.get('likes') || 0) - (a.get('likes') || 0);
          case 'newest':
          default:
            return new Date(b.get('createdAt')) - new Date(a.get('createdAt'));
        }
      });

      setComments(sortedComments);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    const currentUser = AV.User.current();
    if (!currentUser) {
      alert('请先登录后再评论');
      return;
    }

    setSubmitting(true);
    try {
      let parentId = null;
      if (replyingTo) {
        parentId = replyingTo.id;
      }

      await CommunityService.addComment(postId, newComment, parentId);
      
      // 清空输入框
      setNewComment('');
      setReplyingTo(null);
      
      // 重新加载评论
      await loadComments();
      
      // 显示成功提示
      showSuccessMessage('评论发布成功！');
    } catch (error) {
      console.error('发布评论失败:', error);
      alert('发布评论失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.get('author')?.get('username') || '用户'} `);
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const showSuccessMessage = (message) => {
    // 可以在这里添加更美观的成功提示
    console.log(message);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmitComment();
    }
  };

  const getCommentCountText = () => {
    const count = comments.length;
    if (count === 0) return '暂无评论';
    if (count === 1) return '1 条评论';
    return `${count} 条评论`;
  };

  return (
    <div className="comment-section">
      {/* 评论头部 */}
      <div className="comment-header">
        <h4 className="comment-title">
          💬 {getCommentCountText()}
        </h4>
        
        <div className="comment-controls">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
            <option value="popular">最热</option>
          </select>
          
          <button 
            className="refresh-comments"
            onClick={loadComments}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'}
          </button>
        </div>
      </div>

      {/* 评论输入框 */}
      <div className="comment-input-section">
        {replyingTo && (
          <div className="reply-indicator">
            <span>回复 @{replyingTo.get('author')?.get('username') || '用户'}</span>
            <button onClick={cancelReply}>取消</button>
          </div>
        )}
        
        <div className="comment-input-wrapper">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? '写下你的回复...' : '写下你的评论...'}
            rows="3"
            className="comment-textarea"
            maxLength="1000"
          />
          
          <div className="comment-input-footer">
            <div className="char-count">
              {newComment.length}/1000
            </div>
            
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="submit-comment-btn"
            >
              {submitting ? (
                <>
                  <div className="submit-spinner"></div>
                  发布中...
                </>
              ) : (
                '发布评论'
              )}
            </button>
          </div>
        </div>
        
        <div className="comment-tips">
          <span className="tip">💡 支持 Markdown 语法</span>
          <span className="tip">⏎ + Ctrl 快速发布</span>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="comments-list">
        {loading ? (
          <div className="comments-loading">
            <div className="loading-spinner"></div>
            <span>加载评论中...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <div className="no-comments-icon">💬</div>
            <h5>还没有评论</h5>
            <p>成为第一个评论的人吧！</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onUpdate={loadComments}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;