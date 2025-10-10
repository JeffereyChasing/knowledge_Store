// components/community/TagCloud.jsx
import React, { useState, useEffect } from 'react';
import { CommunityService } from '../../services/communityService';
import './TagCloud.css';

const TagCloud = ({ onTagClick, maxTags = 20 }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('');

  // 默认热门标签（作为回退）
  const defaultTags = [
    { tag: 'JavaScript', count: 25, color: '#f7df1e' },
    { tag: 'React', count: 18, color: '#61dafb' },
    { tag: '算法', count: 22, color: '#4ecdc4' },
    { tag: 'LeetCode', count: 20, color: '#ff6b6b' },
    { tag: '前端', count: 15, color: '#667eea' },
    { tag: '面试', count: 12, color: '#f093fb' },
    { tag: 'TypeScript', count: 10, color: '#3178c6' },
    { tag: 'Vue', count: 8, color: '#41b883' },
    { tag: 'CSS', count: 6, color: '#264de4' },
    { tag: 'Node.js', count: 5, color: '#68a063' },
    { tag: '数据库', count: 7, color: '#ffa726' },
    { tag: '计算机网络', count: 4, color: '#26c6da' },
    { tag: '操作系统', count: 3, color: '#ab47bc' },
    { tag: '数据结构', count: 9, color: '#ec407a' },
    { tag: 'Git', count: 5, color: '#f4511e' }
  ];

  useEffect(() => {
    loadPopularTags();
  }, []);

  const loadPopularTags = async () => {
    setLoading(true);
    try {
      const popularTags = await CommunityService.getPopularTags(maxTags);
      if (popularTags && popularTags.length > 0) {
        // 为标签添加颜色
        const tagsWithColors = popularTags.map((tagData, index) => ({
          ...tagData,
          color: getTagColor(index)
        }));
        setTags(tagsWithColors);
      } else {
        // 使用默认标签
        setTags(defaultTags.slice(0, maxTags));
      }
    } catch (error) {
      console.error('加载热门标签失败:', error);
      // 使用默认标签作为回退
      setTags(defaultTags.slice(0, maxTags));
    } finally {
      setLoading(false);
    }
  };

  // 根据索引生成标签颜色
  const getTagColor = (index) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
      '#f368e0', '#ff9f43', '#a55eea', '#fd79a8', '#e17055',
      '#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#b2bec3'
    ];
    return colors[index % colors.length];
  };

  // 根据标签数量计算字体大小
  const getTagSize = (count, maxCount) => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    const ratio = count / maxCount;
    
    if (ratio > 0.8) return sizes[4];      // xl
    if (ratio > 0.6) return sizes[3];      // lg
    if (ratio > 0.4) return sizes[2];      // md
    if (ratio > 0.2) return sizes[1];      // sm
    return sizes[0];                       // xs
  };

  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
    onTagClick(tag === selectedTag ? '' : tag);
  };

  const handleClearFilter = () => {
    setSelectedTag('');
    onTagClick('');
  };

  if (loading) {
    return (
      <div className="tag-cloud-loading">
        <div className="loading-spinner"></div>
        <span>加载标签中...</span>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map(t => t.count));
  const totalPosts = tags.reduce((sum, tag) => sum + tag.count, 0);

  return (
    <div className="tag-cloud-container">
      {/* 标签云头部信息 */}
      <div className="tag-cloud-header">
        <div className="tag-cloud-stats">
          <span >
            {tags.length} 个标签 • {totalPosts} 个帖子
          </span>
          {selectedTag && (
            <button 
              className="clear-filter-btn"
              onClick={handleClearFilter}
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 标签云主体 */}
      <div className="tag-cloud">
        {tags.map(({ tag, count, color }) => {
          const size = getTagSize(count, maxCount);
          const isSelected = tag === selectedTag;
          
          return (
            <span
              key={tag}
              className={`tag ${size} ${isSelected ? 'selected' : ''}`}
              style={{
                '--tag-color': color,
                '--tag-bg-color': isSelected ? color : `${color}20`,
                '--tag-border-color': isSelected ? color : `${color}40`
              }}
              onClick={() => handleTagClick(tag)}
              title={`${tag} - ${count} 个帖子`}
            >
              <span className="tag-text">{tag}</span>
              <span className="tag-count">{count}</span>
            </span>
          );
        })}
      </div>

      {/* 选中的标签提示 */}
      {selectedTag && (
        <div className="selected-tag-info">
          <span className="selected-tag-badge">
            <span className="selected-tag-text">已选择: {selectedTag}</span>
            <button 
              className="remove-selection"
              onClick={handleClearFilter}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* 标签云说明 */}
      <div className="tag-cloud-footer">
        <div className="tag-cloud-tips">
          <span className="tip-icon">💡</span>
          <span className="tip-text">点击标签筛选相关帖子</span>
        </div>
      </div>
    </div>
  );
};

export default TagCloud;