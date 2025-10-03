// components/community/CreatePostModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { CommunityService } from '../../services/communityService';
import AV from 'leancloud-storage';
import './CreatePostModal.css';

const CreatePostModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    isPublic: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState({ title: 0, content: 0 });
  const [suggestedTags, setSuggestedTags] = useState([]);
  const textareaRef = useRef(null);

  const maxLengths = {
    title: 100,
    content: 5000
  };

  // 热门标签建议
  const popularTags = [
    'JavaScript', 'React', '算法', 'LeetCode', '前端', 
    '面试', 'TypeScript', 'Vue', 'CSS', 'Node.js',
    '数据库', '计算机网络', '操作系统', '数据结构'
  ];

  useEffect(() => {
    // 自动调整文本域高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [formData.content]);

  useEffect(() => {
    // 根据标题内容推荐标签
    if (formData.title.length > 5) {
      const matchedTags = popularTags.filter(tag =>
        formData.title.toLowerCase().includes(tag.toLowerCase())
      );
      setSuggestedTags(matchedTags.slice(0, 3));
    } else {
      setSuggestedTags([]);
    }
  }, [formData.title]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入帖子标题';
    } else if (formData.title.length < 5) {
      newErrors.title = '标题至少需要5个字符';
    } else if (formData.title.length > maxLengths.title) {
      newErrors.title = `标题不能超过${maxLengths.title}个字符`;
    }

    if (!formData.content.trim()) {
      newErrors.content = '请输入帖子内容';
    } else if (formData.content.length < 10) {
      newErrors.content = '内容至少需要10个字符';
    } else if (formData.content.length > maxLengths.content) {
      newErrors.content = `内容不能超过${maxLengths.content}个字符`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setCharCount(prev => ({ ...prev, [field]: value.length }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagSuggestionClick = (tag) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      handleInputChange('tags', newTags);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const currentUser = AV.User.current();
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag)
        .slice(0, 5); // 最多5个标签

      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: tagsArray,
        isPublic: formData.isPublic
      };

      const newPost = await CommunityService.createPost(postData);
      
      // 显示成功消息
      setSubmitting(false);
      onSuccess(newPost);
      
    } catch (error) {
      console.error('发布失败:', error);
      setErrors({ submit: error.message || '发布失败，请重试' });
      setSubmitting(false);
    }
  };

  const getTitleCharCountColor = () => {
    const ratio = charCount.title / maxLengths.title;
    if (ratio > 0.9) return '#ff6b6b';
    if (ratio > 0.7) return '#ffa726';
    return '#4ecdc4';
  };

  const getContentCharCountColor = () => {
    const ratio = charCount.content / maxLengths.content;
    if (ratio > 0.9) return '#ff6b6b';
    if (ratio > 0.7) return '#ffa726';
    return '#4ecdc4';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <h3>✏️ 发布新帖子</h3>
            <p>分享你的学习心得和经验</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          {/* 标题输入 */}
          <div className="form-group">
            <label htmlFor="post-title">
              帖子标题 *
              <span 
                className="char-count"
                style={{ color: getTitleCharCountColor() }}
              >
                {charCount.title}/{maxLengths.title}
              </span>
            </label>
            <input
              id="post-title"
              type="text"
              placeholder="请输入有吸引力的标题..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'error' : ''}
              maxLength={maxLengths.title}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* 内容输入 */}
          <div className="form-group">
            <label htmlFor="post-content">
              帖子内容 *
              <span 
                className="char-count"
                style={{ color: getContentCharCountColor() }}
              >
                {charCount.content}/{maxLengths.content}
              </span>
            </label>
            <textarea
              ref={textareaRef}
              id="post-content"
              placeholder="详细描述你的问题或分享你的经验...（支持 Markdown 格式）"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={errors.content ? 'error' : ''}
              maxLength={maxLengths.content}
              rows="6"
            />
            {errors.content && <span className="error-message">{errors.content}</span>}
            
            {/* 内容格式提示 */}
            <div className="format-tips">
              <span className="tip-title">格式提示：</span>
              <span className="tip-item">**粗体**</span>
              <span className="tip-item">*斜体*</span>
              <span className="tip-item">`代码`</span>
              <span className="tip-item">- 列表项</span>
            </div>
          </div>

          {/* 标签输入 */}
          <div className="form-group">
            <label htmlFor="post-tags">
              标签
              <span className="optional">（可选）</span>
            </label>
            <input
              id="post-tags"
              type="text"
              placeholder="输入标签，用逗号分隔（例如：JavaScript,算法,LeetCode）"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
            />
            
            {/* 标签建议 */}
            {suggestedTags.length > 0 && (
              <div className="tag-suggestions">
                <span className="suggestions-label">推荐标签：</span>
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-suggestion"
                    onClick={() => handleTagSuggestionClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            
            <div className="tags-hint">
              最多5个标签，用逗号分隔。合适的标签有助于更多人看到你的帖子。
            </div>
          </div>

          {/* 发布设置 */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              />
              <span className="checkmark"></span>
              公开帖子（所有人可见）
            </label>
            <div className="privacy-hint">
              {formData.isPublic 
                ? '✅ 你的帖子将对所有用户可见'
                : '🔒 只有你自己可以看到此帖子'
              }
            </div>
          </div>

          {/* 提交错误 */}
          {errors.submit && (
            <div className="submit-error">
              <span className="error-icon">⚠️</span>
              {errors.submit}
            </div>
          )}

          {/* 表单操作 */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="cancel-btn"
              disabled={submitting}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="submit-spinner"></div>
                  发布中...
                </>
              ) : (
                '🚀 发布帖子'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;