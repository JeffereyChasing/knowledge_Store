// components/community/CommunityStats.jsx
import React, { useState, useEffect } from 'react';
import { CommunityService } from '../../services/communityService';
import AV from 'leancloud-storage';
import './CommunityStats.css';

const CommunityStats = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    totalLikes: 0,
    activeUsers: 0,
    todayPosts: 0,
    trendingTags: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadStats();
    // 每5分钟刷新一次数据
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 获取帖子总数
      const totalPosts = await new AV.Query('Post')
        .equalTo('status', 'published')
        .count()
        .catch(() => 0);

      // 获取评论总数
      const totalComments = await new AV.Query('Comment').count().catch(() => 0);

      // 获取点赞总数（需要从 Like 表统计）
      const totalLikes = await new AV.Query('Like').count().catch(() => 0);

      // 获取今日帖子数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPosts = await new AV.Query('Post')
        .greaterThanOrEqualTo('createdAt', today)
        .count()
        .catch(() => 0);

      // 获取活跃用户数（最近7天有活动的用户）- 修复这里
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // 方法1: 先查询帖子，然后统计不重复的作者
      const recentPosts = await new AV.Query('Post')
        .greaterThanOrEqualTo('createdAt', weekAgo)
        .select(['author'])
        .limit(1000)
        .find()
        .catch(() => []);

      // 使用 Set 来统计不重复的作者
      const uniqueAuthors = new Set();
      recentPosts.forEach(post => {
        const author = post.get('author');
        if (author) {
          uniqueAuthors.add(author.id || author);
        }
      });
      const activeUsers = uniqueAuthors.size;

      // 方法2: 或者使用聚合查询（如果支持的话）
      // const activeUsers = await getActiveUsersCount(weekAgo);

      // 获取热门标签
      const postQuery = new AV.Query('Post');
      const posts = await postQuery
        .equalTo('status', 'published')
        .limit(1000)
        .find()
        .catch(() => []);

      const tagCount = {};
      posts.forEach(post => {
        const tags = post.get('tags') || [];
        tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });

      const trendingTags = Object.entries(tagCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      setStats({
        totalPosts,
        totalComments,
        totalLikes,
        activeUsers,
        todayPosts,
        trendingTags
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('加载统计信息失败:', error);
      // 使用默认数据
      setStats({
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        activeUsers: 0,
        todayPosts: 0,
        trendingTags: []
      });
    } finally {
      setLoading(false);
    }
  };

  // 备选方法：使用用户表的最后活跃时间
  const getActiveUsersCount = async (sinceDate) => {
    try {
      const activeUsers = await new AV.Query('_User')
        .greaterThanOrEqualTo('updatedAt', sinceDate)
        .count()
        .catch(() => 0);
      return activeUsers;
    } catch (error) {
      console.error('获取活跃用户数失败:', error);
      return 0;
    }
  };

  // 备选方法：使用专门的用户活动记录
  const getActiveUsersFromActivities = async (sinceDate) => {
    try {
      const activities = await new AV.Query('UserActivity')
        .greaterThanOrEqualTo('lastActiveAt', sinceDate)
        .count()
        .catch(() => 0);
      return activities;
    } catch (error) {
      console.error('从活动记录获取用户数失败:', error);
      return 0;
    }
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + '千';
    }
    return num.toString();
  };

  const getGrowthRate = (current, previous) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="community-stats">
        <div className="stats-header">
          <h4>📊 社区统计</h4>
          <button className="refresh-btn" onClick={loadStats}>
            🔄
          </button>
        </div>
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <span>加载统计中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="community-stats">
      <div className="stats-header">
        <h4 style={{color:'black'}}>📊 社区统计</h4>
        <div className="header-actions">
          {lastUpdated && (
            <span className="update-time">
              更新于 {lastUpdated.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          <button 
            className="refresh-btn"
            onClick={loadStats}
            title="刷新数据"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {/* 帖子统计 */}
        <div className="stat-card primary">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-number">{formatNumber(stats.totalPosts)}</div>
            <div className="stat-label">总帖子</div>
            <div className="stat-subtext">
              +{stats.todayPosts} 今日
            </div>
          </div>
        </div>

        {/* 评论统计 */}
        <div className="stat-card success">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-number">{formatNumber(stats.totalComments)}</div>
            <div className="stat-label">总评论</div>
            <div className="stat-subtext">
              互动活跃
            </div>
          </div>
        </div>

        {/* 点赞统计 */}
        <div className="stat-card warning">
          <div className="stat-icon">👍</div>
          <div className="stat-content">
            <div className="stat-number">{formatNumber(stats.totalLikes)}</div>
            <div className="stat-label">总点赞</div>
            <div className="stat-subtext">
              社区认可
            </div>
          </div>
        </div>

        {/* 活跃用户 */}
        <div className="stat-card info">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{formatNumber(stats.activeUsers)}</div>
            <div className="stat-label">活跃用户</div>
            <div className="stat-subtext">
              最近7天
            </div>
          </div>
        </div>
      </div>

      {/* 热门标签 */}
      {stats.trendingTags.length > 0 && (
        <div className="trending-tags">
          <h5>🔥 热门标签</h5>
          <div className="tags-list">
            {stats.trendingTags.map(({ tag, count }, index) => (
              <div key={tag} className="trending-tag">
                <span className="tag-rank">#{index + 1}</span>
                <span className="tag-name">{tag}</span>
                <span className="tag-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 社区状态指示器 */}
      <div className="community-health">
        <div className="health-indicator">
          <div className="health-label">社区活跃度</div>
          <div className="health-bar">
            <div 
              className="health-fill"
              style={{ 
                width: `${Math.min((stats.todayPosts / 10) * 100, 100)}%`,
                backgroundColor: stats.todayPosts >= 5 ? '#4ecdc4' : 
                               stats.todayPosts >= 2 ? '#ffa726' : '#ff6b6b'
              }}
            ></div>
          </div>
          <div className="health-status">
            {stats.todayPosts >= 5 ? '🔥 非常活跃' :
             stats.todayPosts >= 2 ? '💪 活跃' : '😴 安静'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityStats;