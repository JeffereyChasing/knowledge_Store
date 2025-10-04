// pages/CategoryDetailPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * ==================== TanStack Query 核心 Hook ====================
 * useInfiniteQuery: 用于处理分页和无限滚动数据
 * useMutation: 用于处理数据修改操作（增删改）
 * useQueryClient: 提供对 QueryClient 实例的访问，用于手动操作缓存
 */
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * ==================== React Virtual 虚拟化 Hook ====================
 * useVirtualizer: 核心虚拟化 Hook，用于优化大量数据的渲染性能
 * 只渲染可见区域的元素，大幅提升长列表性能
 */
import { useVirtualizer } from '@tanstack/react-virtual';

import { initAV, getCategoryWithQuestions, getAllCategories, getQuestionsByCategory } from '../services/categoryService';
import { deleteQuestion, updateQuestion } from '../services/questionService';
import QuestionDetailCard from '../components/QuestionDetailCard';
import QuestionForm from '../components/QuestionForm';
import AV from 'leancloud-storage';
import './CategoryDetailPage.css';

// 分页配置
const PAGE_SIZE = 20; // 每页加载的题目数量

const CategoryDetailPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  /**
   * ==================== Query Client 实例 ====================
   * 作用：可以手动使查询失效、设置查询数据、获取查询数据等
   * 用于在组件中手动控制缓存和数据同步
   */
  const queryClient = useQueryClient();
  
  // 组件状态管理
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [viewMode, setViewMode] = useState('accordion');
  const [draggingQuestion, setDraggingQuestion] = useState(null);
  const [dragOverQuestion, setDragOverQuestion] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // 初始化用户和基础数据
  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
    
    if (user) {
      initializeData();
    }
  }, [categoryId]);

  // 滚动到指定题目的事件监听
  useEffect(() => {
    const handleScrollToQuestion = (event) => {
      const { questionId } = event.detail;
      
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
      await loadCategoryInfo();
      await loadAllCategories();
    } catch (error) {
      console.error('初始化失败:', error);
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
    }
  };

  /**
   * ==================== 无限滚动查询配置 ====================
   * useInfiniteQuery: 专门用于处理分页和无限滚动场景的 Hook
   * 
   * 参数说明：
   * - queryKey: 查询的唯一标识符数组，当 categoryId 或 sortBy 变化时会重新获取数据
   * - queryFn: 执行数据获取的函数，接收包含 pageParam 的参数对象
   * - getNextPageParam: 根据上一页数据计算下一页的参数
   * - enabled: 控制查询是否启用，需要 categoryId 和 currentUser 都存在
   * - staleTime: 数据在多久内被认为是新鲜的（不会重新获取）
   * 
   * 返回值说明：
   * - data: 包含所有页面数据的对象，结构为 { pages: [...], pageParams: [...] }
   * - fetchNextPage: 函数，用于加载下一页数据
   * - hasNextPage: 布尔值，表示是否还有更多数据可以加载
   * - isFetchingNextPage: 布尔值，表示是否正在加载下一页
   * - isLoading: 布尔值，表示是否正在首次加载
   * - error: 错误对象，如果查询失败则包含错误信息
   * - refetch: 函数，用于手动重新获取所有数据
   */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['questions', categoryId, sortBy], // 查询键：当这些值变化时重新获取
    queryFn: async ({ pageParam = 0 }) => {
      // pageParam 是当前页码，从0开始
      const result = await getQuestionsByCategory(categoryId, {
        page: pageParam + 1, // 转换为1开始的页码
        pageSize: PAGE_SIZE,
        sortBy,
        sortOrder: 'desc'
      });
      return {
        questions: result.data,
        // 如果返回的数据量等于页面大小，说明可能还有更多数据
        nextPage: result.data.length === PAGE_SIZE ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage, // 计算下一页参数
    enabled: !!categoryId && !!currentUser, // 只有 categoryId 和用户存在时才启用查询
    staleTime: 1000 * 60 * 5, // 数据在5分钟内被认为是新鲜的
  });

  /**
   * ==================== 数据处理 ====================
   * useMemo: 缓存计算结果，避免不必要的重复计算
   * 当依赖项变化时才重新计算，优化性能
   */
  
  // 扁平化所有页面的题目：将分页数据转换为平铺的题目数组
  const allQuestions = useMemo(() => {
    return data?.pages.flatMap(page => page.questions) || [];
  }, [data]);

  // 搜索过滤后的题目：根据搜索词过滤题目
  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return allQuestions;
    
    return allQuestions.filter(question =>
      question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (question.detailedAnswer && question.detailedAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.oralAnswer && question.oralAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.code && question.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.tags && question.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [allQuestions, searchTerm]);

  // 排序后的题目：根据选择的排序方式对题目进行排序
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

  /**
   * ==================== React Virtual 虚拟化配置 ====================
   * useVirtualizer: 核心虚拟化 Hook，用于处理大量数据的渲染优化
   * 原理：只渲染可见区域的元素，大幅提升长列表性能
   * 
   * 参数说明：
   * - count: 虚拟化项目的总数
   * - getScrollElement: 获取滚动容器的函数
   * - estimateSize: 估算每个项目高度的函数
   * - overscan: 预渲染的项目数量，用于平滑滚动
   * 
   * 返回值说明：
   * - virtualItems: 当前应该渲染的虚拟项目数组
   * - getTotalSize: 获取虚拟化容器的总高度
   * - measureElement: 用于测量元素实际高度的 ref 函数
   */
  const virtualizer = useVirtualizer({
    count: sortedQuestions.length, // 虚拟化项目的总数
    getScrollElement: () => document.querySelector('.questions-container'), // 滚动容器
    estimateSize: () => viewMode === 'grid' ? 200 : 120, // 根据视图模式估算项目高度
    overscan: 10, // 预渲染10个项目，确保滚动时不会出现空白
  });

  /**
   * ==================== 无限滚动逻辑 ====================
   * useCallback: 缓存函数，避免不必要的重新创建
   * 当滚动到底部时自动加载更多数据
   */
  const handleScroll = useCallback(() => {
    const container = document.querySelector('.questions-container');
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // 检查是否滚动到底部（距离底部小于100px）
    if (scrollHeight - scrollTop - clientHeight < 100 && 
        hasNextPage && 
        !isFetchingNextPage) {
      fetchNextPage(); // 触发加载下一页
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 添加滚动监听
  useEffect(() => {
    const container = document.querySelector('.questions-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  /**
   * ==================== TanStack Query Mutation 配置 ====================
   * useMutation: 用于处理数据修改操作（增删改）
   * 提供乐观更新、错误重试、自动缓存失效等功能
   */

  /**
   * 删除题目 Mutation：
   * - mutationFn: 执行删除操作的函数
   * - onSuccess: 删除成功后的回调，使相关查询失效以更新UI
   * - onError: 删除失败后的错误处理
   */
  const deleteQuestionMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      // 使 questions 查询失效，触发重新获取以更新UI
      queryClient.invalidateQueries(['questions', categoryId]);
      setSyncMessage('题目删除成功');
      setTimeout(() => setSyncMessage(''), 3000);
    },
    onError: (error) => {
      console.error('删除题目失败:', error);
      alert('删除失败: ' + error.message);
    }
  });

  /**
   * 更新题目 Mutation：
   * - mutationFn: 接收参数并执行更新操作的函数
   * - onSuccess: 更新成功后使查询失效，确保数据一致性
   * - onError: 更新失败后抛出错误
   */
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, data }) => updateQuestion(questionId, data),
    onSuccess: () => {
      // 使 questions 查询失效，确保UI显示最新数据
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
      // 当题目从当前分类移出时，使查询失效以更新列表
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

    // 使用 mutation 执行删除操作
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
      // 使用 mutation 执行更新操作，mutateAsync 返回 Promise
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
    refetch(); // 手动重新获取数据
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
        // 使用 mutation 保存排序结果
        await updateQuestionMutation.mutateAsync({
          questionId: movedQuestion.id,
          data: { appearanceLevel: movedQuestion.appearanceLevel }
        });
        console.log('排序保存成功');
      } catch (error) {
        console.error('保存排序失败:', error);
        refetch(); // 如果保存失败，重新获取数据恢复状态
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
      {/* 现代化头部 */}
      <header className="modern-header">
        <div className="container">
          <div className="header-content">
            <button onClick={handleBack} className="back-button">
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
                <label>视图模式</label>
                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'accordion' ? 'active' : ''}`}
                    onClick={() => setViewMode('accordion')}
                  >
                    📖 列表
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    🏷️ 网格
                  </button>
                </div>
              </div>

              <div className="controls-group">
                <label>批量操作</label>
                <div className="batch-actions">
                  <button 
                    onClick={expandAllQuestions}
                    className="action-btn expand-btn"
                    disabled={sortedQuestions.length === 0}
                  >
                    📖 展开全部
                  </button>
                  <button 
                    onClick={collapseAllQuestions}
                    className="action-btn collapse-btn"
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

              {/**
               * ==================== 虚拟化列表渲染 ====================
               * 虚拟化容器：固定高度，启用滚动
               * 关键点：容器必须有固定的高度和 overflow: auto
               */}
              <div 
                className={`questions-container ${viewMode}`}
                style={{ 
                  height: '800px', 
                  overflow: 'auto',
                  position: 'relative'
                }}
              >
                {/**
                 * 虚拟化包装器：根据总高度创建占位空间
                 * virtualizer.getTotalSize() 计算所有项目总高度
                 * 这个div的作用是撑开滚动容器，让滚动条正常工作
                 */}
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {/**
                   * 渲染虚拟化项目：
                   * virtualizer.getVirtualItems() 返回当前需要渲染的项目
                   * 每个项目都通过绝对定位放置在正确的位置
                   * 只有这些项目会被实际渲染到DOM中
                   */}
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const question = sortedQuestions[virtualItem.index];
                    
                    return (
                      <div
                        key={question.id}
                        data-index={virtualItem.index}
                        /**
                         * ==================== 元素测量 ====================
                         * virtualizer.measureElement: 用于测量元素实际高度
                         * 虚拟化器会自动调用这个ref来获取元素的真实尺寸
                         * 这对于动态高度的项目特别重要
                         */
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          /**
                           * ==================== 虚拟定位 ====================
                           * translateY(${virtualItem.start}px): 将元素定位到正确的位置
                           * virtualItem.start: 元素在虚拟列表中的起始位置
                           * virtualItem.end: 元素在虚拟列表中的结束位置
                           * virtualItem.size: 元素的估算尺寸
                           */
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
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 加载更多指示器：显示加载状态 */}
                {isFetchingNextPage && (
                  <div className="loading-more">
                    <div className="modern-spinner small"></div>
                    <span>加载更多题目...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 添加/编辑题目弹窗 */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
            /**
             * ==================== 缓存失效策略 ====================
             * 保存成功后使查询失效，重新获取最新数据
             * 确保UI显示的数据与服务器保持一致
             */
            queryClient.invalidateQueries(['questions', categoryId]);
          }}
          onCancel={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
          }}
          defaultCategoryId={categoryId}
          onCategoryChange={handleQuestionCategoryChange}
        />
      )}
    </div>
  );
};

// QuestionAccordion 组件保持不变
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
  canDrag
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

  // 如果已经展开，显示扩展视图
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
            onUpdate={onUpdate}
            onDelete={onDelete}
            onUpdateField={onUpdateField}
            isExpandedView={true}
          />
        </div>
      </div>
    );
  }

  // 折叠状态下的显示
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
        {/* 掌握程度蝴蝶结标识 */}
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

  // 列表视图下的折叠状态
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
      {/* 掌握程度蝴蝶结标识 */}
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