// public/sw.js - 支持题目数据缓存的版本
const STATIC_CACHE_NAME = 'bagu-mock-static-v1.0.2';
const DATA_CACHE_NAME = 'questions-data-v1'; // 新增：专门的数据缓存

// ========== 安装阶段 ==========
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker 安装');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // 预缓存关键静态文件
      return cache.addAll([
        '/manifest.json',
        '/favicon.ico'
      ]);
    }).then(() => {
      console.log('✅ 静态资源预缓存完成');
      self.skipWaiting();
    }).catch((error) => {
      console.error('❌ 预缓存失败:', error);
      self.skipWaiting();
    })
  );
});

// ========== 激活阶段 ==========
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 激活');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 清理旧版本缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 保留数据缓存，只清理静态缓存
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// ========== 请求处理 ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理同源请求
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // 处理题目数据缓存请求
  if (request.url.includes('/api/cached/')) {
    event.respondWith(handleDataCache(request));
    return;
  }

  // 页面导航请求
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // 静态资源请求
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.url.includes('/static/')) {
    event.respondWith(handleStaticResource(request));
    return;
  }
});

// ========== 新增：处理数据缓存 ==========

/**
 * 处理题目数据缓存
 */
async function handleDataCache(request) {
  try {
    // 对于数据缓存，直接使用缓存策略
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📦 从数据缓存返回:', request.url);
      return cachedResponse;
    }
    
    // 如果没有缓存数据，返回空数据
    return new Response(
      JSON.stringify({ data: [], timestamp: Date.now(), version: '1.0' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ 数据缓存处理失败:', error);
    return new Response(
      JSON.stringify({ error: 'Cache error', data: [] }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ========== 原有处理函数 ==========

/**
 * 处理页面导航
 */
async function handleNavigation(request) {
  try {
    console.log('🌐 尝试网络请求:', request.url);
    const response = await fetch(request);
    
    if (response.status === 200) {
      console.log('✅ 网络请求成功');
      return response;
    }
    
    throw new Error(`Server responded with ${response.status}`);
  } catch (error) {
    console.log('📶 网络不可用，显示离线页面');
    return createOfflinePage();
  }
}

/**
 * 处理静态资源
 */
async function handleStaticResource(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('💾 从缓存返回:', request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('❌ 资源加载失败:', request.url);
    
    if (request.destination === 'image') {
      return createImagePlaceholder();
    }
    
    throw error;
  }
}

/**
 * 创建离线页面
 */
function createOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>离线模式 - 八股精Mock</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                text-align: center;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 2rem;
                border-radius: 16px;
                backdrop-filter: blur(10px);
                max-width: 450px;
                margin: 1rem;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { margin-bottom: 1rem; }
            .features { text-align: left; margin: 1.5rem 0; }
            .feature { margin: 0.5rem 0; }
            button {
                background: white;
                color: #667eea;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                cursor: pointer;
                font-weight: 600;
                margin: 0.5rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">📶</div>
            <h1>离线模式</h1>
            <p>网络连接已断开</p>
            
            <div class="features">
                <div class="feature">✓ 查看之前加载的题目</div>
                <div class="feature">✓ 复习已缓存的内容</div>
                <div class="feature">✓ 在本地记录学习进度</div>
            </div>
            
            <button onclick="window.location.reload()">重新加载</button>
        </div>
        
        <script>
            window.addEventListener('online', () => window.location.reload());
        </script>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

/**
 * 创建图片占位符
 */
function createImagePlaceholder() {
  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#f5f5f5"/>
    <text x="50" y="55" text-anchor="middle" fill="#999" font-size="12">图片</text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}