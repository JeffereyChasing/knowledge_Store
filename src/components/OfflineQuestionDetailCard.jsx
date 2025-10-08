// components/OfflineQuestionDetailCard.jsx
import React, { useState, useEffect } from 'react';
import QuestionDetailCard from './QuestionDetailCard';
import { cacheService } from '../services/cacheService';
import { offlineService } from '../services/offlineService';
import './OfflineQuestionDetailCard.css';

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

  // 离线模式下的空操作函数
  const handleOfflineDelete = () => {
    alert('离线模式下无法删除题目');
  };

  const handleOfflineUpdate = () => {
    alert('离线模式下无法更新题目');
  };

  const handleOfflineEdit = () => {
    alert('离线模式下无法编辑题目');
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

      {/* 使用原有的 QuestionDetailCard 组件渲染 */}
      <div className="question-card-wrapper">
        <QuestionDetailCard 
          question={currentQuestion}
          isExpandedView={true}
          onDelete={handleOfflineDelete}
          onUpdateField={handleOfflineUpdate}
          onEdit={handleOfflineEdit}
          showQuestionForm={false}
          setShowQuestionForm={() => {}}
          editingQuestion={null}
          setEditingQuestion={() => {}}
        />
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

export default OfflineQuestionDetailCard;