import React, { useState } from 'react';
import './QuestionCard.css';

const QuestionCard = () => {
  const [question, setQuestion] = useState({
    title: '',
    answer: '',
    proficiency: 'beginner',
    completionTime: new Date().toISOString().split('T')[0], // 默认今天
    completionDateTime: new Date().toISOString().slice(0, 16), // 包含日期和时间
    knowledgePoints: [],
    newKnowledgePoint: ''
  });

  const [isEditing, setIsEditing] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  const proficiencyLevels = [
    { value: 'beginner', label: '初学者', color: '#ff6b6b' },
    { value: 'intermediate', label: '掌握中', color: '#4ecdc4' },
    { value: 'advanced', label: '熟练', color: '#45b7d1' },
    { value: 'master', label: '精通', color: '#96ceb4' }
  ];

  const handleAddKnowledgePoint = () => {
    if (question.newKnowledgePoint.trim()) {
      setQuestion({
        ...question,
        knowledgePoints: [...question.knowledgePoints, question.newKnowledgePoint.trim()],
        newKnowledgePoint: ''
      });
    }
  };

  const handleRemoveKnowledgePoint = (index) => {
    const newPoints = question.knowledgePoints.filter((_, i) => i !== index);
    setQuestion({ ...question, knowledgePoints: newPoints });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.title && question.answer) {
      setIsEditing(false);
      //('题目已保存:', question);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const getProficiencyInfo = (level) => {
    return proficiencyLevels.find(p => p.value === level) || proficiencyLevels[0];
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
  };

  const getTimeAgo = (dateTimeString) => {
    const now = new Date();
    const past = new Date(dateTimeString);
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - past) / (1000 * 60));
      return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}天前`;
    }
  };

  if (!isEditing) {
    return (
      <div className="question-card preview-mode">
        <div className="card-header">
          <h2 className="question-title">{question.title}</h2>
          <button className="edit-btn" onClick={handleEdit}>
            <span>✏️</span> 编辑
          </button>
        </div>
        
        <div className="card-content">
          <div className="info-section">
            <label>掌握程度:</label>
            <span 
              className="proficiency-badge"
              style={{ backgroundColor: getProficiencyInfo(question.proficiency).color }}
            >
              {getProficiencyInfo(question.proficiency).label}
            </span>
          </div>

          <div className="info-section">
            <label>完成时间:</label>
            <div className="time-display">
              <span className="time-value">{formatDateTime(question.completionDateTime)}</span>
              <span className="time-ago">({getTimeAgo(question.completionDateTime)})</span>
            </div>
          </div>

          <div className="info-section">
            <label>题目答案:</label>
            <div className="answer-content">{question.answer}</div>
          </div>

          {question.knowledgePoints.length > 0 && (
            <div className="info-section">
              <label>相关知识点:</label>
              <div className="knowledge-tags">
                {question.knowledgePoints.map((point, index) => (
                  <span key={index} className="knowledge-tag">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="question-card edit-mode">
      <form onSubmit={handleSubmit} className="question-form">
        <div className="form-group">
          <label htmlFor="title">题目名称 *</label>
          <input
            id="title"
            type="text"
            value={question.title}
            onChange={(e) => setQuestion({ ...question, title: e.target.value })}
            placeholder="请输入题目名称"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="answer">题目答案 *</label>
          <textarea
            id="answer"
            value={question.answer}
            onChange={(e) => setQuestion({ ...question, answer: e.target.value })}
            placeholder="请输入题目答案或解题思路"
            rows="4"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>掌握程度</label>
            <div className="proficiency-options">
              {proficiencyLevels.map((level) => (
                <label key={level.value} className="radio-label">
                  <input
                    type="radio"
                    value={level.value}
                    checked={question.proficiency === level.value}
                    onChange={(e) => setQuestion({ ...question, proficiency: e.target.value })}
                  />
                  <span 
                    className="radio-custom"
                    style={{ borderColor: level.color }}
                  ></span>
                  {level.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="completionDateTime">完成时间</label>
            <div className="datetime-input-container">
              <input
                id="completionDateTime"
                type="datetime-local"
                value={question.completionDateTime}
                onChange={(e) => setQuestion({ ...question, completionDateTime: e.target.value })}
                className="datetime-input"
              />
              <button 
                type="button" 
                className="now-btn"
                onClick={() => setQuestion({ 
                  ...question, 
                  completionDateTime: new Date().toISOString().slice(0, 16) 
                })}
              >
                现在
              </button>
            </div>
            <div className="datetime-preview">
              选择时间: {formatDateTime(question.completionDateTime)}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>相关知识点</label>
          <div className="knowledge-points-input">
            <input
              type="text"
              value={question.newKnowledgePoint}
              onChange={(e) => setQuestion({ ...question, newKnowledgePoint: e.target.value })}
              placeholder="输入知识点后按回车或点击添加"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKnowledgePoint())}
            />
            <button type="button" onClick={handleAddKnowledgePoint} className="add-btn">
              添加
            </button>
          </div>
          
          {question.knowledgePoints.length > 0 && (
            <div className="knowledge-tags-editable">
              {question.knowledgePoints.map((point, index) => (
                <span key={index} className="knowledge-tag editable">
                  {point}
                  <button 
                    type="button"
                    onClick={() => handleRemoveKnowledgePoint(index)}
                    className="remove-tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            💾 保存题目
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionCard;