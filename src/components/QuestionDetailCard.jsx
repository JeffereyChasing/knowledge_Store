// components/QuestionDetailCard.jsx
import React, { useState, useEffect } from 'react';
import QuestionForm from './QuestionForm';
import AV from 'leancloud-storage';
import './QuestionDetailCard.css';

const QuestionDetailCard = ({ question, onUpdate, onDelete, isExpandedView = false, onUpdateField }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(isExpandedView);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [activeAnswerTab, setActiveAnswerTab] = useState('oral');
  const [localAppearanceLevel, setLocalAppearanceLevel] = useState(question?.appearanceLevel || 50);
  const [updatingAppearance, setUpdatingAppearance] = useState(false);
  
  // 添加确认复习相关状态
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [reviewDays, setReviewDays] = useState(7); // 默认7天
  const [confirmingReview, setConfirmingReview] = useState(false);
  
  // 添加移除复习相关状态
  const [showRemoveReview, setShowRemoveReview] = useState(false);
  const [removeDays, setRemoveDays] = useState(7); // 默认7天
  const [removingReview, setRemovingReview] = useState(false);
  
  // 添加用户状态
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);
  }, []);

  // 当question的appearanceLevel变化时更新本地状态
  useEffect(() => {
    console.log('question.appearanceLevel 变化:', question?.appearanceLevel);
    setLocalAppearanceLevel(question?.appearanceLevel);
  }, [question?.appearanceLevel]);

  // 监控状态变化用于调试
  useEffect(() => {
    console.log('localAppearanceLevel 状态变化:', localAppearanceLevel);
  }, [localAppearanceLevel]);

  // 简单的 Markdown 解析函数
  const parseMarkdown = (text) => {
    if (!text || text.trim() === '') {
      return <span className="no-content">暂无内容</span>;
    }

    // 分割文本为行
    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeLanguage = '';

    lines.forEach((line, index) => {
      // 检查代码块开始 (```language)
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim() || 'text';
          codeBlockContent = [];
          return;
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={`code-${index}`} className="code-block">
              <code className={`language-${codeLanguage}`}>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          return;
        }
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      let processedLine = line;

      // 处理标题
      if (line.startsWith('### ')) {
        elements.push(<h3 key={`h3-${index}`} className="md-h3">{line.substring(4)}</h3>);
        return;
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={`h2-${index}`} className="md-h2">{line.substring(3)}</h2>);
        return;
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={`h1-${index}`} className="md-h1">{line.substring(2)}</h1>);
        return;
      }

      // 处理粗体
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');

      // 处理斜体
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      processedLine = processedLine.replace(/_(.*?)_/g, '<em>$1</em>');

      // 处理代码片段
      processedLine = processedLine.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

      // 处理链接
      processedLine = processedLine.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

      // 处理无序列表
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItem = line.trim().substring(2);
        elements.push(
          <div key={`li-${index}`} className="md-list-item">
            • {listItem}
          </div>
        );
        return;
      }

      // 处理有序列表
      const orderedListMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
      if (orderedListMatch) {
        elements.push(
          <div key={`oli-${index}`} className="md-list-item">
            {orderedListMatch[1]}. {orderedListMatch[2]}
          </div>
        );
        return;
      }

      // 处理引用块
      if (line.trim().startsWith('> ')) {
        elements.push(
          <blockquote key={`blockquote-${index}`} className="md-blockquote">
            {line.substring(2)}
          </blockquote>
        );
        return;
      }

      // 普通段落
      elements.push(
        <div 
          key={`p-${index}`} 
          className="md-paragraph"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="code-final" className="code-block">
          <code className={`language-${codeLanguage}`}>{codeBlockContent.join('\n')}</code>
        </pre>
      );
    }

    return <div className="markdown-content">{elements}</div>;
  };

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

  const formatText = (text) => {
    return parseMarkdown(text);
  };

  const formatCode = (code) => {
    if (!code || code.trim() === '') {
      return null;
    }
    return (
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    );
  };

  const handleEdit = () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    if (deleteLoading) return;
    
    if (!window.confirm(`确定要删除题目 "${question.title}" 吗？此操作不可撤销！`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      await onDelete(question.id);
    } catch (error) {
      console.error('删除题目失败:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // 确保父组件重新获取数据
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const toggleAnswer = () => {
    setShowFullAnswer(!showFullAnswer);
  };

  // 处理出现频率更改 - 优化版本
  const handleAppearanceLevelChange = async (newLevel) => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    console.log('开始更新出现频率:', {
      新值: newLevel,
      当前prop值: question?.appearanceLevel,
      当前本地状态值: localAppearanceLevel
    });
    
    // 立即更新本地状态（乐观更新）
    setLocalAppearanceLevel(newLevel);
    
    if (onUpdateField && question?.id) {
      setUpdatingAppearance(true);
      try {
        await onUpdateField(question.id, 'appearanceLevel', newLevel);
        console.log('出现频率更新成功，等待父组件数据更新');
        
        // 注意：这里不直接更新本地状态，等待父组件传递新的 question prop
        // 父组件应该在 onUpdateField 成功后更新数据并重新传递 question prop
        
      } catch (error) {
        console.error('更新出现频率失败:', error);
        // 出错时回滚到原来的值
        setLocalAppearanceLevel(question?.appearanceLevel || 50);
      } finally {
        setUpdatingAppearance(false);
      }
    } else {
      console.warn('缺少 onUpdateField 或 question.id');
    }
  };

  // 防抖的滑块处理函数
  const handleSliderChange = (e) => {
    const newLevel = parseInt(e.target.value);
    handleAppearanceLevelChange(newLevel);
  };

  // 处理确认复习
  const handleConfirmReview = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    if (confirmingReview) return;

    setConfirmingReview(true);
    try {
      // 计算下次提醒时间
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + reviewDays);
      
      // 更新题目的下次复习时间
      if (onUpdateField && question?.id) {
        await onUpdateField(question.id, 'nextReviewDate', nextReviewDate.toISOString());
        console.log(`题目将在 ${reviewDays} 天后再次提醒复习`);
        
        // 显示成功消息
        alert(`已确认复习！该题目将在 ${reviewDays} 天后再次出现在复习列表中`);
        
        // 关闭确认对话框
        setShowReviewConfirm(false);
        
        // 通知父组件更新
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('确认复习失败:', error);
      alert('确认复习失败，请重试');
    } finally {
      setConfirmingReview(false);
    }
  };

  // 处理移除复习
  const handleRemoveFromReview = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    if (removingReview) return;

    setRemovingReview(true);
    try {
      // 计算下次提醒时间
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + removeDays);
      
      // 更新题目的下次复习时间
      if (onUpdateField && question?.id) {
        await onUpdateField(question.id, 'nextReviewDate', nextReviewDate.toISOString());
        console.log(`题目将在 ${removeDays} 天后再次提醒复习`);
        
        // 显示成功消息
        alert(`已暂停复习！该题目将在 ${removeDays} 天后再次出现在复习列表中`);
        
        // 关闭确认对话框
        setShowRemoveReview(false);
        
        // 通知父组件更新
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('移除复习失败:', error);
      alert('操作失败，请重试');
    } finally {
      setRemovingReview(false);
    }
  };

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className={`question-detail-card ${isExpandedView ? 'expanded-view' : ''}`}>
        <div className="auth-required-container">
          <div className="auth-required-icon">🔐</div>
          <h3>请先登录</h3>
          <p>登录后即可查看题目详情</p>
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
    );
  }

  if (isEditing) {
    return (
      <div className={`question-edit-container ${isExpandedView ? 'expanded-view' : ''}`}>
        <QuestionForm
          question={question}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // 安全地获取数据
  const detailedAnswer = question?.detailedAnswer || '';
  const oralAnswer = question?.oralAnswer || '';
  const code = question?.code || '';
  const url = question?.url || '';
  // 使用本地状态而不是直接使用 question.appearanceLevel
  const appearanceLevel = localAppearanceLevel;

  return (
    <div className={`question-detail-card ${isExpandedView ? 'expanded-view' : ''}`}>
     
      {/* 头部信息 */}
      {!isExpandedView && (
        <div className="question-header">
          <div className="question-title-section">
            <h3 className="question-title">{question?.title || '无标题'}</h3>
            <div className="question-meta-badges">
              <span 
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(question?.difficulty) }}
              >
                {getDifficultyText(question?.difficulty)}
              </span>
              <span className="proficiency-badge">
                {getProficiencyText(question?.proficiency)}
              </span>
            </div>
          </div>
          
          <div className="question-actions">
            <button 
              onClick={handleEdit}
              className="btn-edit"
              title="编辑题目"
              disabled={deleteLoading}
            >
              {editLoading ? '编辑中...' : '✏️ 编辑'}
            </button>
            <button 
              onClick={() => setShowRemoveReview(true)}
              className="btn-remove-review"
              title="暂时移除复习"
            >
              ⏸️ 暂停复习
            </button>
            <button 
              onClick={handleDelete}
              className="btn-delete"
              title="删除题目"
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '🗑️ 删除'}
            </button>
          </div>
        </div>
      )}

      {/* 出现频率显示 - 可编辑 */}
      <div className="appearance-level-display">
        <div className="appearance-header">
          <span className="appearance-label">出现频率</span>
          <span className={`appearance-value ${updatingAppearance ? 'updating' : ''}`}>
            {updatingAppearance ? '保存中...' : `${appearanceLevel}%`}
          </span>
        </div>
        <div className="appearance-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={appearanceLevel}
            onChange={handleSliderChange}
            className="appearance-slider-editable"
            disabled={updatingAppearance}
            style={{
              background: `linear-gradient(90deg, 
                ${getAppearanceLevelColor(0)} 0%, 
                ${getAppearanceLevelColor(50)} 50%, 
                ${getAppearanceLevelColor(100)} 100%)`
            }}
          />
        </div>
        <div className="appearance-labels">
          <span className="appearance-label-low">低频</span>
          <span className="appearance-label-high">高频</span>
        </div>
        <div className="appearance-hint">
          拖动滑块调整出现频率，数值越高在复习时出现的概率越大
          {updatingAppearance && <span className="saving-indicator"> • 保存中...</span>}
        </div>
      </div>

      {/* 答案内容区域 */}
      <div className="answer-section">
        {!isExpandedView && (
          <div className="answer-header">
            <h4>答案</h4>
            <div className="answer-controls">
              <div className="answer-tabs">
                <button 
                  className={`tab-button ${activeAnswerTab === 'detailed' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('detailed')}
                >
                  详细版本
                </button>
                <button 
                  className={`tab-button ${activeAnswerTab === 'oral' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('oral')}
                >
                  口述版本
                </button>
              </div>
              <button 
                onClick={toggleAnswer}
                className="toggle-answer-btn"
              >
                {showFullAnswer ? '收起' : '展开'}
              </button>
            </div>
          </div>
        )}

        {/* 答案内容 */}
        <div className={`answer-content ${showFullAnswer || isExpandedView ? 'expanded' : 'collapsed'}`}>
          {isExpandedView ? (
            <div className="expanded-answer-tabs">
              <div className="expanded-tab-buttons">
                <button 
                  className={`expanded-tab-button ${activeAnswerTab === 'detailed' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('detailed')}
                >
                  详细版本
                </button>
                <button 
                  className={`expanded-tab-button ${activeAnswerTab === 'oral' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('oral')}
                >
                  口述版本
                </button>
              </div>
              
              <div className="expanded-tab-content">
                {activeAnswerTab === 'detailed' ? (
                  <div className="detailed-answer">
                    <h5>详细答案</h5>
                    <div className="answer-text markdown-enabled">
                      {formatText(detailedAnswer)}
                    </div>
                  </div>
                ) : (
                  <div className="oral-answer">
                    <h5>口述答案</h5>
                    <div className="answer-text markdown-enabled">
                      {formatText(oralAnswer)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="answer-text markdown-enabled">
              {activeAnswerTab === 'detailed' ? formatText(detailedAnswer) : formatText(oralAnswer)}
            </div>
          )}
        </div>

        {/* 代码部分 */}
        {code && code.trim() && (
          <div className="code-section">
            <h5>相关代码</h5>
            {formatCode(code)}
          </div>
        )}

        {/* 链接部分 */}
        {url && url.trim() && (
          <div className="url-section">
            <h5>相关链接</h5>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="question-link"
            >
              🔗 {url}
            </a>
          </div>
        )}
      </div>

      {/* 确认复习按钮 */}
      <div className="review-confirm-section">
        <button 
          className="confirm-review-btn"
          onClick={() => setShowReviewConfirm(true)}
        >
          ✅ 确认已复习
        </button>
        <p className="review-hint">
          点击确认后，该题目将在一段时间内不会出现在复习列表中
        </p>
      </div>

      {/* 确认复习对话框 */}
      {showReviewConfirm && (
        <div className="modal-overlay">
          <div className="modal-content review-confirm-modal">
            <div className="modal-header">
              <h3>确认复习完成</h3>
              <button 
                className="close-btn"
                onClick={() => setShowReviewConfirm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>请选择在多少天内不再提醒复习这道题目：</p>
              
              <div className="review-days-selector">
                <div className="days-presets">
                  {[1, 3, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      className={`days-preset-btn ${reviewDays === days ? 'active' : ''}`}
                      onClick={() => setReviewDays(days)}
                    >
                      {days}天
                    </button>
                  ))}
                </div>
                
                <div className="custom-days-input">
                  <label htmlFor="customDays">自定义天数：</label>
                  <input
                    id="customDays"
                    type="number"
                    min="1"
                    max="365"
                    value={reviewDays}
                    onChange={(e) => setReviewDays(parseInt(e.target.value) || 1)}
                    className="days-input"
                  />
                </div>
              </div>
              
              <div className="review-info">
                <p><strong>题目：</strong>{question?.title}</p>
                <p><strong>下次提醒时间：</strong>
                  {new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowReviewConfirm(false)}
                disabled={confirmingReview}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleConfirmReview}
                disabled={confirmingReview}
              >
                {confirmingReview ? '确认中...' : '确认复习'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移除复习对话框 */}
      {showRemoveReview && (
        <div className="modal-overlay">
          <div className="modal-content remove-review-modal">
            <div className="modal-header">
              <h3>暂停复习提醒</h3>
              <button 
                className="close-btn"
                onClick={() => setShowRemoveReview(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>选择在多少天内不再提醒复习这道题目：</p>
              
              <div className="remove-days-selector">
                <div className="days-presets">
                  {[1, 3, 7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      className={`days-preset-btn ${removeDays === days ? 'active' : ''}`}
                      onClick={() => setRemoveDays(days)}
                    >
                      {days}天
                    </button>
                  ))}
                </div>
                
                <div className="custom-days-input">
                  <label htmlFor="customRemoveDays">自定义天数：</label>
                  <input
                    id="customRemoveDays"
                    type="number"
                    min="1"
                    max="365"
                    value={removeDays}
                    onChange={(e) => setRemoveDays(parseInt(e.target.value) || 1)}
                    className="days-input"
                  />
                </div>
              </div>
              
              <div className="remove-review-info">
                <p><strong>题目：</strong>{question?.title}</p>
                <p><strong>下次提醒时间：</strong>
                  {new Date(Date.now() + removeDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
                <p className="info-text">
                  💡 在此期间，该题目不会出现在复习列表中
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowRemoveReview(false)}
                disabled={removingReview}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleRemoveFromReview}
                disabled={removingReview}
              >
                {removingReview ? '处理中...' : '确认暂停'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详细信息 */}
      <div className="card-details">
        {!isExpandedView && (
          <div className="category-info">
            <span className="category-label">所属分类:</span>
            <span className="category-name">{question?.category?.name || '未分类'}</span>
          </div>
        )}

        {question?.tags && question.tags.length > 0 && (
          <div className="tags-section">
            <h4>标签</h4>
            <div className="tags-container">
              {question.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="time-info">
          <span className="create-time">
            创建: {question?.createdAt ? new Date(question.createdAt).toLocaleDateString() : '未知'}
          </span>
          <span className="update-time">
            更新: {question?.updatedAt ? new Date(question.updatedAt).toLocaleDateString() : '未知'}
          </span>
        </div>
      </div>

      {/* 展开视图下的操作按钮 */}
      {isExpandedView && (
        <div className="expanded-actions">
          <button 
            onClick={handleEdit}
            className="btn-edit primary"
            disabled={deleteLoading}
          >
            ✏️ 编辑题目
          </button>
          <button 
            onClick={() => setShowRemoveReview(true)}
            className="btn-remove-review secondary"
          >
            ⏸️ 暂停复习
          </button>
          <button 
            onClick={handleDelete}
            className="btn-delete secondary"
            disabled={deleteLoading}
          >
            🗑️ 删除题目
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionDetailCard;