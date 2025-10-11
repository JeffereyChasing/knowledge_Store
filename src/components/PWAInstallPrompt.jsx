// src/components/PWAInstallPrompt.jsx
import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // 阻止默认的安装提示
      e.preventDefault();
      // 保存事件以便后续使用
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // 显示安装提示
    deferredPrompt.prompt();
    
    // 等待用户选择
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      //('用户接受了安装');
    } else {
      //('用户拒绝了安装');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <h4>安装应用</h4>
      <p>将此应用安装到您的设备上以获得更好的体验</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button 
          onClick={handleInstallClick}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          安装
        </button>
        <button 
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: '1px solid #ccc',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          稍后
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;