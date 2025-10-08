// pages/OfflineQuestionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cacheService } from '../services/cacheService';
import './OfflineQuestionsPage.css';

// 临时内联组件，避免依赖问题
const OfflineQuestionDetailCard = ({ 
  questionId, 
  onBack,
  onNavigateToQuestion 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offlineQuestions, setOfflineQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadOfflineQuestions();
  }, [questionId]);

  const loadOfflineQuestions = async () => {
    try {
      setLoading(true);
      const cacheData = await cacheService.getCachedQuestions();
      const questions = cacheData.questions || [];
      
      setOfflineQuestions(questions);
      
      // 查找当前题目
      let targetQuestion = null;
      let targetIndex = 0;
      
      if (questionId) {
        // 通过 ID 查找
        targetQuestion = questions.find(q => q.id === questionId);
        targetIndex = questions.findIndex(q => q.id === questionId);
      } else {
        // 没有指定 ID，显示第一题
        targetQuestion = questions[0] || null;
        targetIndex = 0;
      }
      
      if (targetQuestion) {
        setCurrentQuestion(targetQuestion);
        setCurrentIndex(targetIndex);
      } else {
        setError('未找到该题目或题目不在缓存中');
      }
    } catch (error) {
      console.error('加载离线题目失败:', error);
      setError('加载离线题目失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 导航到上一题
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setCurrentQuestion(offlineQuestions[newIndex]);
      
      // 通知父组件 URL 变化
      if (onNavigateToQuestion) {
        onNavigateToQuestion(offlineQuestions[newIndex].id);
      }
    }
  };

  // 导航到下一题
  const goToNext = () => {
    if (currentIndex < offlineQuestions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setCurrentQuestion(offlineQuestions[newIndex]);
      
      // 通知父组件 URL 变化
      if (onNavigateToQuestion) {
        onNavigateToQuestion(offlineQuestions[newIndex].id);
      }
    }
  };

  if (loading) {
    return (
      <div className="offline-detail-container">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>加载离线题目...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="offline-detail-container">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={onBack} className="back-btn">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="offline-detail-container">
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>题目不存在</h3>
          <p>该题目可能已被删除或不在缓存中</p>
          <button onClick={onBack} className="back-btn">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-detail-container">
      {/* 离线模式头部 */}
      <div className="offline-detail-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← 返回
          </button>
          <div className="offline-badge">离线模式</div>
        </div>
        
        <div className="header-center">
          <h3>题目详情</h3>
          <span className="question-counter">
            {currentIndex + 1} / {offlineQuestions.length}
          </span>
        </div>
        
        <div className="header-right">
          <button 
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="nav-button"
          >
            ← 上一题
          </button>
          <button 
            onClick={goToNext}
            disabled={currentIndex === offlineQuestions.length - 1}
            className="nav-button"
          >
            下一题 →
          </button>
        </div>
      </div>

      {/* 离线模式提示 */}
      <div className="offline-notice">
        <div className="notice-icon">📶</div>
        <div className="notice-content">
          <strong>离线模式</strong>
          <span>当前处于离线状态，部分功能受限</span>
        </div>
      </div>

      {/* 简化版题目详情显示 */}
      <div className="question-card-wrapper">
        <div className="offline-question-card">
          <div className="question-header">
            <h2 className="question-title">{currentQuestion.title}</h2>
            <div className="question-meta">
              <span 
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(currentQuestion.difficulty) }}
              >
                {getDifficultyText(currentQuestion.difficulty)}
              </span>
              <span className="category-tag">
                {currentQuestion.category?.name || '未分类'}
              </span>
            </div>
          </div>

          <div className="question-content">
            <div className="answer-section">
              <h4>详细答案</h4>
              <div className="answer-text">
                {currentQuestion.detailedAnswer || currentQuestion.oralAnswer || '暂无答案'}
              </div>
            </div>

            {currentQuestion.code && (
              <div className="code-section">
                <h4>代码</h4>
                <pre className="code-block">
                  <code>{currentQuestion.code}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="offline-detail-footer">
        <button 
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="footer-nav-button"
        >
          ← 上一题
        </button>
        
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${((currentIndex + 1) / offlineQuestions.length) * 100}%`
              }}
            ></div>
          </div>
          <span>进度: {currentIndex + 1} / {offlineQuestions.length}</span>
        </div>
        
        <button 
          onClick={goToNext}
          disabled={currentIndex === offlineQuestions.length - 1}
          className="footer-nav-button"
        >
          下一题 →
        </button>
      </div>
    </div>
  );
};

// 工具函数
const getDifficultyColor = (difficulty) => {
  switch (difficulty) {
    case 'easy': return '#52c41a';
    case 'medium': return '#faad14';
    case 'hard': return '#f5222d';
    default: return '#666';
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

const OfflineQuestionsPage = () => {
  const { categoryName, questionId } = useParams();
  const navigate = useNavigate();
  const [offlineQuestions, setOfflineQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' 或 'detail'

  useEffect(() => {
    loadOfflineData();
  }, [categoryName, questionId]);

  const loadOfflineData = async () => {
    try {
      const cacheData = await cacheService.getCachedQuestions();
      const questions = cacheData.questions || [];
      
      setOfflineQuestions(questions);
      
      // 根据分类过滤题目
      if (categoryName && categoryName !== 'all') {
        const filtered = questions.filter(q => 
          q.category?.name === categoryName || '未分类' === categoryName
        );
        setFilteredQuestions(filtered);
      } else {
        setFilteredQuestions(questions);
      }

      // 检查是否直接进入详情模式
      if (questionId) {
        setViewMode('detail');
      }
    } catch (error) {
      console.error('加载离线题目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (question) => {
    setViewMode('detail');
    navigate(`/offline/questions/${question.id}`);
  };

  const handleBackToList = () => {
    setViewMode('list');
    navigate('/offline/questions');
  };

  const handleNavigateToQuestion = (newQuestionId) => {
    navigate(`/offline/questions/${newQuestionId}`);
  };

  // 详情视图
  if (viewMode === 'detail') {
    return (
      <OfflineQuestionDetailCard 
        questionId={questionId}
        onBack={handleBackToList}
        onNavigateToQuestion={handleNavigateToQuestion}
      />
    );
  }

  // 列表视图
  if (loading) {
    return (
      <div className="offline-page">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>加载离线数据...</p>
        </div>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="offline-page">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>暂无离线题目</h3>
          <p>当前没有缓存的题目数据，请连接网络后缓存题目</p>
          <button 
            onClick={() => window.history.back()}
            className="back-btn"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-page">
      <div className="offline-header">
        <button 
          onClick={() => window.history.back()}
          className="back-button"
        >
          ← 返回主页
        </button>
        <h2>📦 离线题目</h2>
        {categoryName && categoryName !== 'all' && (
          <p>分类: {categoryName}</p>
        )}
        <div className="offline-stats">
          共 {filteredQuestions.length} 道题目 • 离线模式
        </div>
      </div>

      <div className="offline-actions">
        <div className="view-options">
          <span>排序方式:</span>
          <select className="sort-select">
            <option value="default">默认顺序</option>
            <option value="difficulty">按难度</option>
            <option value="title">按标题</option>
          </select>
        </div>
        
        <div className="cache-info">
          缓存时间: {new Date().toLocaleString()}
        </div>
      </div>

      <div className="offline-questions-list">
        {filteredQuestions.map((question, index) => (
          <div
            key={question.id || index}
            className="offline-question-card"
            onClick={() => handleQuestionClick(question)}
          >
            <div className="question-card-header">
              <h4 className="question-title">{question.title}</h4>
              <span 
                className="difficulty-badge"
                style={{ 
                  backgroundColor: getDifficultyColor(question.difficulty) 
                }}
              >
                {getDifficultyText(question.difficulty)}
              </span>
            </div>
            
            <div className="question-card-body">
              <p className="question-preview">
                {getAnswerPreview(question)}
              </p>
              
              <div className="question-meta">
                <span className="category-tag">
                  {question.category?.name || '未分类'}
                </span>
                <span className="offline-tag">离线</span>
              </div>
            </div>
            
            <div className="question-card-footer">
              <span className="question-date">
                创建: {new Date(question.createdAt).toLocaleDateString()}
              </span>
              <button className="view-detail-btn">
                查看详情 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getAnswerPreview = (question) => {
  const answer = question.oralAnswer || question.detailedAnswer || '';
  const preview = answer.substring(0, 120).replace(/[#*`]/g, '');
  return preview + (answer.length > 120 ? '...' : '');
};

export default OfflineQuestionsPage;