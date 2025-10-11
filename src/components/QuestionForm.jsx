// components/QuestionForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createQuestion, updateQuestion, DifficultyOptions, ProficiencyOptions } from '../services/questionService';
import { getAllCategories } from '../services/categoryService';
import AV from 'leancloud-storage';
import './QuestionForm.css';

const QuestionForm = ({ question, onSave, onCancel, defaultCategoryId, onCategoryChange }) => {
  const [formData, setFormData] = useState({
    title: '',
    detailedAnswer: '',
    oralAnswer: '',
    code: '',
    url: '',
    tags: [],
    difficulty: DifficultyOptions.MEDIUM,
    proficiency: ProficiencyOptions.BEGINNER,
    appearanceLevel: 50,
    categoryId: '',
    images: [] // 新增：存储上传的图片信息
  });

  const [categories, setCategories] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeAnswerTab, setActiveAnswerTab] = useState('detailed');
  const [uploadingImages, setUploadingImages] = useState([]); // 新增：上传中的图片
  
  // 添加用户状态
  const currentUser = AV.User.current();
  
  // 创建 ref 用于文件输入
  const fileInputRef = useRef(null);
  const detailedAnswerRef = useRef(null);
  const oralAnswerRef = useRef(null);

  const isEditing = !!question;

  useEffect(() => {
    const user = AV.User.current();
    
    if (user) {
      loadCategories();
      if (question) {
        setFormData({
          title: question.title || '',
          detailedAnswer: question.detailedAnswer || '',
          oralAnswer: question.oralAnswer || '',
          code: question.code || '',
          url: question.url || '',
          tags: question.tags || [],
          difficulty: question.difficulty || DifficultyOptions.MEDIUM,
          proficiency: question.proficiency || ProficiencyOptions.BEGINNER,
          appearanceLevel: question.appearanceLevel || 50,
          categoryId: question.category?.id || '',
          images: question.images || [] // 加载已有的图片
        });
      } else if (defaultCategoryId) {
        setFormData(prev => ({ ...prev, categoryId: defaultCategoryId }));
      }
    }
  }, [question, defaultCategoryId]);

  const loadCategories = async () => {
    if (!currentUser) {
      return
    };
    
    setLoadingCategories(true);
    try {
      const categoriesData = await getAllCategories();
      
      // 确保只显示当前用户的分类
      const userCategories = categoriesData.filter(category => {
        // 检查分类是否属于当前用户
        const createdBy = category.createdBy;
        return createdBy && createdBy.id === currentUser.id;
      });
      
      setCategories(userCategories);
      
  
      
      // 如果没有传入类别ID且没有默认类别ID，默认选择第一个类别
      if (!isEditing && !defaultCategoryId && userCategories.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: userCategories[0].id }));
        //('自动选择第一个分类:', userCategories[0].id);
      }
    } catch (error) {
      console.error('加载类别失败:', error);
      setErrors({ categories: '加载类别失败: ' + error.message });
    } finally {
      setLoadingCategories(false);
    }
  };

  // 新增：处理拖拽事件
  const handleDragOver = (e, answerType) => {
    e.preventDefault();
    e.stopPropagation();
    const textarea = answerType === 'detailed' ? detailedAnswerRef.current : oralAnswerRef.current;
    if (textarea) {
      textarea.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e, answerType) => {
    e.preventDefault();
    e.stopPropagation();
    const textarea = answerType === 'detailed' ? detailedAnswerRef.current : oralAnswerRef.current;
    if (textarea) {
      textarea.classList.remove('drag-over');
    }
  };

  const handleDrop = (e, answerType) => {
    e.preventDefault();
    e.stopPropagation();
    
    const textarea = answerType === 'detailed' ? detailedAnswerRef.current : oralAnswerRef.current;
    if (textarea) {
      textarea.classList.remove('drag-over');
    }

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files, answerType);
  };

  // 新增：处理文件选择
  const handleFileSelect = (e, answerType) => {
    const files = Array.from(e.target.files);
    handleFiles(files, answerType);
    // 重置文件输入
    e.target.value = '';
  };

  // 新增：处理文件上传
  const handleFiles = async (files, answerType) => {
    const imageFiles = files.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/png' || 
      file.type === 'image/jpg'
    );

    if (imageFiles.length === 0) {
      alert('请选择 JPG 或 PNG 格式的图片文件');
      return;
    }

    for (const file of imageFiles) {
      await uploadImage(file, answerType);
    }
  };

  // 新增：上传图片到 LeanCloud
  const uploadImage = async (file, answerType) => {
    const uploadingId = Date.now().toString();
    
    try {
      // 添加到上传中列表
      setUploadingImages(prev => [...prev, uploadingId]);
      
      // 创建 LeanCloud 文件对象
      const avFile = new AV.File(file.name, file);
      
      // 上传文件
      const savedFile = await avFile.save();
      
      // 创建图片信息对象
      const imageInfo = {
        id: uploadingId,
        objectId: savedFile.id,
        url: savedFile.url(),
        name: file.name,
        size: file.size,
        type: file.type,
        answerType: answerType // 标记图片属于哪个答案类型
      };
      
      // 添加到表单数据
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageInfo]
      }));
      
      // 插入图片标记到文本区域
      insertImageMarkdown(imageInfo, answerType);
      
    } catch (error) {
      console.error('图片上传失败:', error);
      alert(`图片上传失败: ${error.message}`);
    } finally {
      // 从上传中列表移除
      setUploadingImages(prev => prev.filter(id => id !== uploadingId));
    }
  };

  // 新增：插入图片 Markdown 到文本区域
  const insertImageMarkdown = (imageInfo, answerType) => {
    const markdown = `![${imageInfo.name}](${imageInfo.url})`;
    const field = answerType === 'detailed' ? 'detailedAnswer' : 'oralAnswer';
    
    setFormData(prev => {
      const currentText = prev[field];
      const newText = currentText ? `${currentText}\n${markdown}` : markdown;
      return { ...prev, [field]: newText };
    });
  };

  // 新增：手动触发文件选择
  const triggerFileInput = (answerType) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-answer-type', answerType);
      fileInputRef.current.click();
    }
  };

  // 新增：删除图片
  const removeImage = (imageId) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  // 新增：获取指定答案类型的图片
  const getImagesByAnswerType = (answerType) => {
    return formData.images.filter(img => img.answerType === answerType);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '问题标题不能为空';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = '问题标题至少需要2个字符';
    }
    
    if (!formData.detailedAnswer.trim() && !formData.oralAnswer.trim()) {
      newErrors.answer = '至少需要填写一个答案版本（详细版本或口述版本）';
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = '请选择类别';
    }
    
    if (formData.tags.length > 10) {
      newErrors.tags = '标签数量不能超过10个';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = '请输入有效的URL链接';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value 
    }));
    
    // 清除该字段的错误信息
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      if (formData.tags.length >= 10) {
        setErrors({ tags: '标签数量不能超过10个' });
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
      
      // 清除标签错误
      if (errors.tags) {
        setErrors(prev => ({
          ...prev,
          tags: ''
        }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        // 检查类别是否发生了变化
        const oldCategory = question.category; // 原来的 category 对象
        const newCategory = categories.find(cat => cat.id === formData.categoryId); // 新的 category 对象
        const categoryChanged = oldCategory?.id !== newCategory?.id;
        
        await updateQuestion(question.id, formData);
        
        // 如果类别发生了变化，调用回调函数通知父组件
        if (categoryChanged && onCategoryChange) {
          onCategoryChange({
            questionId: question.id,
            oldCategoryId: oldCategory?.id,
            newCategoryId: newCategory?.id,
            question: { ...question, ...formData, category: newCategory }
          });
        }
      } else {
        // 创建题目时只需要传递 categoryId，questionService 会处理 Pointer 转换
        await createQuestion(formData);
      }
      onSave();
      window.dispatchEvent(new CustomEvent('questionCreated', {
        detail: { question: result }
      }));
    } catch (error) {
      console.error('保存题目失败:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 新增：渲染答案标签页内容
  const renderAnswerTab = (type, placeholder, hint) => {
    const images = getImagesByAnswerType(type);
    const isUploading = uploadingImages.length > 0;
    const field = type === 'detailed' ? 'detailedAnswer' : 'oralAnswer';
    const textareaRef = type === 'detailed' ? detailedAnswerRef : oralAnswerRef;
    
    return (
      <div className="tab-panel">
        <div 
          className="answer-textarea-container"
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={(e) => handleDragLeave(e, type)}
          onDrop={(e) => handleDrop(e, type)}
        >
          <textarea
            ref={textareaRef}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            rows={type === 'detailed' ? '6' : '4'}
            disabled={loading}
            className={errors.answer && !formData[field].trim() ? 'error' : ''}
          />
          
          {/* 图片上传提示 */}
          <div className="upload-hint">
            <div className="upload-hint-text">
              💡 支持拖拽 JPG/PNG 图片到此区域，或 
              <button 
                type="button" 
                className="upload-trigger-btn"
                onClick={() => triggerFileInput(type)}
                disabled={loading || isUploading}
              >
                点击上传
              </button>
            </div>
          </div>
        </div>

        {/* 已上传图片预览 */}
        {images.length > 0 && (
          <div className="uploaded-images">
            <div className="images-title">已上传图片 ({images.length}):</div>
            <div className="images-grid">
              {images.map((image) => (
                <div key={image.id} className="image-item">
                  <img src={image.url} alt={image.name} />
                  <div className="image-info">
                    <span className="image-name">{image.name}</span>
                    <button 
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(image.id)}
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tab-hint">
          {hint}
        </div>
      </div>
    );
  };

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className="question-form-overlay">
        <div className="question-form-dialog">
          <div className="question-form-header">
            <h3>请先登录</h3>
            <button 
              type="button" 
              className="close-button"
              onClick={onCancel}
            >
              ×
            </button>
          </div>
          <div className="auth-required-container">
            <div className="auth-required-icon">🔐</div>
            <p>登录后即可添加或编辑题目</p>
            <div className="auth-required-actions">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('showAuthModal'))}
                className="login-btn"
              >
                立即登录
              </button>
              <button 
                onClick={onCancel}
                className="btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="question-form-overlay">
      <div className="question-form-dialog">
        <div className="question-form-header">
          <h3>{isEditing ? '编辑题目' : '添加新题目'}</h3>
          <div className="user-info">
            <span className="user-badge">👤 {currentUser.getUsername()}</span>
          </div>
          <button 
            type="button" 
            className="close-button"
            onClick={onCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="question-form">
          {/* 问题标题 */}
          <div className="form-group">
            <label htmlFor="title">问题标题 *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="请输入问题标题"
              disabled={loading}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* 答案版本标签页 */}
          <div className="form-group">
            <label>问题答案 *</label>
            <div className="answer-tabs-container">
              <div className="answer-tab-buttons">
                <button 
                  type="button"
                  className={`answer-tab-button ${activeAnswerTab === 'detailed' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('detailed')}
                >
                  详细版本
                </button>
                <button 
                  type="button"
                  className={`answer-tab-button ${activeAnswerTab === 'oral' ? 'active' : ''}`}
                  onClick={() => setActiveAnswerTab('oral')}
                >
                  口述版本
                </button>
              </div>

              <div className="answer-tab-content">
                {activeAnswerTab === 'detailed' && 
                  renderAnswerTab(
                    'detailed', 
                    '请输入详细的答案解释，包含技术细节、原理分析等', 
                    '适合记录完整的技术解析和详细说明'
                  )
                }

                {activeAnswerTab === 'oral' && 
                  renderAnswerTab(
                    'oral', 
                    '请输入简洁的口述版本答案，适合面试场景表达', 
                    '适合记录简洁的口头表达版本，便于面试时快速回忆'
                  )
                }
              </div>
            </div>
            {errors.answer && <span className="error-message">{errors.answer}</span>}
          </div>

          {/* 代码展示部分 */}
          <div className="form-group">
            <label htmlFor="code">相关代码（可选）</label>
            <textarea
              id="code"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              placeholder="请输入与该题目相关的代码片段，将保持原格式显示"
              rows="8"
              disabled={loading}
              className="code-textarea"
            />
            <div className="field-hint">
              代码将保持原格式显示，适合展示算法实现、组件代码等
            </div>
          </div>

          {/* URL链接 */}
          <div className="form-group">
            <label htmlFor="url">相关链接（可选）</label>
            <input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://example.com"
              disabled={loading}
              className={errors.url ? 'error' : ''}
            />
            {errors.url && <span className="error-message">{errors.url}</span>}
            <div className="field-hint">
              可添加相关的文档、文章或参考链接
            </div>
          </div>

          {/* 标签管理 */}
          <div className="form-group">
            <label htmlFor="tags">标签（可选）</label>
            <div className="tags-input-container">
              <input
                id="tags"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="输入标签后按回车或点击添加"
                disabled={loading}
                maxLength={20}
              />
              <button 
                type="button" 
                onClick={handleAddTag}
                disabled={loading || !newTag.trim()}
                className="add-tag-button"
              >
                添加
              </button>
            </div>
            {errors.tags && <span className="error-message">{errors.tags}</span>}
            
            {/* 标签列表 */}
            {formData.tags.length > 0 && (
              <div className="tags-list">
                <div className="tags-header">
                  <span>已添加标签 ({formData.tags.length}/10):</span>
                </div>
                <div className="tags-container">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        disabled={loading}
                        className="remove-tag-button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 难度和掌握程度 */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="difficulty">难度</label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                disabled={loading}
              >
                <option value={DifficultyOptions.EASY}>简单</option>
                <option value={DifficultyOptions.MEDIUM}>中等</option>
                <option value={DifficultyOptions.HARD}>困难</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="proficiency">掌握程度</label>
              <select
                id="proficiency"
                value={formData.proficiency}
                onChange={(e) => handleInputChange('proficiency', e.target.value)}
                disabled={loading}
              >
                <option value={ProficiencyOptions.BEGINNER}>初级</option>
                <option value={ProficiencyOptions.INTERMEDIATE}>中级</option>
                <option value={ProficiencyOptions.ADVANCED}>高级</option>
                <option value={ProficiencyOptions.MASTER}>精通</option>
              </select>
            </div>
          </div>
            
          {/* 出现频率 */}
          <div className="form-group">
            <label htmlFor="appearanceLevel">
              出现频率: {formData.appearanceLevel}%
              <span className="field-hint">（数值越高，在复习时出现的概率越大）</span>
            </label>
            <input
              id="appearanceLevel"
              type="range"
              min="0"
              max="100"
              value={formData.appearanceLevel}
              onChange={(e) => handleInputChange('appearanceLevel', parseInt(e.target.value))}
              disabled={loading}
              className="appearance-slider"
            />
            <div className="slider-labels">
              <span>低频</span>
              <span>中频</span>
              <span>高频</span>
            </div>
          </div>

          {/* 类别选择 */}
          <div className="form-group">
            <label htmlFor="category">类别 *</label>
            {loadingCategories ? (
              <div className="loading-categories">加载类别中...</div>
            ) : categories.length === 0 ? (
              <div className="no-categories">
                <div className="no-categories-icon">📁</div>
                <p>暂无类别，请先创建类别</p>
                <button 
                  type="button"
                  className="create-category-btn"
                  onClick={() => {
                    onCancel(); // 关闭题目表单
                    // 触发创建分类的事件或跳转到分类管理页面
                    window.dispatchEvent(new CustomEvent('showCategoryManagement'));
                  }}
                >
                  🚀 去创建分类
                </button>
              </div>
            ) : (
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                disabled={loading}
                className={errors.categoryId ? 'error' : ''}
              >
                <option value="">请选择类别</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.questionCount || 0}题)
                  </option>
                ))}
              </select>
            )}
            {errors.categoryId && <span className="error-message">{errors.categoryId}</span>}
          </div>

          {/* 提交错误 */}
          {errors.submit && (
            <div className="submit-error">
              {errors.submit}
            </div>
          )}

          {/* 表单操作 */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  {isEditing ? '更新中...' : '添加中...'}
                </>
              ) : (
                isEditing ? '更新题目' : '添加题目'
              )}
            </button>
          </div>
        </form>

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".jpg,.jpeg,.png"
          multiple
          onChange={(e) => {
            const answerType = e.target.getAttribute('data-answer-type');
            handleFileSelect(e, answerType);
          }}
        />
      </div>
    </div>
  );
};

export default QuestionForm;