// components/CalendarTooltip.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getQuestionById } from '../services/questionService';
import './CalendarTooltip.css';

const CalendarTooltip = ({ 
  dayData, 
  position, 
  onClose,
  isVisible 
}) => {
  const tooltipRef = useRef(null);
  const queryClient = useQueryClient();
  const [cachedQuestions, setCachedQuestions] = useState([]);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // 预加载问题数据的查询
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['day-questions', dayData?.date?.toISOString()],
    queryFn: async () => {
      if (!dayData?.questions?.length) return [];
      
      // 批量预加载问题数据
      const questionPromises = dayData.questions.map(question => 
        queryClient.getQueryData(['question', question.id]) 
          ? Promise.resolve(queryClient.getQueryData(['question', question.id]))
          : getQuestionById(question.id).catch(() => question) // 失败时使用基础数据
      );
      
      const results = await Promise.allSettled(questionPromises);
      return results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean);
    },
    enabled: isVisible && !!dayData?.questions?.length,
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 10 * 60 * 1000, // 10分钟
  });

  // 缓存问题数据
  useEffect(() => {
    if (questionsData && questionsData.length > 0) {
      setCachedQuestions(questionsData);
    } else if (dayData?.questions) {
      setCachedQuestions(dayData.questions);
    }
  }, [questionsData, dayData?.questions]);

  // 虚拟化容器引用
  const parentRef = useRef(null);

  // 虚拟化配置
  const virtualizer = useVirtualizer({
    count: cachedQuestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // 增加项目高度
    overscan: 5, // 预渲染的项目数
  });

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, onClose]);

  const handleQuestionToggle = (questionId) => {
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
  };

  if (!isVisible || !dayData) return null;

  const virtualQuestions = virtualizer.getVirtualItems();

  return (
    <div 
      ref={tooltipRef}
      className="calendar-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="tooltip-header">
        <div className="header-content">
          <div className="date-display">
            <span className="date-day">{dayData.date.getDate()}</span>
            <div className="date-info">
              <span className="date-weekday">
                {dayData.date.toLocaleDateString('zh-CN', { weekday: 'long' })}
              </span>
              <span className="date-full">
                {dayData.date.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
          <div className="stats-badge">
            <span className="stat-icon">📚</span>
            <span className="stat-count">{dayData.count}</span>
            <span className="stat-label">道题目</span>
          </div>
        </div>
        <button 
          className="tooltip-close-btn"
          onClick={onClose}
          aria-label="关闭"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.707 3.293a1 1 0 00-1.414 0L8 6.586 4.707 3.293a1 1 0 00-1.414 1.414L6.586 8l-3.293 3.293a1 1 0 101.414 1.414L8 9.414l3.293 3.293a1 1 0 001.414-1.414L9.414 8l3.293-3.293a1 1 0 000-1.414z"/>
          </svg>
        </button>
      </div>
      
      <div className="tooltip-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span className="loading-text">加载题目中...</span>
          </div>
        ) : cachedQuestions.length > 0 ? (
          <div 
            ref={parentRef}
            className="questions-virtual-container"
            style={{
              height: '400px', // 固定高度
              overflow: 'auto'
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {virtualQuestions.map((virtualRow) => {
                const question = cachedQuestions[virtualRow.index];
                const isExpanded = expandedQuestion === question.id;
                
                return (
                  <div
                    key={question.id}
                    className="question-virtual-item"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <QuestionItem 
                      question={question} 
                      index={virtualRow.index}
                      isExpanded={isExpanded}
                      onToggle={() => handleQuestionToggle(question.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h4 className="empty-title">这一天没有学习记录</h4>
            <p className="empty-description">开始记录你的学习进度吧</p>
          </div>
        )}
      </div>
      
      {cachedQuestions.length > 0 && (
        <div className="tooltip-footer">
          <div className="footer-stats">
            <span className="virtual-info">
              显示 {virtualQuestions.length} / {cachedQuestions.length} 道题目
            </span>
            <span className="scroll-hint">滚动查看更多</span>
          </div>
        </div>
      )}
      
      <div className="tooltip-arrow"></div>
    </div>
  );
};

// 单个题目项组件
const QuestionItem = React.memo(({ question, index, isExpanded, onToggle }) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className={`question-item ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="question-main">
        <div className="question-header">
          <div className="question-meta">
            <span className="question-index">#{index + 1}</span>
            <span 
              className="difficulty-badge"
              style={{ 
                backgroundColor: getDifficultyColor(question.difficulty),
                color: 'white'
              }}
            >
              {getDifficultyText(question.difficulty)}
            </span>
            <span className="question-time">
              {formatTime(question.createdAt)}
            </span>
          </div>
          <div className="expand-indicator">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
              className={isExpanded ? 'expanded' : ''}
            >
              <path d="M8 12.5a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L8 10.086l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 018 12.5z"/>
            </svg>
          </div>
        </div>
        
        <h4 className="question-title">{question.title}</h4>
        
        <div className="question-category">
          <span className="category-tag">
            {question.category?.name || '未分类'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="question-details">
          {question.detailedAnswer && (
            <div className="answer-preview">
              <h5 className="preview-title">答案预览</h5>
              <div className="preview-content">
                {question.detailedAnswer.substring(0, 200)}
                {question.detailedAnswer.length > 200 && '...'}
              </div>
            </div>
          )}
          
          <div className="question-tags">
            {question.tags && question.tags.slice(0, 3).map((tag, tagIndex) => (
              <span key={tagIndex} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

export default CalendarTooltip;