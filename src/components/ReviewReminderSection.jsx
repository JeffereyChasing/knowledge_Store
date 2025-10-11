// components/ReviewReminderSection.jsx
import React, { useState } from 'react';
import AV from 'leancloud-storage';
import './ReviewReminderSection.css';

const ReviewReminderSection = ({
  reviewQuestions,
  setReviewQuestions,
  reviewThreshold,
  setReviewThreshold,
  showReviewSettings,
  setShowReviewSettings,
  onQuestionClick, // 添加这个prop
  onUpdateQuestionTime,
  questions
}) => {
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingQuestions, setUpdatingQuestions] = useState(new Set());
  
  // 添加用户状态
  const [currentUser, setCurrentUser] = useState(AV.User.current());

  // 格式化时间显示
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffWeeks < 4) return `${diffWeeks}周前`;
    return `${diffMonths}月前`;
  };

  // 获取紧急程度 - 修改后的版本：1天=急需，3天=建议，5天=稍后
  const getUrgencyLevel = (question) => {
    // 使用 lastReviewedAt 字段，如果不存在则使用 createdAt
    const lastReviewed = new Date(question.lastReviewedAt || question.createdAt);
    const daysAgo = Math.floor((new Date() - lastReviewed) / (1000 * 60 * 60 * 24));
    
    if (daysAgo >= 5) return 'high';     // 5天及以上 = 急需复习
    if (daysAgo >= 3) return 'medium';   // 3-4天 = 建议复习
    return 'low';                        // 1-2天 = 可稍后复习
  };

  // 获取紧急程度颜色
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa726';
      case 'low': return '#4ecdc4';
      default: return '#95a5a6';
    }
  };

  // 获取紧急程度文本
  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'high': return '急需复习';
      case 'medium': return '建议复习';
      case 'low': return '可稍后复习';
      default: return '未知';
    }
  };

  // 获取紧急程度对应的天数描述
  const getUrgencyDaysDescription = (urgency) => {
    switch (urgency) {
      case 'high': return '5天以上未复习';
      case 'medium': return '3-4天未复习';
      case 'low': return '1-2天未复习';
      default: return '';
    }
  };

  // 处理立即复习 - 修复版本
  const handleReviewNow = async (questionId, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    

    // 验证题目是否存在
    const question = questions.find(q => q.id === questionId);
    if (!question) {
      console.error('未找到题目:', questionId);
      alert('题目不存在，请刷新页面重试');
      return;
    }


    // 添加到更新中的集合
    setUpdatingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      //('开始调用 onUpdateQuestionTime...');
      
      // 1. 首先更新题目的复习时间
      await onUpdateQuestionTime(questionId);
      
      //('onUpdateQuestionTime 调用成功');
      
      // 2. 从复习列表中移除该题目
      setReviewQuestions(prev => {
        const newList = prev.filter(q => q.id !== questionId);
        //('从复习列表移除后:', newList.length);
        return newList;
      });
      
      //('准备跳转到题目...');
      
      // 3. 找到题目信息并跳转到分类页面
      if (question && question.category) {
        //('跳转到分类:', question.category.id);
        
        // 调用父组件传递的跳转函数
        if (onQuestionClick) {
          onQuestionClick(questionId);
        } else {
          // 备用跳转逻辑
          handleQuestionClick(question);
        }
      } else {
        console.warn('无法找到题目对应的分类信息');
        alert('复习时间已更新，但无法跳转到题目位置');
      }
      
    } catch (error) {
      console.error('更新复习时间失败:', error);
      console.error('错误详情:', {
        questionId,
        currentUser: currentUser?.id,
        errorMessage: error.message
      });
      
      // 更详细的错误处理
      let errorMessage = '更新失败，请重试';
      
      if (error.message.includes('permission')) {
        errorMessage = '更新失败：没有权限修改此题目';
      } else if (error.message.includes('Object not found')) {
        errorMessage = '更新失败：题目不存在或已被删除';
      } else if (error.message.includes('未找到对应的题目')) {
        errorMessage = '更新失败：本地数据中未找到该题目';
      } else if (error.message.includes('reserved')) {
        errorMessage = '更新失败：数据字段冲突，请刷新页面重试';
      }
      
      alert(errorMessage);
    } finally {
      // 从更新中的集合移除
      setUpdatingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  // 处理稍后提醒
  const handlePostpone = (questionId, e) => {
    e.stopPropagation();
    // 这里可以添加更复杂的逻辑，比如推迟到明天等
    alert('已推迟提醒，该题目将在明天再次出现在复习列表中');
  };

  // 处理题目点击 - 跳转到分类详情页
  const handleQuestionClick = (question) => {
    if (!question.category?.id) {
      console.warn('题目没有分类信息，无法跳转');
      alert('该题目没有分类信息，无法跳转');
      return;
    }

    // 构建跳转URL
    const categoryUrl = `/category/${question.category.id}`;
    
    // 使用 navigate 或 window.location 进行跳转
    if (window.history.pushState) {
      window.history.pushState(null, '', categoryUrl);
      // 触发路由变化
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.location.href = categoryUrl;
    }
    
    // 可以添加一个滚动到特定题目的逻辑
    // 这里需要在 CategoryDetailPage 中添加相应的处理
    setTimeout(() => {
      // 触发自定义事件，让 CategoryDetailPage 知道要滚动到哪个题目
      window.dispatchEvent(new CustomEvent('scrollToQuestion', { 
        detail: { questionId: question.id } 
      }));
    }, 100);
  };

  // 过滤题目
  const filteredQuestions = reviewQuestions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedUrgency === 'all') return matchesSearch;
    
    const urgency = getUrgencyLevel(question);
    return matchesSearch && urgency === selectedUrgency;
  });

  // 按紧急程度分组 - 使用新的天数标准
  const questionsByUrgency = {
    high: filteredQuestions.filter(q => getUrgencyLevel(q) === 'high'),    // 5天以上
    medium: filteredQuestions.filter(q => getUrgencyLevel(q) === 'medium'), // 3-4天
    low: filteredQuestions.filter(q => getUrgencyLevel(q) === 'low')        // 1-2天
  };

  // 获取进度百分比
  const getProgressPercentage = () => {
    const totalQuestions = questions.length;
    const reviewedQuestions = totalQuestions - reviewQuestions.length;
    return totalQuestions > 0 ? (reviewedQuestions / totalQuestions) * 100 : 0;
  };

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <section className="review-reminder-section">
        <div className="container">
          <div className="auth-required-container">
            <div className="auth-required-icon">🔐</div>
            <h2>请先登录</h2>
            <p>登录后即可查看复习提醒</p>
            <div className="auth-required-actions">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('showAuthModal'))}
                className="login-btn"
              >
                立即登录
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="review-reminder-section">
      <div className="container">
        {/* 用户欢迎信息 */}
        <div className="user-welcome-banner">
          <h3>📚 复习提醒 - {currentUser.getUsername()}</h3>
          <p>及时复习是巩固知识的关键，以下是需要您关注的题目</p>
        </div>

        {/* 头部统计信息 */}
        <div className="review-header">
          <div className="review-stats">
            <div className="stat-card urgent">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-number">{questionsByUrgency.high.length}</div>
                <div className="stat-label">急需复习</div>
                <div className="stat-description">5天以上</div>
              </div>
            </div>
            <div className="stat-card medium">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-number">{questionsByUrgency.medium.length}</div>
                <div className="stat-label">建议复习</div>
                <div className="stat-description">3-4天</div>
              </div>
            </div>
            <div className="stat-card low">
              <div className="stat-icon">💡</div>
              <div className="stat-content">
                <div className="stat-number">{questionsByUrgency.low.length}</div>
                <div className="stat-label">可稍后复习</div>
                <div className="stat-description">1-2天</div>
              </div>
            </div>
            <div className="stat-card total">
              <div className="stat-icon">📚</div>
              <div className="stat-content">
                <div className="stat-number">{reviewQuestions.length}</div>
                <div className="stat-label">待复习题目</div>
                <div className="stat-description">总计</div>
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="review-progress">
            <div className="progress-header">
              <span>复习进度</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="progress-stats">
              <span>{questions.length - reviewQuestions.length} / {questions.length} 题目已及时复习</span>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="review-controls">
          <div className="controls-left">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索题目或分类..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="urgency-filter">
              <button
                className={`urgency-btn ${selectedUrgency === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedUrgency('all')}
              >
                全部
              </button>
              <button
                className={`urgency-btn high ${selectedUrgency === 'high' ? 'active' : ''}`}
                onClick={() => setSelectedUrgency('high')}
              >
                🔥 急需 (5天+)
              </button>
              <button
                className={`urgency-btn medium ${selectedUrgency === 'medium' ? 'active' : ''}`}
                onClick={() => setSelectedUrgency('medium')}
              >
                ⚠️ 建议 (3-4天)
              </button>
              <button
                className={`urgency-btn low ${selectedUrgency === 'low' ? 'active' : ''}`}
                onClick={() => setSelectedUrgency('low')}
              >
                💡 稍后 (1-2天)
              </button>
            </div>
          </div>

          <div className="controls-right">
            <button
              className="settings-btn"
              onClick={() => setShowReviewSettings(true)}
            >
              ⚙️ 复习设置
            </button>
          </div>
        </div>

        {/* 复习设置弹窗 */}
        {showReviewSettings && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>复习提醒设置</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowReviewSettings(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="settings-content">
                <div className="setting-item">
                  <label htmlFor="reviewThreshold">
                    复习提醒阈值
                    <span className="hint">（超过这个天数的题目会出现在复习列表中）</span>
                  </label>
                  <div className="threshold-control">
                    <input
                      id="reviewThreshold"
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={reviewThreshold}
                      onChange={(e) => setReviewThreshold(parseInt(e.target.value))}
                      className="threshold-slider"
                    />
                    <span className="threshold-value">{reviewThreshold} 天</span>
                  </div>
                  <div className="threshold-presets">
                    {[1, 3, 5, 7, 14, 30].map(days => (
                      <button
                        key={days}
                        className={`preset-btn ${reviewThreshold === days ? 'active' : ''}`}
                        onClick={() => setReviewThreshold(days)}
                      >
                        {days}天
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="urgency-explanation">
                  <h4>📋 紧急程度说明</h4>
                  <div className="urgency-levels">
                    <div className="urgency-level high">
                      <span className="urgency-color" style={{backgroundColor: '#ff6b6b'}}></span>
                      <div className="urgency-info">
                        <strong>急需复习 (红色)</strong>
                        <span>5天以上未复习的题目</span>
                      </div>
                    </div>
                    <div className="urgency-level medium">
                      <span className="urgency-color" style={{backgroundColor: '#ffa726'}}></span>
                      <div className="urgency-info">
                        <strong>建议复习 (橙色)</strong>
                        <span>3-4天未复习的题目</span>
                      </div>
                    </div>
                    <div className="urgency-level low">
                      <span className="urgency-color" style={{backgroundColor: '#4ecdc4'}}></span>
                      <div className="urgency-info">
                        <strong>可稍后复习 (青色)</strong>
                        <span>1-2天未复习的题目</span>
                      </div>
                    </div>
                  </div>
                </div>

                
              </div>
              
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowReviewSettings(false)}
                >
                  取消
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => setShowReviewSettings(false)}
                >
                  确认设置
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 题目列表 */}
        <div className="review-questions">
          {filteredQuestions.length === 0 ? (
            <div className="empty-review-state">
              <div className="empty-icon">🎉</div>
              <h3>太棒了！没有需要复习的题目</h3>
              <p>继续保持良好的复习习惯，或者调整复习设置来查看更多题目</p>
              <button
                className="adjust-settings-btn"
                onClick={() => setShowReviewSettings(true)}
              >
                调整复习设置
              </button>
            </div>
          ) : (
            <div className="questions-grid">
              {filteredQuestions.map((question, index) => {
                const urgency = getUrgencyLevel(question);
                const urgencyColor = getUrgencyColor(urgency);
                // 使用 lastReviewedAt 字段
                const lastReviewed = new Date(question.lastReviewedAt || question.createdAt);
                const daysAgo = Math.floor((new Date() - lastReviewed) / (1000 * 60 * 60 * 24));
                const isUpdating = updatingQuestions.has(question.id);
                
                return (
                  <div
                    key={question.id}
                    className={`review-question-card ${isUpdating ? 'updating' : ''}`}
                    onClick={() => handleQuestionClick(question)}
                    style={{ '--urgency-color': urgencyColor }}
                  >
                    <div className="card-header">
                      <div className="urgency-indicator" style={{ backgroundColor: urgencyColor }}></div>
                      <div className="question-meta">
                        <span className="urgency-badge" style={{ backgroundColor: urgencyColor }}>
                          {getUrgencyText(urgency)}
                        </span>
                        <span className="category-tag">
                          {question.category?.name || '未分类'}
                        </span>
                      </div>
                      <div className="time-info">
                        <span className="last-reviewed">
                          上次复习: {formatTimeAgo(question.lastReviewedAt || question.createdAt)}
                        </span>
                        <span className="days-ago">({daysAgo}天前)</span>
                        <span className="urgency-description">
                          {getUrgencyDaysDescription(urgency)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-content">
                      <h4 className="question-title">{question.title}</h4>
                      
                      {question.detailedAnswer && (
                        <div className="answer-preview">
                          {question.detailedAnswer.substring(0, 100)}...
                        </div>
                      )}
                      
                      <div className="question-tags">
                        <span className={`difficulty-tag difficulty-${question.difficulty}`}>
                          {question.difficulty === 'easy' ? '简单' : 
                           question.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                        {question.tags && question.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={tagIndex} className="tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <div className="review-actions">
                        <button 
                          className="review-now-btn"
                          onClick={(e) => handleReviewNow(question.id, e)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? '🔄 更新中...' : '🔍 立即复习'}
                        </button>
                        <button 
                          className="postpone-btn"
                          onClick={(e) => handlePostpone(question.id, e)}
                          disabled={isUpdating}
                        >
                          ⏰ 稍后提醒
                        </button>
                      </div>
                    </div>
                    
                    {isUpdating && (
                      <div className="updating-overlay">
                        <div className="updating-spinner"></div>
                        <span>更新中...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewReminderSection;