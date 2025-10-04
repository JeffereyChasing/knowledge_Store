// pages/CategoryDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { initAV, getCategoryWithQuestions, getAllCategories } from '../services/categoryService';
import { deleteQuestion, updateQuestion } from '../services/questionService';
import QuestionDetailCard from '../components/QuestionDetailCard';
import QuestionForm from '../components/QuestionForm';
import AV from 'leancloud-storage';
import './CategoryDetailPage.css';

const CategoryDetailPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
    
    if (user) {
      initializeData();
    } else {
      setLoading(false);
    }
  }, [categoryId]);

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

  const initializeData = async () => {
    try {
      initAV();
      await loadCategoryData();
      await loadAllCategories();
    } catch (error) {
      console.error('初始化失败:', error);
      setError('初始化失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategoryWithQuestions(categoryId);
      setCategory(data.category);
      setQuestions(data.questions);
      
      if (data.questions.length > 0) {
        setExpandedQuestions(new Set([data.questions[0].id]));
      }
    } catch (error) {
      console.error('加载分类数据失败:', error);
      setError('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  // 处理题目类别变化
  const handleQuestionCategoryChange = ({ questionId, oldCategoryId, newCategoryId, question }) => {
    console.log('题目类别发生变化:', {
      questionId,
      oldCategoryId,
      newCategoryId,
      currentCategoryId: categoryId
    });
  
    // 使用正确的分类对象进行比较
    const currentCategory = category; // 当前分类对象
    
    // 如果题目从当前分类移出
    if (oldCategoryId === currentCategory.id) {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      
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
  console.log(category)
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

    try {
      const questionToDelete = questions.find(q => q.id === questionId);
      if (!questionToDelete) {
        throw new Error('未找到要删除的题目');
      }

      const confirmMessage = `确定要删除题目 "${questionToDelete.title}" 吗？此操作不可撤销！`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      await deleteQuestion(questionId);
      
      setExpandedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
      
      await loadCategoryData();
      
      setSyncMessage('题目删除成功');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (error) {
      console.error('删除题目失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const handleUpdateQuestion = () => {
    loadCategoryData();
  };

  const handleUpdateQuestionField = async (questionId, field, value) => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    try {
      console.log(`更新题目 ${questionId} 的字段 ${field} 为:`, value);
      await updateQuestion(questionId, { [field]: value });
      
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      ));
      
      console.log('字段更新成功');
    } catch (error) {
      console.error('更新题目字段失败:', error);
      throw new Error('更新失败: ' + error.message);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    initializeData();
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

  // 在 CategoryDetailPage.jsx 中修改 handleDrop 函数
const handleDrop = async (e, targetQuestionId) => {
  if (expandedQuestions.size > 0 || !draggingQuestion) return;
  
  e.preventDefault();
  
  if (draggingQuestion !== targetQuestionId) {
    const fromIndex = questions.findIndex(q => q.id === draggingQuestion);
    const toIndex = questions.findIndex(q => q.id === targetQuestionId);
    
    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    
    setQuestions(newQuestions);
    
    try {
      // 不要设置 updatedAt，或者设置其他字段来触发更新
      await updateQuestion(movedQuestion.id, { 
        // 可以设置一个不影响业务逻辑的字段，或者不设置任何字段
        // 或者重新设置 appearanceLevel 来触发排序
        appearanceLevel: movedQuestion.appearanceLevel
      });
      console.log('排序保存成功');
    } catch (error) {
      console.error('保存排序失败:', error);
      // 如果更新失败，重新加载数据
      await loadCategoryData();
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

  // 搜索过滤
  const filteredQuestions = questions.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (question.detailedAnswer && question.detailedAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (question.oralAnswer && question.oralAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (question.code && question.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (question.tags && question.tags.some(tag => 
      tag.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  // 排序
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
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
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      default:
        return (b.appearanceLevel || 50) - (a.appearanceLevel || 50);
    }
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

  if (loading) {
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
          <p>{error}</p>
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
                  <span className="stat-number">{questions.length}</span>
                  <span className="stat-label">当前显示</span>
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

              {/* 题目列表 */}
              <div className={`questions-container ${viewMode}`}>
                {sortedQuestions.map((question, index) => (
                  <QuestionAccordion
                    key={question.id}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(question.id)}
                    onToggle={() => toggleQuestion(question.id)}
                    onUpdate={handleUpdateQuestion}
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
                ))}
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
            loadCategoryData();
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

const QuestionAccordion = ({ 
  question, 
  index, 
  isExpanded, 
  onToggle, 
  onUpdate, 
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