// src/pages/ReviewPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAllQuestions, updateQuestion } from '../services/questionService';
import AV from 'leancloud-storage';
import ReviewReminderSection from '../components/ReviewReminderSection';
import './ReviewPage.css';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

const ReviewPage = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 复习提醒相关状态
  const [reviewThreshold, setReviewThreshold] = useState(7);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [showReviewSettings, setShowReviewSettings] = useState(false);

  // 用户状态
  const [currentUser, setCurrentUser] = useState(null);

  // 检查用户登录状态
  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
    
    if (user) {
      initializeData();
    } else {
      setLoading(false);
    }
  }, []);

  const initializeData = async () => {
    try {
      const questionsData = await getAllQuestions();
      setQuestions(questionsData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 计算需要复习的题目
  useEffect(() => {
    const calculateReviewQuestions = () => {
      const now = new Date();
      const thresholdMs = reviewThreshold * 24 * 60 * 60 * 1000;
      
      const needReview = questions.filter(question => {
        const lastReviewed = new Date(question.updatedAt || question.createdAt);
        const timeDiff = now - lastReviewed;
        return timeDiff >= thresholdMs;
      }).sort((a, b) => {
        return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
      });
      
      setReviewQuestions(needReview);
    };

    if (questions.length > 0) {
      calculateReviewQuestions();
    }
  }, [questions, reviewThreshold]);

  // 更新题目复习时间
  const handleUpdateQuestionTime = async (questionId) => {
    try {
      console.log('更新题目复习时间:', questionId);
      
      const currentTime = new Date().toISOString();
      
      await updateQuestion(questionId, {
        updatedAt: currentTime
      });
      
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, updatedAt: currentTime }
          : q
      ));
      
      console.log(`题目 ${questionId} 复习时间已更新`);
      return true;
    } catch (error) {
      console.error('更新题目时间失败:', error);
      throw error;
    }
  };

  const handleQuestionClick = (questionId) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.category) {
      navigate(`/category/${question.category.id}`);
    }
  };

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className="review-page">
        <div className="auth-required-container">
          <div className="auth-required-icon">🔐</div>
          <h2>请先登录</h2>
          <p>登录后即可使用复习提醒功能</p>
          <div className="auth-required-actions">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('showAuthModal', { 
                  detail: { tab: 'login' } 
                }));
              }}
              className="login-btn primary"
            >
              🚀 立即登录
            </button>
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('showAuthModal', { 
                  detail: { tab: 'register' } 
                }));
              }}
              className="login-btn secondary"
            >
              📝 注册账号
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="review-page">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>加载复习数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-page">
        <div className="error-container">
          <h2>加载失败</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="review-page">
        <header className="review-hero-section">
          <div className="hero-content">
            <div className="user-welcome">
              <h1 className="hero-title">📚 复习提醒</h1>
              <p className="hero-subtitle">
                智能管理您的学习进度，{reviewQuestions.length > 0 ? 
                  `有 ${reviewQuestions.length} 道题目需要复习` : 
                  '所有题目都已及时复习'
                }
              </p>
            </div>
            
            <div className="review-stats-overview">
              <div className="stat-card">
                <div className="stat-number">{questions.length}</div>
                <div className="stat-label">总题目数</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-number">{reviewQuestions.length}</div>
                <div className="stat-label">待复习</div>
              </div>
              <div className="stat-card success">
                <div className="stat-number">{questions.length - reviewQuestions.length}</div>
                <div className="stat-label">已复习</div>
              </div>
            </div>
          </div>
        </header>

        <ReviewReminderSection
          reviewQuestions={reviewQuestions}
          setReviewQuestions={setReviewQuestions}
          reviewThreshold={reviewThreshold}
          setReviewThreshold={setReviewThreshold}
          showReviewSettings={showReviewSettings}
          setShowReviewSettings={setShowReviewSettings}
          onQuestionClick={handleQuestionClick}
          onUpdateQuestionTime={handleUpdateQuestionTime}
          questions={questions}
        />

        <footer className="review-footer">
          <div className="footer-actions">
            <button 
              onClick={() => navigate('/')}
              className="back-to-home-btn"
            >
              ← 返回首页
            </button>
            <div className="footer-info">
              基于间隔重复原理，帮助您高效记忆
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
};

export default ReviewPage;