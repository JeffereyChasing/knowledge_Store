// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import InitPage from './components/InitPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import TestPage from './pages/TestPage';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import UserSettingsModal from './components/UserSettingsModal';
import ReviewPage from './pages/ReviewPage';
import './App.css';

// 在组件外部创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 缓存时间10分钟
    },
  },
});

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);

  // 监听自定义事件 - 添加错误处理
  useEffect(() => {
    const handleShowAuthModal = (event) => {
      console.log('收到 showAuthModal 事件:', event.detail);
      // 添加空值检查
      const tab = event.detail?.tab || 'login';
      setAuthModalTab(tab);
      setIsAuthModalOpen(true);
    };

    const handleShowUserSettings = () => {
      setIsUserSettingsOpen(true);
    };

    window.addEventListener('showAuthModal', handleShowAuthModal);
    window.addEventListener('showUserSettings', handleShowUserSettings);

    return () => {
      window.removeEventListener('showAuthModal', handleShowAuthModal);
      window.removeEventListener('showUserSettings', handleShowUserSettings);
    };
  }, []);

  const handleShowAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  // 添加认证成功回调
  const handleAuthSuccess = () => {
    console.log('认证成功，刷新页面...');
    window.location.reload();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navigation onShowAuthModal={handleShowAuthModal} />
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/init" element={<InitPage />} />
          <Route path="/category/:categoryId" element={<CategoryDetailPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>

        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authModalTab}
          onAuthSuccess={handleAuthSuccess}  // 添加成功回调
        />

        <UserSettingsModal 
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
        />
      </Router>
    </QueryClientProvider>
  );
}

export default App;