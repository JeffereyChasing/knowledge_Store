import 'core-js/stable';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 先检查 sw.js 文件是否存在
      const response = await fetch('/sw.js');
      if (!response.ok) {
        throw new Error(`sw.js not found: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('javascript')) {
        throw new Error(`Invalid MIME type: ${contentType}`);
      }
      
      // 文件存在且类型正确，进行注册
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered successfully: ', registration);
    } catch (error) {
      console.log('SW registration failed: ', error);
      console.log('Error details:', error.message);
    }
  });
}