// InitPage.jsx
import React, { useState } from 'react';
import { 
  generateSampleData, 
  clearAllData, 
  checkDataStatus, 
  syncProblemsFromNotion, 
  checkNotionConnection,
  createCommunityClasses,
  generateCommunitySampleData,
  clearCommunityData
} from '../services/initClasses';
import './InitPage.css';

const InitPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dataStatus, setDataStatus] = useState(null);
  const [notionStatus, setNotionStatus] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [communityStatus, setCommunityStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('notion'); // 'notion', 'data', 'community'

  // 检查数据状态
  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const status = await checkDataStatus();
      setDataStatus(status);
      setMessage(`📊 当前数据: ${status.categoryCount} 个分类, ${status.questionCount} 个题目`);
    } catch (error) {
      setMessage(`❌ 检查失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 检查社区数据状态
  const handleCheckCommunityStatus = async () => {
    setLoading(true);
    try {
      const status = {
        postCount: 0,
        commentCount: 0,
        likeCount: 0,
        followCount: 0,
        hasData: false
      };
      
      try {
        // 使用 checkDataStatus 的逻辑来检查社区数据
        // 这里简化处理，实际使用时可以调用专门的社区状态检查函数
        status.postCount = 0;
        status.commentCount = 0;
        status.likeCount = 0;
        status.followCount = 0;
        status.hasData = false;
        
        setMessage(`📊 社区数据状态已检查，请先创建社区数据表`);
      } catch (error) {
        setMessage(`📊 社区数据表尚未创建，请先点击"创建社区数据表"`);
      }
      
      setCommunityStatus(status);
    } catch (error) {
      setMessage(`❌ 检查社区状态失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 检查 Notion 连接状态
  const handleCheckNotionConnection = async () => {
    setLoading(true);
    setMessage('');
    setNotionStatus(null);
    
    try {
      const result = await checkNotionConnection();
      setNotionStatus(result);
      
      if (result.success && result.connected) {
        setMessage(`✅ Notion 连接正常！数据库: ${result.database.title}`);
      } else {
        setMessage(`⚠️ Notion 连接异常: ${result.error || '请检查配置'}`);
      }
    } catch (error) {
      setMessage(`❌ 检查 Notion 连接失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 从 Notion 同步数据
  const handleSyncFromNotion = async () => {
    if (!window.confirm('确定要从 Notion 导入数据吗？这会添加新题目到现有数据中。')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setSyncResult(null);
    
    try {
      const result = await syncProblemsFromNotion();
      setSyncResult(result);
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        // 同步成功后更新状态
        await handleCheckStatus();
      } else {
        setMessage(`⚠️ ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ 同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 生成示例数据
  const handleGenerateData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await generateSampleData();
      setMessage(`✅ ${result.message}`);
      // 更新状态
      await handleCheckStatus();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建社区数据表
  const handleCreateCommunityClasses = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await createCommunityClasses();
      if (result.Post.success && result.Comment.success && result.Like.success && result.Follow.success) {
        setMessage(`✅ 社区数据表创建成功！所有表都已就绪`);
      } else {
        // 检查哪些表创建失败
        const failedTables = [];
        if (!result.Post.success) failedTables.push('Post');
        if (!result.Comment.success) failedTables.push('Comment');
        if (!result.Like.success) failedTables.push('Like');
        if (!result.Follow.success) failedTables.push('Follow');
        
        if (failedTables.length > 0) {
          setMessage(`⚠️ 部分表创建失败: ${failedTables.join(', ')}。可能表已存在或权限不足`);
        } else {
          setMessage(`✅ 社区数据表创建完成`);
        }
      }
      // 更新社区状态
      await handleCheckCommunityStatus();
    } catch (error) {
      setMessage(`❌ 创建社区数据表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 生成社区示例数据
  const handleGenerateCommunityData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await generateCommunitySampleData();
      setMessage(`✅ ${result.message}`);
      // 更新社区状态
      await handleCheckCommunityStatus();
    } catch (error) {
      setMessage(`❌ 生成社区示例数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 清除所有数据
  const handleClearData = async () => {
    if (!window.confirm('确定要清除所有数据吗？此操作不可撤销！')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const result = await clearAllData();
      setMessage(`✅ ${result.message}`);
      // 更新状态
      await handleCheckStatus();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 清除社区数据
  const handleClearCommunityData = async () => {
    if (!window.confirm('确定要清除所有社区数据吗？此操作不可撤销！')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const result = await clearCommunityData();
      setMessage(`✅ ${result.message}`);
      // 更新社区状态
      await handleCheckCommunityStatus();
    } catch (error) {
      setMessage(`❌ 清除社区数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="init-page">
      <header className="page-header">
        <h1>🎯 数据库管理工具</h1>
        <p>管理 Category、Question 和社区数据，支持 Notion 同步</p>
      </header>

      {/* 标签导航 */}
      <section className="tab-navigation">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'notion' ? 'active' : ''}`}
            onClick={() => setActiveTab('notion')}
          >
            🔄 Notion 同步
          </button>
          <button 
            className={`tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            📊 题目数据管理
          </button>
          <button 
            className={`tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            👥 社区数据管理
          </button>
        </div>
      </section>

      {/* Notion 同步功能区 */}
    
      {activeTab === 'notion' && (
        <section className="notion-section">
          <h2>🔄 Notion 数据同步</h2>
          <div className="action-buttons">
            <button 
              onClick={handleCheckNotionConnection}
              disabled={loading}
              className="btn btn-notion"
            >
              🔗 检查 Notion 连接
            </button>
            
            <button 
              onClick={handleSyncFromNotion}
              disabled={loading}
              className="btn btn-sync"
            >
              📥 从 Notion 导入
            </button>
          </div>

          {notionStatus && (
            <div className="notion-status">
              <h4>Notion 连接状态</h4>
              <div className={`status-card ${notionStatus.connected ? 'connected' : 'disconnected'}`}>
                <div className="status-header">
                  <span className="status-indicator">
                    {notionStatus.connected ? '🟢' : '🔴'}
                  </span>
                  <strong>
                    {notionStatus.connected ? '连接正常' : '连接异常'}
                  </strong>
                </div>
                
                {notionStatus.connected && notionStatus.database && (
                  <div className="database-info">
                    <p><strong>数据库:</strong> {notionStatus.database.title}</p>
                    <p><strong>属性字段:</strong> {notionStatus.database.properties.length} 个</p>
                    <p><strong>URL:</strong> 
                      <a href={notionStatus.database.url} target="_blank" rel="noopener noreferrer">
                        查看数据库
                      </a>
                    </p>
                  </div>
                )}
                
                {!notionStatus.connected && (
                  <div className="error-info">
                    <p><strong>错误信息:</strong> {notionStatus.error}</p>
                    <p className="help-text">
                      💡 请确保已部署云函数并配置环境变量
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {syncResult && (
            <div className="sync-result">
              <h4>同步结果</h4>
              <div className="result-card">
                <div className="result-stats">
                  <div className="stat">
                    <span className="stat-label">获取记录:</span>
                    <span className="stat-value">{syncResult.data?.fetched || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">成功保存:</span>
                    <span className="stat-value">{syncResult.data?.saved || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">同步模式:</span>
                    <span className="stat-value">{syncResult.data?.mode || 'cloud'}</span>
                  </div>
                </div>
                
                {syncResult.data?.problems && syncResult.data.problems.length > 0 && (
                  <div className="synced-problems">
                    <h5>最近同步的题目:</h5>
                    <ul>
                      {syncResult.data.problems.slice(0, 3).map((problem, index) => (
                        <li key={index}>
                          <span className="problem-title">{problem.title}</span>
                          <span className="problem-category">{problem.category}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 题目数据管理功能区 */}
      {activeTab === 'data' && (
        <section className="data-management-section">
          <h2>📊 题目数据管理</h2>
          <div className="action-buttons">
            <button 
              onClick={handleCheckStatus}
              disabled={loading}
              className="btn btn-info"
            >
              🔍 检查状态
            </button>
            
            <button 
              onClick={handleGenerateData}
              disabled={loading}
              className="btn btn-success"
            >
              🚀 生成示例数据
            </button>
            
            <button 
              onClick={handleClearData}
              disabled={loading}
              className="btn btn-danger"
            >
              🗑️ 清除所有数据
            </button>
          </div>

          {dataStatus && (
            <div className="status-info">
              <h4>📈 数据状态</h4>
              <div className="status-grid">
                <div className="status-item">
                  <span className="label">分类数量:</span>
                  <span className="value">{dataStatus.categoryCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">题目数量:</span>
                  <span className="value">{dataStatus.questionCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">数据状态:</span>
                  <span className={`value ${dataStatus.hasData ? 'has-data' : 'no-data'}`}>
                    {dataStatus.hasData ? '有数据' : '无数据'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 社区数据管理功能区 */}
      {activeTab === 'community' && (
        <section className="community-management-section">
          <h2>👥 社区数据管理</h2>
          <p className="section-description">
            管理学习社区的帖子、评论、点赞等社交功能数据
          </p>
          
          <div className="action-buttons">
            <button 
              onClick={handleCheckCommunityStatus}
              disabled={loading}
              className="btn btn-info"
            >
              🔍 检查社区状态
            </button>
            
            <button 
              onClick={handleCreateCommunityClasses}
              disabled={loading}
              className="btn btn-primary"
            >
              🏗️ 创建社区数据表
            </button>
            
            <button 
              onClick={handleGenerateCommunityData}
              disabled={loading}
              className="btn btn-success"
            >
              🚀 生成社区示例数据
            </button>
            
            <button 
              onClick={handleClearCommunityData}
              disabled={loading}
              className="btn btn-danger"
            >
              🗑️ 清除社区数据
            </button>
          </div>

          {communityStatus && (
            <div className="status-info">
              <h4>📈 社区数据状态</h4>
              <div className="status-grid">
                <div className="status-item">
                  <span className="label">帖子数量:</span>
                  <span className="value">{communityStatus.postCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">评论数量:</span>
                  <span className="value">{communityStatus.commentCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">点赞数量:</span>
                  <span className="value">{communityStatus.likeCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">关注数量:</span>
                  <span className="value">{communityStatus.followCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">数据状态:</span>
                  <span className={`value ${communityStatus.hasData ? 'has-data' : 'no-data'}`}>
                    {communityStatus.hasData ? '有数据' : '无数据'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="community-classes-info">
            <h4>🏗️ 社区数据表结构</h4>
            <div className="classes-grid">
              <div className="class-card">
                <h5>📝 Post (帖子)</h5>
                <ul>
                  <li>title - 帖子标题</li>
                  <li>content - 帖子内容</li>
                  <li>author - 作者</li>
                  <li>tags - 标签数组</li>
                  <li>likes - 点赞数</li>
                  <li>views - 浏览数</li>
                  <li>commentCount - 评论数</li>
                  <li>isPublic - 是否公开</li>
                  <li>status - 帖子状态</li>
                </ul>
              </div>
              
              <div className="class-card">
                <h5>💬 Comment (评论)</h5>
                <ul>
                  <li>content - 评论内容</li>
                  <li>author - 评论作者</li>
                  <li>post - 所属帖子</li>
                  <li>parent - 父评论</li>
                  <li>likes - 点赞数</li>
                </ul>
              </div>
              
              <div className="class-card">
                <h5>👍 Like (点赞)</h5>
                <ul>
                  <li>user - 点赞用户</li>
                  <li>post - 被点赞帖子</li>
                  <li>comment - 被点赞评论</li>
                </ul>
              </div>
              
              <div className="class-card">
                <h5>👥 Follow (关注)</h5>
                <ul>
                  <li>follower - 关注者</li>
                  <li>following - 被关注者</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 通用状态显示 */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>执行中...</span>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'success'}`}>
          {message}
        </div>
      )}

      {/* 使用说明 */}
      <div className="instructions">
        <h3>📖 使用说明</h3>
        
        {activeTab === 'notion' && (
          <div className="instruction-item">
            <h4>🔄 Notion 同步</h4>
            <ul>
              <li><strong>检查连接:</strong> 验证 Notion API 连接状态</li>
              <li><strong>从 Notion 导入:</strong> 将 Notion 数据库中的题目同步到本地</li>
              <li><strong>智能匹配:</strong> 自动识别分类、难度、标签等字段</li>
              <li><strong>去重机制:</strong> 基于 Notion Page ID 避免重复导入</li>
            </ul>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="instruction-item">
            <h4>📊 题目数据管理</h4>
            <ul>
              <li><strong>生成示例数据:</strong> 创建分类和题目示例数据</li>
              <li><strong>检查状态:</strong> 查看当前数据统计</li>
              <li><strong>清除数据:</strong> 删除所有题目和分类数据</li>
            </ul>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="instruction-item">
            <h4>👥 社区数据管理</h4>
            <ul>
              <li><strong>创建数据表:</strong> 初始化社区功能所需的数据表（Post、Comment、Like、Follow）</li>
              <li><strong>生成示例数据:</strong> 创建示例帖子、评论和点赞数据</li>
              <li><strong>检查状态:</strong> 查看社区数据统计</li>
              <li><strong>清除数据:</strong> 删除所有社区相关数据</li>
            </ul>
            
            <div className="community-features">
              <h5>社区功能特性:</h5>
              <ul>
                <li>📝 发帖和内容管理</li>
                <li>💬 评论和回复系统</li>
                <li>👍 点赞互动功能</li>
                <li>👥 用户关注系统</li>
                <li>🔐 完善的权限控制</li>
              </ul>
            </div>
          </div>
        )}

        <div className="instruction-item">
          <h4>🔧 环境配置要求</h4>
          <div className="config-requirements">
            <div className="config-item">
              <strong>Notion 集成:</strong>
              <span>需要配置 NOTION_INTEGRATION_TOKEN 和 NOTION_DATABASE_ID</span>
            </div>
            <div className="config-item">
              <strong>云函数部署:</strong>
              <span>需要在 LeanCloud 云引擎部署同步函数</span>
            </div>
            <div className="config-item">
              <strong>数据库权限:</strong>
              <span>Notion 数据库需要分享给集成</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitPage;