// pages/CategoryDetailPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { initAV, getCategoryWithQuestions, getAllCategories, getQuestionsByCategory } from '../services/categoryService';
import { deleteQuestion, updateQuestion } from '../services/questionService';
import QuestionDetailCard from '../components/QuestionDetailCard';
import QuestionForm from '../components/QuestionForm';
import AV from 'leancloud-storage';
import './CategoryDetailPage.css';

// 分页配置
const PAGE_SIZE = 20; // 每页加载的题目数量

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const CategoryDetailPage = () => {
  // 容器状态管理
  const [containerReady, setContainerReady] = useState(false);
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [viewMode, setViewMode] = useState('accordion');
  const [draggingQuestion, setDraggingQuestion] = useState(null);
  const [dragOverQuestion, setDragOverQuestion] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const loadMoreTriggerRef = useRef(null);
  const containerRef = useRef(null);

  // 初始化用户和基础数据
  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
    
    if (user) {
      initializeData();
    }
  }, [categoryId]);

  // 优化的容器检测逻辑 - 使用MutationObserver
  useEffect(() => {
    const checkContainer = () => {
      const container = containerRef.current;
      if (container && container.nodeType === 1) {
        setContainerReady(true);
        return true;
      }
      return false;
    };

    // 立即检查一次
    if (checkContainer()) return;

    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver((mutations) => {
      if (checkContainer()) {
        observer.disconnect();
      }
    });

    // 监听根元素及其子元素变化
    const rootElement = document.getElementById('root') || document.body;
    observer.observe(rootElement, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => observer.disconnect();
  }, []);

  // 滚动到指定题目的事件监听
  useEffect(() => {
    const handleScrollToQuestion = (event) => {
      const { questionId } = event.detail;
      if (!questionId) return;
      
      const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
      if (questionElement) {
        questionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        questionElement.style.boxShadow = '0 0 0 3px #667eea';
        setTimeout(() => {
          questionElement.style.boxShadow = '';
        }, 2000);
        
        if (!expandedQuestions.has(questionId)) {
          toggleQuestion(questionId);
        }
      }
    };

    window.addEventListener('scrollToQuestion', handleScrollToQuestion);
    
    return () => {
      window.removeEventListener('scrollToQuestion', handleScrollToQuestion);
    };
  }, [expandedQuestions]);

  // 初始化基础数据
  const initializeData = async () => {
    try {
      initAV();
      
      // 串行执行，避免并发请求
      await loadCategoryInfo();
      await loadAllCategories();
    } catch (error) {
      console.error('初始化失败:', error);
      if (error.code === 429 || error.message.includes('Too many requests')) {
        setSyncMessage('请求过于频繁，请稍后重试');
        setTimeout(() => setSyncMessage(''), 5000);
      }
    }
  };

  // 加载分类信息
  const loadCategoryInfo = async () => {
    try {
      const data = await getCategoryWithQuestions(categoryId);
      setCategory(data.category);
    } catch (error) {
      console.error('加载分类信息失败:', error);
    }
  };

  // 加载所有分类
  const loadAllCategories = async () => {
    try {
      const categoriesData = await getAllCategories();
      const userCategories = categoriesData.filter(cat => {
        const createdBy = cat.createdBy;
        return createdBy && createdBy.id === currentUser?.id;
      });
      setAllCategories(userCategories);
    } catch (error) {
      console.error('加载所有分类失败:', error);
      if (error.code === 429 || error.message.includes('Too many requests')) {
        setSyncMessage('服务器繁忙，请稍后重试');
        setTimeout(() => setSyncMessage(''), 5000);
      }
    }
  };

  // useInfiniteQuery 配置
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['questions', categoryId, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      
      try {
        const result = await getQuestionsByCategory(categoryId, {
          page: pageParam,
          pageSize: PAGE_SIZE,
          sortBy,
          sortOrder: 'desc'
        });
        
        
        
        return {
          questions: result.data || [],
          total: result.total,
          nextPage: result.data?.length === PAGE_SIZE ? pageParam + 1 : undefined
        };
      } catch (error) {
        if (error.code === 429 || error.status === 429) {
          console.warn('API 频率限制，等待重试...');
          throw new Error('请求过于频繁，请稍后重试');
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!categoryId && !!currentUser,
    staleTime: 1000 * 60 * 5, // 5分钟
    initialPageParam: 0,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 扁平化所有页面的题目并去重
  const allQuestions = useMemo(() => {
    const questions = data?.pages.flatMap(page => page.questions) || [];
    
    // 基于id去重
    const uniqueQuestions = Array.from(new Map(questions.map(item => [item.id, item])).values());
    
    return uniqueQuestions;
  }, [data]);

  // 搜索过滤后的题目
  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return allQuestions;
    
    const filtered = allQuestions.filter(question =>
      question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (question.detailedAnswer && question.detailedAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.oralAnswer && question.oralAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.code && question.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.tags && question.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
    
    return filtered;
  }, [allQuestions, searchTerm]);

  // 排序后的题目
  const sortedQuestions = useMemo(() => {
    return [...filteredQuestions].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'difficulty':
          const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'appearanceLevel':
          return (b.appearanceLevel || 50) - (a.appearanceLevel || 50);
        case 'createdAt':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'updatedAt':
          return new Date(b.updatedAt) - new Date(a.createdAt);
        default:
          return (b.appearanceLevel || 50) - (a.appearanceLevel || 50);
      }
    });
  }, [filteredQuestions, sortBy]);

  // 容器有效性检查辅助函数
  const isContainerValid = () => {
    return !!containerRef.current && containerRef.current.nodeType === 1;
  };

  // 滚动加载逻辑
  const handleScroll = useCallback(() => {
    if (!isContainerValid() || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollThreshold = 100;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
 
    if (distanceFromBottom < scrollThreshold) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data]);

  // 滚动监听器绑定
  useEffect(() => {
    if (!isContainerValid() || !containerReady) {
      return;
    }

    const container = containerRef.current;
    console.log('✅ 绑定滚动监听器到容器');
    
    const debouncedScroll = debounce(handleScroll, 50);
    container.addEventListener('scroll', debouncedScroll);
    
    return () => {
      console.log('🧹 清理滚动监听器');
      container.removeEventListener('scroll', debouncedScroll);
    };
  }, [containerReady, handleScroll]);

  // Intersection Observer 配置
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasNextPage || isFetchingNextPage || !isContainerValid()) {
      return;
    }

    console.log('🔍 设置 Intersection Observer');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('🎯 Intersection Observer 触发加载更多！');
          fetchNextPage();
        }
      },
      { 
        threshold: 0.1,
        root: containerRef.current,
        rootMargin: '100px'
      }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 手动加载更多
  const handleManualLoadMore = () => {
    console.log('🔄 手动触发加载更多');
    fetchNextPage();
  };

  // 删除题目 mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', categoryId]);
      setSyncMessage('题目删除成功');
      setTimeout(() => setSyncMessage(''), 3000);
    },
    onError: (error) => {
      console.error('删除题目失败:', error);
      alert('删除失败: ' + error.message);
    }
  });

  // 更新题目 mutation
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, data }) => updateQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', categoryId]);
    },
    onError: (error) => {
      console.error('更新题目失败:', error);
      throw new Error('更新失败: ' + error.message);
    }
  });

  // 处理题目类别变化
  const handleQuestionCategoryChange = ({ questionId, oldCategoryId, newCategoryId, question }) => {
    const currentCategory = category;
    
    if (oldCategoryId === currentCategory.id) {
      queryClient.invalidateQueries(['questions', categoryId]);
      
      setExpandedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
      
      const newCategory = allCategories.find(cat => cat.id === newCategoryId);
      setSyncMessage(`题目已移动到分类: ${newCategory?.name || '其他分类'}`);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const expandAllQuestions = () => {
    const allQuestionIds = new Set(sortedQuestions.map(q => q.id));
    setExpandedQuestions(allQuestionIds);
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions(new Set());
  };

  const handleAddQuestion = () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    setEditingQuestion(null);
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (question) => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    const questionToDelete = sortedQuestions.find(q => q.id === questionId);
    if (!questionToDelete) {
      throw new Error('未找到要删除的题目');
    }

    const confirmMessage = `确定要删除题目 "${questionToDelete.title}" 吗？此操作不可撤销！`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    deleteQuestionMutation.mutate(questionId);
    
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  const handleUpdateQuestionField = async (questionId, field, value) => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    try {
      await updateQuestionMutation.mutateAsync({
        questionId,
        data: { [field]: value }
      });
    } catch (error) {
      console.error('更新题目字段失败:', error);
      throw new Error('更新失败: ' + error.message);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    refetch();
  };

  // 拖拽相关函数
  const handleDragStart = (e, questionId) => {
    if (expandedQuestions.size > 0) return;
    
    setDraggingQuestion(questionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', questionId);
    
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragOver = (e, questionId) => {
    if (expandedQuestions.size > 0 || !draggingQuestion) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQuestion(questionId);
  };

  const handleDragLeave = (e) => {
    setDragOverQuestion(null);
  };

  const handleDrop = async (e, targetQuestionId) => {
    if (expandedQuestions.size > 0 || !draggingQuestion) return;
    
    e.preventDefault();
    
    if (draggingQuestion !== targetQuestionId) {
      const fromIndex = sortedQuestions.findIndex(q => q.id === draggingQuestion);
      const toIndex = sortedQuestions.findIndex(q => q.id === targetQuestionId);
      
      const newQuestions = [...sortedQuestions];
      const [movedQuestion] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, movedQuestion);
      
      try {
        await updateQuestionMutation.mutateAsync({
          questionId: movedQuestion.id,
          data: { appearanceLevel: movedQuestion.appearanceLevel }
        });
        console.log('排序保存成功');
      } catch (error) {
        console.error('保存排序失败:', error);
        refetch();
      }
    }
    
    setDraggingQuestion(null);
    setDragOverQuestion(null);
  };

  const handleDragEnd = (e) => {
    setDraggingQuestion(null);
    setDragOverQuestion(null);
    e.currentTarget.style.opacity = '1';
  };

  // 调试信息
  useEffect(() => {
    console.log('分页状态:', {
      hasNextPage,
      isFetchingNextPage,
      totalQuestions: allQuestions.length,
      pages: data?.pages?.length || 0,
      containerReady: isContainerValid()
    });
  }, [hasNextPage, isFetchingNextPage, allQuestions.length, data]);

  // 虚拟滚动配置
  const virtualizer = useVirtualizer({
    count: sortedQuestions.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => viewMode === 'grid' ? 200 : 120,
    overscan: 10,
    enabled: containerReady && sortedQuestions.length > 0,
  });

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className="category-detail-page">
        <div className="auth-required-container">
          <div className="auth-required-icon">🔐</div>
          <h2>请先登录</h2>
          <p>登录后即可查看和管理题目</p>
          <div className="auth-required-actions">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('showAuthModal'))}
              className="login-btn"
            >
              立即登录
            </button>
            <button onClick={handleBack} className="btn-back">
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !category) {
    return (
      <div className="category-detail-page">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>加载题目中...</p>
        </div>
      </div>
    );
  }
  
  if (error && !category) {
    return (
      <div className="category-detail-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>加载失败</h2>
          <p>{error.message}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="btn-retry">
              重新加载
            </button>
            <button onClick={handleBack} className="btn-back">
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="category-detail-page">
        <div className="error-container">
          <div className="error-icon">📁</div>
          <h2>分类不存在</h2>
          <p>未找到指定的分类，可能已被删除</p>
          <button onClick={handleBack} className="btn-back">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-detail-page">
      {/* 头部 */}
      <header className="modern-header">
        <div className="container">
          <div className="header-content">
            <button 
              onClick={handleBack} 
              className="back-button"
            >
              <span className="back-icon">←</span>
              返回知识库
            </button>
            <div className="category-hero">
              <div className="category-badge">
                <span className="category-emoji">📚</span>
                <span className="category-name">{category.name}</span>
              </div>
              <div className="user-welcome">
                <span className="welcome-text">欢迎, {currentUser.getUsername()}!</span>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">{category.questionCount}</span>
                  <span className="stat-label">总题目</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{allQuestions.length}</span>
                  <span className="stat-label">已加载</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{expandedQuestions.size}</span>
                  <span className="stat-label">已展开</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 同步消息提示 */}
      {syncMessage && (
        <div className="sync-message">
          {syncMessage}
        </div>
      )}

      {/* 控制面板 */}
      <section className="control-panel">
        <div className="container">
          <div className="panel-grid">
            {/* 搜索区域 */}
            <div className="search-panel">
              <div className="search-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="搜索题目、答案或标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="modern-search"
                  style={{ color: '#333', backgroundColor: '#fff' }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="clear-search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 控制区域 */}
            <div className="controls-panel">
              <div className="controls-group">
                <label>排序方式</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="modern-select"
                  style={{ color: '#333', backgroundColor: '#fff' }}
                >
                  <option value="appearanceLevel">出现频率</option>
                  <option value="updatedAt">最近更新</option>
                  <option value="createdAt">创建时间</option>
                  <option value="title">标题顺序</option>
                  <option value="difficulty">难度等级</option>
                </select>
              </div>
              
              <div className="controls-group">
                <label>批量操作</label>
                <div className="batch-actions">
                  <button 
                    onClick={expandAllQuestions}
                    className="action-btn"
                    disabled={sortedQuestions.length === 0}
                  >
                    📖 展开全部
                  </button>
                  <button 
                    onClick={collapseAllQuestions}
                    className="action-btn"
                    disabled={expandedQuestions.size === 0}
                  >
                    📕 折叠全部
                  </button>
                </div>
              </div>

              <button 
                className="add-question-btn primary"
                onClick={handleAddQuestion}
              >
                <span className="btn-icon">+</span>
                添加题目
              </button>
            </div>
          </div>

          {/* 调试控制面板 */}
          <div className="debug-controls" style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
            <button 
              onClick={handleManualLoadMore}
              disabled={!hasNextPage || isFetchingNextPage}
              style={{ 
                padding: '5px 10px', 
                fontSize: '12px',
                background: hasNextPage ? '#1890ff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '3px'
              }}
            >
              {isFetchingNextPage ? '加载中...' : hasNextPage ? '手动加载更多' : '已无更多'}
            </button>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
              状态: {hasNextPage ? `有更多 (${allQuestions.length}/?)` : '已加载全部'}
            </span>
          </div>
        </div>
      </section>

      {/* 内容区域 */}
      <section className="content-section">
        <div className="container">
          {sortedQuestions.length === 0 ? (
            <div className="modern-empty">
              <div className="empty-illustration">
                {searchTerm ? '🔍' : '📝'}
              </div>
              <h3>{searchTerm ? '没有找到匹配的题目' : '此分类下暂无题目'}</h3>
              <p>
                {searchTerm 
                  ? `尝试调整搜索条件或清除搜索框来查看所有题目`
                  : '点击"添加题目"按钮创建第一个题目，开始你的学习之旅'
                }
              </p>
              {searchTerm ? (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="clear-search-btn"
                >
                  清除搜索条件
                </button>
              ) : (
                <button 
                  onClick={handleAddQuestion}
                  className="add-first-btn"
                >
                  🚀 创建第一个题目
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 统计信息 */}
              <div className="results-stats">
                <span className="results-count">
                  找到 {sortedQuestions.length} 个题目
                  {searchTerm && <span>（搜索关键词: "{searchTerm}"）</span>}
                  {hasNextPage && <span> - 滚动加载更多</span>}
                </span>
                <span className="expand-count">
                  {expandedQuestions.size} / {sortedQuestions.length} 已展开
                </span>
                {expandedQuestions.size === 0 && (
                  <span className="drag-hint">
                    🎯 提示: 可以拖拽题目调整顺序
                  </span>
                )}
              </div>

              {/* 调试信息 */}
              <div className="debug-info" style={{ fontSize: '12px', color: '#666', padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '10px' }}>
                分页状态: 已加载 {allQuestions.length} 题, 还有更多: {hasNextPage ? '是' : '否'}, 正在加载: {isFetchingNextPage ? '是' : '否'}
                <br />
                容器状态: {isContainerValid() ? '已就绪' : '未就绪'}
              </div>

              {/* 虚拟化题目列表 */}
              <div 
                ref={containerRef}
                className={`questions-container ${viewMode}`}
                style={{ 
                  height: 'calc(100vh - 400px)',
                  overflow: 'auto',
                  position: 'relative',
                  border: '1px solid #e1e5e9',
                  borderRadius: '8px'
                }}
              >
                {!containerReady ? (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    color: '#666'
                  }}>
                    正在准备内容区域...
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {virtualizer.getVirtualItems().map((virtualItem) => {
                        const question = sortedQuestions[virtualItem.index];
                        
                        return (
                          <div
                            key={question.id}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                          >
                            <QuestionAccordion
                              question={question}
                              index={virtualItem.index}
                              isExpanded={expandedQuestions.has(question.id)}
                              onToggle={() => toggleQuestion(question.id)}
                              onDelete={handleDeleteQuestion}
                              onEdit={handleEditQuestion}
                              onUpdateField={handleUpdateQuestionField}
                              viewMode={viewMode}
                              isDragging={draggingQuestion === question.id}
                              isDragOver={dragOverQuestion === question.id}
                              onDragStart={(e) => handleDragStart(e, question.id)}
                              onDragOver={(e) => handleDragOver(e, question.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, question.id)}
                              onDragEnd={handleDragEnd}
                              canDrag={expandedQuestions.size === 0}
                              showQuestionForm={showQuestionForm}
                              setShowQuestionForm={setShowQuestionForm}
                              editingQuestion={editingQuestion}
                              setEditingQuestion={setEditingQuestion}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 加载更多触发元素 */}
                    {hasNextPage && (
                      <div
                        ref={loadMoreTriggerRef}
                        style={{
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          background: 'transparent'
                        }}
                      >
                        {isFetchingNextPage ? (
                          <div className="loading-more">
                            <div className="modern-spinner small"></div>
                            <span>加载更多题目...</span>
                          </div>
                        ) : (
                          <div className="load-more-trigger" style={{ padding: '10px', color: '#666' }}>
                            <span>↓ 继续滚动加载更多</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!hasNextPage && allQuestions.length > 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '20px', 
                        color: '#999',
                        fontStyle: 'italic'
                      }}>
                        已加载全部 {allQuestions.length} 个题目
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 编辑表单 */}
      {showQuestionForm && (
        <div 
          className="form-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <QuestionForm
            question={editingQuestion}
            onSave={() => {
              setShowQuestionForm(false);
              setEditingQuestion(null);
              queryClient.invalidateQueries(['questions', categoryId]);
            }}
            onCancel={() => {
              setShowQuestionForm(false);
              setEditingQuestion(null);
            }}
            defaultCategoryId={categoryId}
            onCategoryChange={handleQuestionCategoryChange}
          />
        </div>
      )}
    </div>
  );
};

// QuestionAccordion 组件
const QuestionAccordion = ({ 
  question, 
  index, 
  isExpanded, 
  onToggle, 
  onDelete,
  onEdit,
  onUpdateField,
  viewMode,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  canDrag,
  showQuestionForm,
  setShowQuestionForm,
  editingQuestion,
  setEditingQuestion
}) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#52c41a';
      case 'medium': return '#faad14';
      case 'hard': return '#f5222d';
      default: return '#666';
    }
  };

  const getDifficultyBorderColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#b7eb8f';
      case 'medium': return '#ffe58f';
      case 'hard': return '#ffa39e';
      default: return '#d9d9d9';
    }
  };

  const getDifficultyBackgroundColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#f6ffed';
      case 'medium': return '#fffbe6';
      case 'hard': return '#fff2f0';
      default: return '#fafafa';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return difficulty;
    }
  };

  const getProficiencyColor = (proficiency) => {
    switch (proficiency) {
      case 'beginner': return '#ff6b6b';
      case 'intermediate': return '#4ecdc4';
      case 'advanced': return '#45b7d1';
      case 'master': return '#96ceb4';
      default: return '#95a5a6';
    }
  };

  const getProficiencyIcon = (proficiency) => {
    switch (proficiency) {
      case 'beginner': return '🎀';
      case 'intermediate': return '🎗️';
      case 'advanced': return '🏅';
      case 'master': return '👑';
      default: return '🎯';
    }
  };

  const getProficiencyText = (proficiency) => {
    switch (proficiency) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      case 'master': return '精通';
      default: return proficiency;
    }
  };

  const getAppearanceLevelColor = (level) => {
    if (level >= 80) return '#ff6b6b';
    if (level >= 60) return '#ffa726';
    if (level >= 40) return '#4ecdc4';
    return '#95a5a6';
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取答案预览文本
  const getAnswerPreview = () => {
    const answerText = question.oralAnswer || question.detailedAnswer;
    if (!answerText) {
      return '暂无答案内容';
    }
    return answerText.substring(0, 150) + (answerText.length > 150 ? '...' : '');
  };

  // 展开状态视图
  if (isExpanded) {
    return (
      <div className="expanded-question-view" data-question-id={question.id}>
        <div className="expanded-header">
          <button onClick={onToggle} className="back-to-list-btn">
            <span className="back-icon">←</span>
            返回列表
          </button>
          <div className="expanded-title">
            <span className="question-index">#{index + 1}</span>
            <h3>{question.title}</h3>
          </div>
          <div className="expanded-actions">
            <button 
              onClick={() => onEdit(question)}
              className="btn-edit"
            >
              ✏️ 编辑
            </button>
          </div>
        </div>
        
        <div className="expanded-content">
          <QuestionDetailCard
            question={question}
            onDelete={onDelete}
            onUpdateField={onUpdateField}
            isExpandedView={true}
            onEdit={onEdit}
            showQuestionForm={showQuestionForm}
            setShowQuestionForm={setShowQuestionForm}
            editingQuestion={editingQuestion}
            setEditingQuestion={setEditingQuestion}
          />
        </div>
      </div>
    );
  }

  // 网格视图
  if (viewMode === 'grid') {
    return (
      <div 
        className={`question-grid-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
        onClick={onToggle}
        draggable={canDrag}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        data-question-id={question.id}
        style={{
          borderLeft: `4px solid ${getDifficultyColor(question.difficulty)}`,
          backgroundColor: getDifficultyBackgroundColor(question.difficulty),
          border: `1px solid ${getDifficultyBorderColor(question.difficulty)}`
        }}
      >
        {/* 掌握程度标识 */}
        <div 
          className="proficiency-ribbon"
          style={{ backgroundColor: getProficiencyColor(question.proficiency) }}
        >
          <span className="ribbon-icon">{getProficiencyIcon(question.proficiency)}</span>
          <span className="ribbon-text">{getProficiencyText(question.proficiency)}</span>
        </div>

        <div className="grid-header">
          <span className="question-index">#{index + 1}</span>
          <span 
            className="difficulty-tag"
            style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
          >
            {getDifficultyText(question.difficulty)}
          </span>
        </div>
        
        <h4 className="grid-title">{question.title}</h4>
        
        {/* 出现频率指示器 */}
        <div className="appearance-level-indicator">
          <div 
            className="appearance-bar"
            style={{ 
              width: `${question.appearanceLevel || 50}%`,
              backgroundColor: getAppearanceLevelColor(question.appearanceLevel || 50)
            }}
          ></div>
          <span className="appearance-text">{question.appearanceLevel || 50}%</span>
        </div>

        <div className="grid-meta">
          <span className="update-time">更新: {formatTime(question.updatedAt)}</span>
        </div>
        <div className="grid-preview">
          <div className="preview-content">
            {getAnswerPreview()}
          </div>
        </div>
        
        {/* 拖拽手柄 */}
        {canDrag && <div className="drag-handle">⋮⋮</div>}
      </div>
    );
  }

  // 列表视图
  return (
    <div 
      className={`modern-accordion ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-question-id={question.id}
      style={{
        borderLeft: `4px solid ${getDifficultyColor(question.difficulty)}`,
        backgroundColor: getDifficultyBackgroundColor(question.difficulty),
        border: `1px solid ${getDifficultyBorderColor(question.difficulty)}`
      }}
    >
      {/* 掌握程度标识 */}
      <div 
        className="proficiency-ribbon"
        style={{ backgroundColor: getProficiencyColor(question.proficiency) }}
      >
        <span className="ribbon-icon">{getProficiencyIcon(question.proficiency)}</span>
        <span className="ribbon-text">{getProficiencyText(question.proficiency)}</span>
      </div>

      <div className="accordion-header" onClick={onToggle}>
        <div className="header-main">
          <div className="question-meta">
            <span className="question-index">#{index + 1}</span>
            <span 
              className="difficulty-badge"
              style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
            >
              {getDifficultyText(question.difficulty)}
            </span>
            <span className="appearance-badge">
              📊 {question.appearanceLevel || 50}%
            </span>
            <span className="time-badge">
              ⏱️ {formatTime(question.updatedAt)}
            </span>
          </div>
          <h3 className="question-title">{question.title}</h3>
          <div className="question-preview">
            {getAnswerPreview()}
          </div>
        </div>
        <div className="header-actions">
          {/* 拖拽手柄 */}
          {canDrag && (
            <div 
              className="drag-handle"
              onClick={(e) => e.stopPropagation()}
            >
              ⋮⋮
            </div>
          )}
          <span className="accordion-icon">
            {isExpanded ? '▼' : '►'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailPage;