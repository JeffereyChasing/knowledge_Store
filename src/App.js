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
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineQuestionsPage from './pages/OfflineQuestionsPage';


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
          <Route path="/offline/questions" element={<OfflineQuestionsPage />} />
<Route path="/offline/questions/:questionId" element={<OfflineQuestionsPage />} />
<Route path="/offline/category/:categoryName" element={<OfflineQuestionsPage />} />
<Route path="/offline/category/:categoryName/question/:questionId" element={<OfflineQuestionsPage />} />
        </Routes>

        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authModalTab}
          onAuthSuccess={handleAuthSuccess}
        />

        <UserSettingsModal 
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
        />
                <PWAInstallPrompt />

      </Router>
    </QueryClientProvider>
  );
}

export default App;