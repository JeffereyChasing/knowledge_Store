// InitPage.jsx
import React, { useState } from 'react';
import { 
  generateSampleData, 
  clearAllData, 
  checkDataStatus, 
  syncProblemsFromNotion, 
  checkNotionConnection 
} from '../services/initClasses';
import './InitPage.css';

const InitPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dataStatus, setDataStatus] = useState(null);
  const [notionStatus, setNotionStatus] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

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

  return (
    <div className="init-page">
      <header className="page-header">
        <h1>🎯 数据库管理工具</h1>
        <p>管理 Category 和 Question 数据，支持 Notion 同步</p>
      </header>

      {/* Notion 同步功能区 */}
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

      {/* 数据管理功能区 */}
      <section className="data-management-section">
        <h2>📊 数据管理</h2>
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

      <div className="instructions">
        <h3>📖 使用说明</h3>
        
        <div className="instruction-item">
          <h4>🔄 Notion 同步</h4>
          <ul>
            <li><strong>检查连接:</strong> 验证 Notion API 连接状态</li>
            <li><strong>从 Notion 导入:</strong> 将 Notion 数据库中的题目同步到本地</li>
            <li><strong>智能匹配:</strong> 自动识别分类、难度、标签等字段</li>
            <li><strong>去重机制:</strong> 基于 Notion Page ID 避免重复导入</li>
          </ul>
        </div>

        <div className="instruction-item">
          <h4>🚀 生成示例数据</h4>
          <ul>
            <li>自动创建 8 个分类类别</li>
            <li>自动创建关联的题目数据</li>
            <li>自动建立 Category 和 Question 的关联关系</li>
            <li>自动统计每个分类的题目数量</li>
            <li><strong>注意：会先清除所有现有数据</strong></li>
          </ul>
        </div>

        <div className="instruction-item">
          <h4>🗑️ 清除所有数据</h4>
          <ul>
            <li>删除所有 Question 数据</li>
            <li>删除所有 Category 数据</li>
            <li>此操作不可撤销，请谨慎使用</li>
          </ul>
        </div>

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