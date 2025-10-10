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
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineQuestionsPage from './pages/OfflineQuestionsPage';
import ToastNotification from './components/ToastNotification';
import { useToast } from './hooks/useToast';
import './App.css';

console.log('Dialogflow Config:', {
  projectId: process.env.REACT_APP_DIALOGFLOW_PROJECT_ID,
  clientEmail: process.env.REACT_APP_DIALOGFLOW_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.REACT_APP_DIALOGFLOW_PRIVATE_KEY
});

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

// Toast 容器组件
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userSettingsTab, setUserSettingsTab] = useState('profile');

  // 监听自定义事件
  useEffect(() => {
    const handleShowAuthModal = (event) => {
      const tab = event.detail?.tab || 'login';
      setAuthModalTab(tab);
      setIsAuthModalOpen(true);
    };

    const handleShowUserSettings = (event) => {
      const tab = event.detail?.tab || 'profile';
      setUserSettingsTab(tab);
      setIsUserSettingsOpen(true);
    };

    // 全局错误处理事件
    const handleGlobalError = (event) => {
      const { message, type = 'error', duration } = event.detail || {};
      if (message) {
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message, type, duration }
        }));
      }
    };

    window.addEventListener('showAuthModal', handleShowAuthModal);
    window.addEventListener('showUserSettings', handleShowUserSettings);
    window.addEventListener('showGlobalError', handleGlobalError);

    return () => {
      window.removeEventListener('showAuthModal', handleShowAuthModal);
      window.removeEventListener('showUserSettings', handleShowUserSettings);
      window.removeEventListener('showGlobalError', handleGlobalError);
    };
  }, []);

  const handleShowAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  // 添加认证成功回调
  const handleAuthSuccess = () => {
    // 显示成功消息
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: { 
        message: '登录成功！', 
        type: 'success',
        duration: 3000
      }
    }));
    
    // 刷新页面以更新用户状态
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
          <Route path="/offline/questions" element={<OfflineQuestionsPage />} />
          <Route path="/offline/questions/:questionId" element={<OfflineQuestionsPage />} />
          <Route path="/offline/category/:categoryName" element={<OfflineQuestionsPage />} />
          <Route path="/offline/category/:categoryName/question/:questionId" element={<OfflineQuestionsPage />} />
        </Routes>

        {/* 认证模态框 */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authModalTab}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* 用户设置模态框 */}
        <UserSettingsModal 
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          defaultTab={userSettingsTab}
        />

        {/* PWA 安装提示 */}
        <PWAInstallPrompt />

        {/* Toast 通知容器 */}
        <ToastContainer />
      </Router>
    </QueryClientProvider>
  );
}

export default App;