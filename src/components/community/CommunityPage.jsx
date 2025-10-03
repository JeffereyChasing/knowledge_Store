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
  const [allPosts, setAllPosts] = useState([]); // 保存所有帖子用于搜索过滤
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    hasMore: true
  });

  useEffect(() => {
    loadPosts(true);
  }, [activeTab]);

  // 根据搜索关键词过滤帖子
  useEffect(() => {
    if (searchKeyword.trim() === '') {
      // 如果没有搜索关键词，显示所有帖子
      setPosts(allPosts);
    } else {
      // 只显示标题包含搜索关键词的帖子
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
        
        // 应用当前搜索过滤
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

  const handlePostCreated = (newPost) => {
    // 添加到所有帖子列表
    setAllPosts(prev => [newPost, ...prev]);
    
    // 根据当前搜索条件决定是否显示新帖子
    if (searchKeyword.trim() === '' || 
        newPost.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())) {
      setPosts(prev => [newPost, ...prev]);
    }
    
    setShowCreateModal(false);
  };

  // 获取搜索结果统计
  const getSearchStats = () => {
    if (searchKeyword.trim() === '') {
      return `共 ${allPosts.length} 个帖子`;
    } else {
      const matchCount = allPosts.filter(post => 
        post.get('title')?.toLowerCase().includes(searchKeyword.toLowerCase())
      ).length;
      return `找到 ${posts.length} 个匹配标题的帖子（共 ${matchCount} 个）`;
    }
  };

  return (
    <section className="community-section">
      <div className="container">
        {/* 头部区域 */}
        <div className="community-header">
          <div className="header-content">
            <div className="header-text">
              <h2>学习社区</h2>
              <p>与大家一起交流学习心得，分享刷题经验</p>
            </div>
            <button 
              className="create-post-btn modern-btn primary"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="btn-icon">✏️</span>
              发布帖子
            </button>
          </div>
        </div>

        {/* 搜索和统计区域 */}
        <div className="community-toolbar">
          <div className="toolbar-left">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="搜索帖子标题..."
            />
          </div>
          <div className="toolbar-right">
            <CommunityStats />
          </div>
        </div>

        {/* 搜索统计信息 */}
        {searchKeyword && (
          <div className="search-results-info">
            <div className="results-stats">
              {getSearchStats()}
              {searchKeyword && (
                <span className="search-keyword">
                  搜索关键词: <strong>"{searchKeyword}"</strong>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="community-layout">
          {/* 侧边栏 */}
          <aside className="community-sidebar">
            <div className="sidebar-section">
              <h3>热门标签</h3>
              <TagCloud 
                onTagClick={(tag) => handleSearch(tag)}
              />
            </div>
            
            <div className="sidebar-section">
              <h3>社区指南</h3>
              <div className="community-guidelines">
                <p>💡 分享学习心得</p>
                <p>🤝 互相帮助解答</p>
                <p>🎯 保持内容相关</p>
                <p>👍 尊重他人观点</p>
              </div>
            </div>
          </aside>

          {/* 主内容区 */}
          <main className="community-main">
            {/* 标签导航 */}
            <div className="community-tabs">
              <button 
                className={`modern-tab ${activeTab === 'latest' ? 'active' : ''}`}
                onClick={() => setActiveTab('latest')}
              >
                <span className="tab-icon">🆕</span>
                <span className="tab-text">最新帖子</span>
              </button>
              <button 
                className={`modern-tab ${activeTab === 'popular' ? 'active' : ''}`}
                onClick={() => setActiveTab('popular')}
              >
                <span className="tab-icon">🔥</span>
                <span className="tab-text">热门内容</span>
              </button>
            </div>
            
            {/* 帖子列表 */}
            <div className="post-list">
              {loading && (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>加载中...</span>
                </div>
              )}
              
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
              
              {!loading && posts.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    {searchKeyword ? '🔍' : '💬'}
                  </div>
                  <h3>
                    {searchKeyword ? '没有找到匹配的帖子' : '暂无帖子'}
                  </h3>
                  <p>
                    {searchKeyword 
                      ? `没有标题包含 "${searchKeyword}" 的帖子，尝试调整搜索关键词`
                      : '成为第一个分享学习心得的人吧！'
                    }
                  </p>
                  {searchKeyword && (
                    <button 
                      onClick={() => handleSearch('')}
                      className="clear-search-btn"
                    >
                      显示所有帖子
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {pagination.hasMore && posts.length > 0 && searchKeyword === '' && (
              <div className="load-more-section">
                <button 
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="load-more-btn"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
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
    </section>
  );
};

export default CommunityPage;