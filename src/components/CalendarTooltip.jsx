import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getQuestionsBatch, getAllQuestions } from '../services/questionService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// 静态样式定义
const STATIC_STYLES = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
    animation: 'overlayFadeIn 0.3s ease'
  },
  modal: {
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 32px 64px rgba(0, 0, 0, 0.2)',
    width: '90%',
    maxWidth: '1000px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    position: 'relative',
    flexShrink: 0
  },
  headerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flex: 1
  },
  dateSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  dateBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    padding: '16px',
    minWidth: '80px'
  },
  dateInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statsSection: {
    marginLeft: 'auto'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    padding: '16px 20px'
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    color: 'white',
    cursor: 'pointer',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    marginLeft: '16px',
    flexShrink: 0
  },
  tabsContainer: {
    display: 'flex',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 32px',
    flexShrink: 0
  },
  modalContent: {
    flex: 1,
    overflow: 'hidden',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    gap: '24px',
    flex: 1
  },
  loadingAnimation: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingDots: {
    display: 'flex',
    gap: '8px'
  },
  dot: {
    width: '8px',
    height: '8px',
    background: '#cbd5e0',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out'
  },
  questionsContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  questionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0
  },
  questionsList: {
    flex: 1,
    overflow: 'auto',
    padding: '0 32px',
    minHeight: '400px',
    position: 'relative'
  },
  statsContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '32px',
    gap: '24px',
    overflow: 'auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    height: '100%'
  },
  chartCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  questionItemWrapper: {
    padding: '16px 0',
    boxSizing: 'border-box'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    textAlign: 'center',
    gap: '24px',
    flex: 1
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: '16px'
  },
  emptyWave: {
    position: 'absolute',
    bottom: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80px',
    height: '4px',
    background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
    borderRadius: '2px',
    animation: 'wave 2s ease-in-out infinite'
  },
  modalFooter: {
    padding: '20px 32px',
    background: 'white',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  scrollIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: 500
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 32px',
    textAlign: 'center',
    gap: '20px',
    flex: 1
  },
  tabBadge: {
    background: '#ef4444',
    color: 'white',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginLeft: '8px'
  }
};

