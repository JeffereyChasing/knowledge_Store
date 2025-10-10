// components/community/CommunityPage.jsx
import React, { useState, useEffect } from 'react';
import { CommunityService } from '../../services/communityService';
import CreatePostModal from './CreatePostModal';
import SearchBar from './SearchBar';
import TagCloud from './TagCloud';
import CommunityStats from './CommunityStats';
import PostCard from './PostCard';
import './CommunityPage.css';

const CommunityPage = () => {
  const [activeTab, setActiveTab] = useState('latest');
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    hasMore: true
  });
  const [isCreating, setIsCreating] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  useEffect(() => {
    loadPosts(true);
  }, [activeTab]);

  useEffect(() => {
    if (searchKeyword.trim() === '') {
      setPosts(allPosts);
    } else {
      const filtered = allPosts.filter(post => 
        post.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setPosts(filtered);
    }
  }, [searchKeyword, allPosts]);

  const loadPosts = async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentPage = reset ? 1 : pagination.page;
      const options = {
        page: currentPage,
        pageSize: pagination.pageSize,
        sortBy: activeTab === 'latest' ? 'createdAt' : 'likes',
        sortOrder: 'desc'
      };

      const postsData = await CommunityService.getPosts(options);
      
      if (reset) {
        setAllPosts(postsData);
        setPosts(postsData);
      } else {
        const newAllPosts = [...allPosts, ...postsData];
        setAllPosts(newAllPosts);
        
        if (searchKeyword.trim() === '') {
          setPosts(newAllPosts);
        } else {
          const filtered = newAllPosts.filter(post => 
            post.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())
          );
          setPosts(filtered);
        }
      }

      setPagination(prev => ({
        ...prev,
        page: currentPage,
        hasMore: postsData.length === pagination.pageSize
      }));
    } catch (error) {
      console.error('加载帖子失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadPosts(false);
    }
  };

  const handlePostCreated = async (newPost) => {
    setIsCreating(true);
    try {
      setAllPosts(prev => [newPost, ...prev]);
      
      if (searchKeyword.trim() === '' || 
          newPost.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())) {
        setPosts(prev => [newPost, ...prev]);
      }
      
      setShowCreateModal(false);
      
      setTimeout(() => {
        console.log('帖子发布成功！');
      }, 300);
    } finally {
      setIsCreating(false);
    }
  };

  const getSearchStats = () => {
    if (searchKeyword.trim() === '') {
      return `共 ${allPosts.length} 个帖子`;
    } else {
      const matchCount = allPosts.filter(post => 
        post.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())
      ).length;
      return `找到 ${posts.length} 个匹配的帖子`;
    }
  };

  return (
    <section className="community-section">
      <div className="container">
        {/* Hero 区域 */}
        <div className="community-hero">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                <span className="title-gradient">学习社区</span>
              </h1>
              <p className="hero-subtitle">与志同道合的学习者一起进步</p>
              <div className="hero-stats">
                <span className="stat-item">📚 知识分享</span>
                <span className="stat-item">🤝 互助解答</span>
                <span className="stat-item">🚀 共同成长</span>
              </div>
            </div>
            <div className="hero-actions">
              <button 
                className={`create-post-btn primary ${isCreating ? 'loading' : ''}`}
                onClick={() => setShowCreateModal(true)}
                disabled={isCreating}
              >
                <span className="btn-icon">✨</span>
                <span className="btn-text">
                  {isCreating ? '发布中...' : '创作新帖'}
                </span>
              </button>
            </div>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
        </div>

        <div className="community-layout">
          {/* 侧边栏 */}
          <aside className="community-sidebar">
            <div className="sidebar-widget">
              <div className="widget-header">
                <h3>📌 内容筛选</h3>
              </div>
              <div className="tab-navigation">
                <button 
                  className={`tab-btn ${activeTab === 'latest' ? 'active' : ''}`}
                  onClick={() => setActiveTab('latest')}
                >
                  <span className="tab-icon">🆕</span>
                  最新内容
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'popular' ? 'active' : ''}`}
                  onClick={() => setActiveTab('popular')}
                >
                  <span className="tab-icon">🔥</span>
                  热门推荐
                </button>
              </div>
            </div>

            <div className="sidebar-widget">
              <div className="widget-header">
                <h3>🏷️ 热门标签</h3>
              </div>
              <TagCloud onTagClick={handleSearch} />
            </div>
            
            <div className="sidebar-widget">
              <div className="widget-header">
                <h3>📖 社区指南</h3>
              </div>
              <div className="guidelines-list">
                <div className="guideline-item">
                  <span className="guideline-icon">💡</span>
                  <span>分享真实学习心得</span>
                </div>
                <div className="guideline-item">
                  <span className="guideline-icon">🤝</span>
                  <span>友善互助解答问题</span>
                </div>
                <div className="guideline-item">
                  <span className="guideline-icon">🎯</span>
                  <span>保持内容相关优质</span>
                </div>
                <div className="guideline-item">
                  <span className="guideline-icon">👍</span>
                  <span>尊重他人不同观点</span>
                </div>
              </div>
            </div>
          </aside>

          {/* 主内容区 */}
          <main className="community-main">
            {/* 内容头部 - 集成搜索框 */}
            <div className="content-header">
              <div className="header-left">
                <h2 className="section-title">
                  {activeTab === 'latest' ? '最新帖子' : '热门内容'}
                </h2>
                <div className="sort-indicator">
                  <span className="sort-text">
                    {activeTab === 'latest' ? '按发布时间排序' : '按热度排序'}
                  </span>
                </div>
              </div>
              <div className="header-right">
                <div className="integrated-search">
                  <SearchBar 
                    onSearch={handleSearch}
                    placeholder="搜索帖子标题..."
                    compact={true}
                  />
                </div>
              </div>
            </div>
            
            {/* 搜索统计信息 */}
            {searchKeyword && (
              <div className="integrated-search-results">
                <div className="search-info-compact">
                  <span className="results-count">{getSearchStats()}</span>
                  <span className="search-query">
                    关键词: <strong>"{searchKeyword}"</strong>
                    <button 
                      onClick={() => handleSearch('')}
                      className="clear-search"
                      title="清除搜索"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>
            )}
            
            {/* 帖子列表 */}
            <div className="posts-container">
              {loading && posts.length === 0 ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>正在加载内容...</p>
                </div>
              ) : (
                <>
                  <div className="posts-grid">
                    {posts.map((post, index) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        featured={index === 0 && activeTab === 'popular'}
                      />
                    ))}
                  </div>
                  
                  {posts.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-illustration">
                        {searchKeyword ? '🔍' : '💬'}
                      </div>
                      <h3>
                        {searchKeyword ? '没有找到相关内容' : '社区等待你的声音'}
                      </h3>
                      <p>
                        {searchKeyword 
                          ? `尝试调整搜索关键词，或浏览全部内容`
                          : '成为第一个分享学习心得的人，开启讨论吧！'
                        }
                      </p>
                      {searchKeyword && (
                        <button 
                          onClick={() => handleSearch('')}
                          className="browse-all-btn"
                        >
                          浏览所有帖子
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* 加载更多 */}
            {pagination.hasMore && posts.length > 0 && searchKeyword === '' && (
              <div className="load-more-container">
                <button 
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`load-more-btn ${loading ? 'loading' : ''}`}
                >
                  {loading ? (
                    <>
                      <span className="loading-dots"></span>
                      加载中
                    </>
                  ) : (
                    '加载更多内容'
                  )}
                </button>
              </div>
            )}

            {/* 社区统计 - 放在主内容区底部 */}
            <div className="community-stats-section">
              <div className="stats-header">
                <h3>
                  <span className="stats-icon">📊 社区统计</span>
                </h3>
                <button 
                  className={`collapse-btn ${statsCollapsed ? 'collapsed' : ''}`}
                  onClick={() => setStatsCollapsed(!statsCollapsed)}
                  aria-label={statsCollapsed ? '展开统计' : '折叠统计'}
                >
                  <span className="collapse-icon">
                    {statsCollapsed ? '▶' : '▼'}
                  </span>
                </button>
              </div>
              
              {!statsCollapsed && (
                <div className="stats-content">
                  <CommunityStats />
                </div>
              )}
            </div>
          </main>
        </div>
        
        {/* 创建帖子模态框 */}
        {showCreateModal && (
          <CreatePostModal 
            onClose={() => setShowCreateModal(false)}
            onSuccess={handlePostCreated}
          />
        )}
      </div>
      <br></br>
    </section>
  );
};

export default CommunityPage;