import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getQuestionsBatch } from '../services/questionService';
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
  const [itemHeights, setItemHeights] = useState(new Map());

  // 批量获取问题数据的查询
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['day-questions-batch', dayData?.date?.toISOString(), dayData?.questions?.map(q => q.id).join(',')],
    queryFn: async () => {
      if (!dayData?.questions?.length) return [];
      
      // 检查缓存中已有的数据
      const cachedQuestions = [];
      const missingQuestionIds = [];
      
      dayData.questions.forEach(question => {
        const cached = queryClient.getQueryData(['question', question.id]);
        if (cached) {
          cachedQuestions.push(cached);
        } else {
          missingQuestionIds.push(question.id);
        }
      });
      
      // 如果有缺失的数据，批量获取
      if (missingQuestionIds.length > 0) {
        try {
          const batchResults = await getQuestionsBatch(missingQuestionIds);
          // 将批量获取的数据存入缓存
          batchResults.forEach(question => {
            queryClient.setQueryData(['question', question.id], question);
          });
          return [...cachedQuestions, ...batchResults];
        } catch (error) {
          console.warn('批量获取题目失败，使用基础数据:', error);
          // 失败时使用基础数据
          const fallbackQuestions = dayData.questions.map(q => 
            queryClient.getQueryData(['question', q.id]) || q
          );
          return fallbackQuestions;
        }
      }
      
      return cachedQuestions;
    },
    enabled: isVisible && !!dayData?.questions?.length,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });

  // 缓存更新
  useEffect(() => {
    if (questionsData && questionsData.length > 0) {
      setCachedQuestions(questionsData);
    } else if (dayData?.questions) {
      setCachedQuestions(dayData.questions);
    }
  }, [questionsData, dayData?.questions]);

  // 虚拟化容器引用
  const parentRef = useRef(null);

  // 使用固定高度避免无限循环
  const virtualizer = useVirtualizer({
    count: cachedQuestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // 固定高度，避免动态测量导致的循环
    overscan: 5,
  });

  // 点击外部关闭
  const handleClickOutside = useCallback((event) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, handleClickOutside]);

  // ESC键关闭
  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, handleEscape]);

  if (!isVisible || !dayData) return null;

  const virtualQuestions = virtualizer.getVirtualItems();
  const totalQuestions = dayData.questions?.length || 0;

  return (
    <div 
      ref={tooltipRef}
      className="calendar-tooltip"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 500)}px`,
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
            <span className="stat-count">{totalQuestions}</span>
            <span className="stat-label">道题目</span>
          </div>
        </div>
        <button 
          className="tooltip-close-btn"
          onClick={onClose}
          aria-label="关闭"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
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
              height: '500px',
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
              显示 {virtualQuestions.length} / {totalQuestions} 道题目
            </span>
            <span className="scroll-hint">滚动查看更多</span>
          </div>
        </div>
      )}
      
      <div className="tooltip-arrow"></div>
    </div>
  );
};

// 简化的单个题目项组件 - 移除动态高度测量
const QuestionItem = React.memo(({ question, index }) => {
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
    <div className="question-item">
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
        </div>
        
        <h4 className="question-title">{question.title}</h4>
        
        <div className="question-category">
          <span className="category-tag">
            {question.category?.name || '未分类'}
          </span>
        </div>
      </div>
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

export default CalendarTooltip;