const CalendarTooltip = ({ 
  dayData, 
  position, 
  onClose,
  isVisible 
}) => {
  const tooltipRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const queryClient = useQueryClient();
  const [animationClass, setAnimationClass] = useState('');
  const [activeTab, setActiveTab] = useState('questions');
  
  // 哨兵元素引用 - 用于检测是否到达底部
  const loadMoreRef = useRef(null);

  // 稳定化 handleClose 函数
  const handleClose = useCallback(() => {
    setAnimationClass('slide-out');
    setTimeout(() => {
      onClose();
      setAnimationClass('');
    }, 300);
  }, [onClose]);

  // 稳定化的事件处理函数
  const handleClickOutside = useCallback((event) => {
    if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
      handleClose();
    }
  }, [handleClose]);

  const handleEscape = useCallback((event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // 模拟分页函数 - 基于现有 getAllQuestions 实现
  const fetchQuestionsByDate = useCallback(async ({ pageParam = 0 }) => {
    if (!dayData?.date) return { questions: [], hasMore: false };
    
    const pageSize = 10; // 每页数量
    
    try {
      // 首先获取所有问题，然后在客户端进行分页
      // 在实际项目中，这里应该调用支持分页的 API
      const allQuestions = await getAllQuestions();
      
      // 过滤出当天的题目
      const dayQuestions = allQuestions.filter(question => {
        if (!question.createdAt) return false;
        const questionDate = new Date(question.createdAt);
        const targetDate = new Date(dayData.date);
        return (
          questionDate.getFullYear() === targetDate.getFullYear() &&
          questionDate.getMonth() === targetDate.getMonth() &&
          questionDate.getDate() === targetDate.getDate()
        );
      });
      
      // 按创建时间排序
      dayQuestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // 客户端分页
      const startIndex = pageParam * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedQuestions = dayQuestions.slice(startIndex, endIndex);
      
      return {
        questions: paginatedQuestions,
        hasMore: endIndex < dayQuestions.length,
        nextPage: pageParam + 1,
        total: dayQuestions.length
      };
    } catch (error) {
      console.error('获取题目失败:', error);
      throw new Error(`加载题目数据失败: ${error.message}`);
    }
  }, [dayData?.date]);

  // 使用无限查询获取分页数据
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error: queryError,
    refetch
  } = useInfiniteQuery({
    queryKey: ['day-questions-infinite', dayData?.date?.toISOString()],
    queryFn: fetchQuestionsByDate,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    },
    enabled: isVisible && !!dayData?.date,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 扁平化所有页面的数据
  const allQuestions = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap(page => page.questions);
  }, [infiniteData]);

  // 获取总题目数（从第一页获取）
  const totalQuestionsFromServer = useMemo(() => {
    return infiniteData?.pages?.[0]?.total || dayData?.questions?.length || 0;
  }, [infiniteData, dayData]);

  // Intersection Observer 用于检测是否到达底部 - 修复依赖项问题
  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    const loadMoreElement = loadMoreRef.current;
    
    if (!loadMoreElement || !hasNextPage || isFetchingNextPage || !scrollElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('🔍 检测到底部，加载更多数据...');
          fetchNextPage();
        }
      },
      {
        root: scrollElement,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, scrollContainerRef.current, loadMoreRef.current]);

  // 事件监听器设置 - 修复依赖项问题
  useEffect(() => {
    if (!isVisible) return;

    setAnimationClass('slide-in');
    
    // 直接在 useEffect 内部定义事件处理函数，避免依赖问题
    const handleDocumentClick = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        handleClose();
      }
    };

    const handleDocumentKeydown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeydown);
    };
  }, [isVisible, handleClose]);

  // 计算分类统计数据
  const categoryStats = useMemo(() => {
    if (!allQuestions.length) return [];
    
    const categoryMap = {};
    allQuestions.forEach(question => {
      const categoryName = question.category?.name || '未分类';
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
    });

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#A3CB38', '#ED4C67', '#B53471', '#EE5A24', '#009432'
    ];

    return Object.entries(categoryMap)
      .map(([name, count], index) => ({
        name: name.length > 8 ? name.substring(0, 8) + '...' : name,
        fullName: name,
        value: count,
        percentage: ((count / allQuestions.length) * 100).toFixed(1),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [allQuestions]);

  // 动态标签页样式
  const getTabStyle = useCallback((isActive) => ({
    padding: '16px 24px',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#667eea' : '#64748b',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    borderBottom: isActive ? '3px solid #667eea' : '3px solid transparent'
  }), []);

  // 分类颜色样式
  const getCategoryColorStyle = useCallback((color) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '12px'
  }), []);

  // 自定义 Tooltip 组件
  const CustomTooltip = useCallback(({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{data.fullName}</p>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
            题目数量: <strong>{data.value}</strong>
          </p>
          <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>
            占比: <strong>{data.percentage}%</strong>
          </p>
        </div>
      );
    }
    return null;
  }, []);

  // 虚拟化容器引用 - 确保在 DOM 元素挂载后再初始化
  const virtualizer = useVirtualizer({
    count: allQuestions.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(() => 200, []),
    overscan: 3,
  });

  // 加载更多指示器组件
  const LoadMoreIndicator = useCallback(() => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      gap: '12px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px dashed #e2e8f0'
    }}>
      {isFetchingNextPage ? (
        <>
          <div style={STATIC_STYLES.loadingSpinner}></div>
          <p style={{ color: '#64748b', margin: 0 }}>加载更多题目中...</p>
        </>
      ) : (
        <p style={{ color: '#64748b', margin: 0 }}>滚动加载更多</p>
      )}
    </div>
  ), [isFetchingNextPage]);

  const renderQuestionsTab = useCallback(() => {
    const virtualQuestions = virtualizer.getVirtualItems();

    return (
      <div style={STATIC_STYLES.questionsContainer}>
        <div style={STATIC_STYLES.questionsHeader}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>当日题目列表</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#f1f5f9',
              color: '#475569',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              已加载 {allQuestions.length} 题
              {totalQuestionsFromServer > 0 && ` / 总计 ${totalQuestionsFromServer} 题`}
            </span>
            {isFetchingNextPage && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e2e8f0',
                borderTop: '2px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          style={STATIC_STYLES.questionsList}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualQuestions.map((virtualRow) => {
              // 如果是最后一个元素且还有更多数据，渲染加载指示器
              if (virtualRow.index >= allQuestions.length) {
                return (
                  <div
                    key="load-more"
                    ref={loadMoreRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <LoadMoreIndicator />
                  </div>
                );
              }

              const question = allQuestions[virtualRow.index];
              
              return (
                <div
                  key={question.id}
                  style={{
                    ...STATIC_STYLES.questionItemWrapper,
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
      </div>
    );
  }, [allQuestions, totalQuestionsFromServer, isFetchingNextPage, virtualizer, LoadMoreIndicator]);

  const renderStatsTab = useCallback(() => (
    <div style={STATIC_STYLES.statsContainer}>
      <div style={STATIC_STYLES.statsGrid}>
        {/* 饼图卡片 */}
        <div style={STATIC_STYLES.chartCard}>
          <div style={STATIC_STYLES.chartHeader}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>分类分布</h3>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              共 {categoryStats.length} 个分类
            </span>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 分类列表卡片 */}
        <div style={STATIC_STYLES.chartCard}>
          <div style={STATIC_STYLES.chartHeader}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>分类详情</h3>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              总计 {allQuestions.length} 题
            </span>
          </div>
          <div style={STATIC_STYLES.categoryList}>
            {categoryStats.map((category, index) => (
              <div key={index} style={STATIC_STYLES.categoryItem}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={getCategoryColorStyle(category.color)}></div>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>
                    {category.fullName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {category.value} 题
                  </span>
                  <span style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}>
                    {category.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ), [categoryStats, allQuestions.length, CustomTooltip, getCategoryColorStyle]);

  // 改进的错误处理函数
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!isVisible || !dayData) return null;

  return (
    <div style={STATIC_STYLES.modalOverlay}>
      <div 
        ref={tooltipRef}
        style={{
          ...STATIC_STYLES.modal,
          animation: animationClass === 'slide-in' ? 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' :
                    animationClass === 'slide-out' ? 'modalSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        {/* 头部 */}
        <div style={STATIC_STYLES.modalHeader}>
          <div style={STATIC_STYLES.headerMain}>
            <div style={STATIC_STYLES.dateSection}>
              <div style={STATIC_STYLES.dateBadge}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {dayData.date.getDate()}
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>
                  {dayData.date.toLocaleDateString('zh-CN', { month: 'short' })}
                </div>
              </div>
              <div style={STATIC_STYLES.dateInfo}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {dayData.date.toLocaleDateString('zh-CN', { 
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0, fontWeight: 500 }}>
                  {dayData.date.toLocaleDateString('zh-CN', { weekday: 'long' })} · 
                  共 {totalQuestionsFromServer} 道题目
                </p>
              </div>
            </div>
            
            <div style={STATIC_STYLES.statsSection}>
              <div style={STATIC_STYLES.statItem}>
                <div style={{ fontSize: '1.5rem' }}>📚</div>
                <div style={STATIC_STYLES.statContent}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{totalQuestionsFromServer}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 500 }}>总题目</div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            style={STATIC_STYLES.closeButton}
            onClick={handleClose}
            aria-label="关闭"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页导航 */}
        {allQuestions.length > 0 && (
          <div style={STATIC_STYLES.tabsContainer}>
            <button 
              style={getTabStyle(activeTab === 'questions')}
              onClick={() => setActiveTab('questions')}
            >
              题目列表
              {allQuestions.length > 0 && (
                <span style={STATIC_STYLES.tabBadge}>{allQuestions.length}</span>
              )}
            </button>
            <button 
              style={getTabStyle(activeTab === 'stats')}
              onClick={() => setActiveTab('stats')}
            >
              分类统计
              {categoryStats.length > 0 && (
                <span style={STATIC_STYLES.tabBadge}>{categoryStats.length}</span>
              )}
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div style={STATIC_STYLES.modalContent}>
          {isLoading && allQuestions.length === 0 ? (
            <div style={STATIC_STYLES.loadingContainer}>
              <div style={STATIC_STYLES.loadingAnimation}>
                <div style={STATIC_STYLES.loadingSpinner}></div>
                <div style={STATIC_STYLES.loadingDots}>
                  <span style={{...STATIC_STYLES.dot, animationDelay: '-0.32s'}}></span>
                  <span style={{...STATIC_STYLES.dot, animationDelay: '-0.16s'}}></span>
                  <span style={STATIC_STYLES.dot}></span>
                </div>
              </div>
              <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 500 }}>正在加载题目数据...</p>
            </div>
          ) : queryError ? (
            <div style={STATIC_STYLES.errorContainer}>
              <div style={{ fontSize: '4rem', opacity: 0.7 }}>⚠️</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626', margin: 0 }}>加载失败</h3>
              <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>{queryError.message}</p>
              <button 
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={handleRetry}
              >
                重试
              </button>
            </div>
          ) : allQuestions.length > 0 ? (
            activeTab === 'questions' ? renderQuestionsTab() : renderStatsTab()
          ) : (
            <div style={STATIC_STYLES.emptyContainer}>
              <div style={STATIC_STYLES.emptyIllustration}>
                <div style={{ fontSize: '5rem', opacity: 0.7 }}>📝</div>
                <div style={STATIC_STYLES.emptyWave}></div>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#475569', margin: 0 }}>今日无记录</h3>
              <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                这一天还没有学习记录，<br />
                开始记录你的刷题进度吧！
              </p>
              <button 
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginTop: '8px'
                }}
                onClick={handleClose}
              >
                开始学习
              </button>
            </div>
          )}
        </div>

        {/* 底部 */}
        {allQuestions.length > 0 && activeTab === 'questions' && (
          <div style={STATIC_STYLES.modalFooter}>
            <div style={STATIC_STYLES.footerContent}>
              <div style={STATIC_STYLES.scrollIndicator}>
                <span>
                  已加载 {allQuestions.length} 
                  {totalQuestionsFromServer > 0 && ` / ${totalQuestionsFromServer}`} 题
                  {hasNextPage && ' • 滚动加载更多'}
                </span>
                {hasNextPage && <div style={{ animation: 'bounce 2s infinite' }}>↓</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 内联样式表 */}
      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes wave {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-50%) scaleX(0.8);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scaleX(1);
          }
        }
      `}</style>
    </div>
  );
};

// 重新设计的题目项组件
const QuestionItem = React.memo(({ question, index }) => {
  const getDifficultyConfig = useCallback((difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          color: '#10b981',
          text: '简单',
          bgColor: '#ecfdf5',
          borderColor: '#a7f3d0'
        };
      case 'medium':
        return {
          color: '#f59e0b',
          text: '中等',
          bgColor: '#fffbeb',
          borderColor: '#fcd34d'
        };
      case 'hard':
        return {
          color: '#ef4444',
          text: '困难',
          bgColor: '#fef2f2',
          borderColor: '#fca5a5'
        };
      default:
        return {
          color: '#6b7280',
          text: '未知',
          bgColor: '#f9fafb',
          borderColor: '#d1d5db'
        };
    }
  }, []);

  const formatTime = useCallback((date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const difficultyConfig = getDifficultyConfig(question.difficulty);

  const questionCardStyle = useMemo(() => ({
    display: 'flex',
    gap: '16px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    transition: 'all 0.2s ease',
    height: 'calc(100% - 32px)',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  }), []);

  const questionContentStyle = useMemo(() => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }), []);

  const questionHeaderStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px'
  }), []);

  const questionMetaStyle = useMemo(() => ({
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    flexWrap: 'wrap'
  }), []);

  const difficultyTagStyle = useMemo(() => ({
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid',
    whiteSpace: 'nowrap',
    backgroundColor: difficultyConfig.bgColor,
    borderColor: difficultyConfig.borderColor,
    color: difficultyConfig.color
  }), [difficultyConfig]);

  const timeTagStyle = useMemo(() => ({
    background: '#f8fafc',
    color: '#64748b',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  }), []);

  const questionFooterStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  }), []);

  const categorySectionStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0
  }), []);

  const tagsSectionStyle = useMemo(() => ({
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end'
  }), []);

  const questionTagStyle = useMemo(() => ({
    background: '#f1f5f9',
    color: '#475569',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  }), []);

  const questionDescriptionStyle = useMemo(() => ({
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '12px',
    color: '#475569',
    lineHeight: 1.5,
    borderLeft: '4px solid #c7d2fe',
    fontSize: '0.95rem',
    wordWrap: 'break-word'
  }), []);

  const handleMouseEnter = useCallback((e) => {
    e.currentTarget.style.borderColor = '#c7d2fe';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
    e.currentTarget.style.transform = 'translateY(-2px)';
  }, []);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
    e.currentTarget.style.transform = 'translateY(0)';
  }, []);

  return (
    <div 
      style={questionCardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#cbd5e0', minWidth: '50px', display: 'flex', alignItems: 'flex-start' }}>
        #{String(index + 1).padStart(2, '0')}
      </div>
      
      <div style={questionContentStyle}>
        <div style={questionHeaderStyle}>
          <h4 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4, margin: 0, flex: 1, wordWrap: 'break-word' }}>
            {question.title || `未命名题目 ${index + 1}`}
          </h4>
          <div style={questionMetaStyle}>
            <span style={difficultyTagStyle}>
              {difficultyConfig.text}
            </span>
            <span style={timeTagStyle}>
              {question.createdAt ? formatTime(question.createdAt) : '未知时间'}
            </span>
          </div>
        </div>
        
        <div style={questionFooterStyle}>
          <div style={categorySectionStyle}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>分类</span>
            <span style={{
              background: '#e0e7ff',
              color: '#3730a3',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}>
              {question.category?.name || '未分类'}
            </span>
          </div>
          
          {question.tags && question.tags.length > 0 && (
            <div style={tagsSectionStyle}>
              {question.tags.slice(0, 3).map((tag, tagIndex) => (
                <span key={tagIndex} style={questionTagStyle}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {question.description && (
          <div style={questionDescriptionStyle}>
            {question.description}
          </div>
        )}
      </div>
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

export default CalendarTooltip;