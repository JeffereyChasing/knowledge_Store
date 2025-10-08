// public/sw.js - 内联离线页面版本
const CACHE_NAME = 'bagu-mock-inline-v1';

self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker 安装');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 激活');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    console.log('🌐 处理导航请求:', event.request.url);
    
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('📶 显示内联离线页面');
        
        // 直接返回内联的离线页面HTML
        return new Response(
          `<!DOCTYPE html>
          <html lang="zh-CN">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>离线模式 - 八股精Mock</title>
              <style>
                  body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                  }
                  .offline-container {
                      text-align: center;
                      padding: 2rem;
                      background: rgba(255, 255, 255, 0.1);
                      border-radius: 16px;
                      backdrop-filter: blur(10px);
                      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                      max-width: 400px;
                      width: 90%;
                  }
                  .icon {
                      font-size: 4rem;
                      margin-bottom: 1rem;
                  }
                  h1 {
                      margin-bottom: 1rem;
                      font-size: 1.8rem;
                  }
                  p {
                      margin-bottom: 1.5rem;
                      line-height: 1.6;
                      opacity: 0.9;
                  }
                  button {
                      background: white;
                      color: #667eea;
                      border: none;
                      padding: 12px 24px;
                      border-radius: 25px;
                      cursor: pointer;
                      font-size: 1rem;
                      font-weight: 600;
                  }
              </style>
          </head>
          <body>
              <div class="offline-container">
                  <div class="icon">📶</div>
                  <h1>离线模式</h1>
                  <p>网络连接已断开，但您仍然可以：</p>
                  <ul style="text-align: left; opacity: 0.9;">
                      <li>查看之前缓存的内容</li>
                      <li>复习已加载的题目</li>
                  </ul>
                  <p>网络恢复后将自动同步数据</p>
                  <button onclick="window.location.reload()">重新加载</button>
              </div>
              
              <script>
                  window.addEventListener('online', function() {
                      window.location.reload();
                  });
              </script>
          </body>
          </html>`,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            }
          }
        );
      })
    );
  }
});