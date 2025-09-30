// components/DataMigrationPanel.jsx
import React, { useState, useEffect } from 'react';
import { DataMigrationService } from '../services/dataMigrationService';
import { UserService } from '../services/userService';
import './DataMigrationPanel.css';

const DataMigrationPanel = () => {
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 检查当前用户状态和迁移状态
  useEffect(() => {
    checkCurrentUser();
    checkMigrationStatus();
  }, []);

  const checkCurrentUser = () => {
    const user = UserService.getCurrentUser();
    setCurrentUser(user);
  };

  const checkMigrationStatus = async () => {
    try {
      const status = await DataMigrationService.checkMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('检查迁移状态失败:', error);
    }
  };

  const handleMigration = async () => {
    if (!currentUser) {
      alert('请先登录一个账户作为管理员');
      return;
    }

    if (!window.confirm(`确定要将所有现有数据关联到当前用户 "${currentUser.username}" 吗？`)) {
      return;
    }

    setLoading(true);
    setMigrationResult(null);
    
    try {
      const result = await DataMigrationService.performFullMigration();
      setMigrationResult(result);
      
      // 重新检查状态
      await checkMigrationStatus();
    } catch (error) {
      setMigrationResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-migration-panel">
      <h2>🔄 数据迁移工具</h2>
      <p>将现有分类和题目数据关联到当前登录用户</p>

      {/* 当前用户状态 */}
      <div className="user-status-section">
        <h3>当前用户状态</h3>
        {currentUser ? (
          <div className="user-info">
            <p>✅ 已登录: <strong>{currentUser.username}</strong></p>
            <p>邮箱: {currentUser.email}</p>
            <p>用户ID: {currentUser.id}</p>
            <p className="admin-note">此用户将被设置为所有现有数据的管理员</p>
          </div>
        ) : (
          <div className="user-info not-logged-in">
            <p>❌ 未登录</p>
            <p className="login-required">请先登录一个账户作为管理员</p>
          </div>
        )}
      </div>

      {/* 迁移状态 */}
      {migrationStatus && (
        <div className="migration-status">
          <h3>当前数据状态</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">总分类数:</span>
              <span className="value">{migrationStatus.totalCategories}</span>
            </div>
            <div className="status-item">
              <span className="label">总题目数:</span>
              <span className="value">{migrationStatus.totalQuestions}</span>
            </div>
            <div className="status-item warning">
              <span className="label">未关联分类:</span>
              <span className="value">{migrationStatus.orphanCategories}</span>
            </div>
            <div className="status-item warning">
              <span className="label">未关联题目:</span>
              <span className="value">{migrationStatus.orphanQuestions}</span>
            </div>
          </div>
          
          {migrationStatus.migrationNeeded ? (
            <div className="migration-needed">
              ⚠️ 检测到未关联的数据，需要执行迁移
            </div>
          ) : (
            <div className="migration-complete">
              ✅ 所有数据都已关联到用户
            </div>
          )}
        </div>
      )}

      {/* 迁移操作 */}
      <div className="migration-actions">
        <button
          onClick={handleMigration}
          disabled={loading || !currentUser || !migrationStatus?.migrationNeeded}
          className="migrate-btn"
        >
          {loading ? '迁移中...' : '执行数据迁移'}
        </button>
        
        <button
          onClick={checkMigrationStatus}
          disabled={loading}
          className="refresh-btn"
        >
          刷新状态
        </button>
      </div>

      {/* 迁移结果 */}
      {migrationResult && (
        <div className={`migration-result ${migrationResult.success ? 'success' : 'error'}`}>
          <h4>{migrationResult.success ? '✅ 迁移成功' : '❌ 迁移失败'}</h4>
          {migrationResult.success ? (
            <div>
              <p>{migrationResult.message}</p>
              {migrationResult.adminUser && (
                <div className="admin-info">
                  <p><strong>管理员账户:</strong> {migrationResult.adminUser.username}</p>
                  <p><strong>用户ID:</strong> {migrationResult.adminUser.id}</p>
                </div>
              )}
            </div>
          ) : (
            <p>错误: {migrationResult.error}</p>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="migration-instructions">
        <h3>📖 使用说明</h3>
        <ol>
          <li><strong>首先登录一个账户</strong>（可以是新注册的或现有的）</li>
          <li>确认上方显示有未关联的数据</li>
          <li>点击"执行数据迁移"按钮</li>
          <li>迁移完成后，所有现有数据将关联到当前登录用户</li>
          <li>之后可以使用此账户登录系统管理所有数据</li>
        </ol>
        
        <div className="important-notes">
          <h4>⚠️ 重要提示</h4>
          <ul>
            <li>迁移过程不会删除或修改现有数据内容</li>
            <li>只会添加 createdBy 字段和更新权限</li>
            <li>迁移后，只有当前用户可以看到所有现有数据</li>
            <li>新注册的用户只能看到自己创建的数据</li>
            <li><strong>建议使用一个专门的账户作为管理员</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataMigrationPanel;