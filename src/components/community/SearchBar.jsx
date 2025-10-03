// components/community/SearchBar.jsx
import React, { useState, useRef, useEffect } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "搜索帖子标题或内容..." }) => {
  const [keyword, setKeyword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // 热门搜索建议
  const popularSuggestions = [
    'JavaScript',
    'React',
    '算法',
    'LeetCode',
    '前端',
    '面试',
    'TypeScript',
    'Vue'
  ];

  useEffect(() => {
    // 防抖搜索
    const timeoutId = setTimeout(() => {
      onSearch(keyword);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [keyword, onSearch]);

  const handleSearch = (value) => {
    setKeyword(value);
    setShowSuggestions(value.length > 0);
  };

  const handleClear = () => {
    setKeyword('');
    setShowSuggestions(false);
    onSearch('');
    searchInputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion) => {
    setKeyword(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (keyword.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // 延迟隐藏建议列表，以便点击建议项
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSearch(keyword);
    }
  };

  return (
    <div className="search-bar">
      <div className={`search-input-container ${isFocused ? 'focused' : ''}`}>
        <div className="search-icon">🔍</div>
        
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={keyword}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="search-input"
        />

        {keyword && (
          <button 
            className="clear-search"
            onClick={handleClear}
            type="button"
          >
            ✕
          </button>
        )}

        {/* 搜索建议下拉框 */}
        {showSuggestions && (
          <div className="search-suggestions">
            <div className="suggestions-header">
              <span className="suggestions-title">搜索建议</span>
              <button 
                className="close-suggestions"
                onClick={() => setShowSuggestions(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="suggestions-list">
              {/* 精确匹配建议 */}
              {keyword.length > 0 && (
                <div 
                  className="suggestion-item exact-match"
                  onClick={() => handleSuggestionClick(keyword)}
                >
                  <span className="suggestion-icon">🔍</span>
                  <span className="suggestion-text">搜索: "{keyword}"</span>
                </div>
              )}

              {/* 热门搜索建议 */}
              <div className="suggestions-section">
                <div className="section-title">热门搜索</div>
                {popularSuggestions
                  .filter(suggestion => 
                    suggestion.toLowerCase().includes(keyword.toLowerCase())
                  )
                  .map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="suggestion-icon">🔥</span>
                      <span className="suggestion-text">{suggestion}</span>
                    </div>
                  ))
                }
              </div>

              {/* 搜索提示 */}
              <div className="search-tips">
                <div className="tips-title">搜索提示</div>
                <div className="tips-list">
                  <div className="tip-item">
                    <span className="tip-icon">💡</span>
                    <span>支持搜索帖子标题、内容和标签</span>
                  </div>
                  <div className="tip-item">
                    <span className="tip-icon">⏎</span>
                    <span>按 Enter 键快速搜索</span>
                  </div>
                  <div className="tip-item">
                    <span className="tip-icon">⎋</span>
                    <span>按 ESC 键清除搜索</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 搜索统计信息 */}
      {keyword && (
        <div className="search-stats">
          <span className="stats-text">
            正在搜索: <strong>"{keyword}"</strong>
          </span>
          <button 
            className="advanced-search-btn"
            onClick={() => setShowSuggestions(true)}
          >
            高级搜索
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;