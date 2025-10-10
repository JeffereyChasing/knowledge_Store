// public/sw.js - 开发环境禁用版
const IS_DEVELOPMENT = self.location.hostname === 'localhost' || 
                      self.location.hostname === '127.0.0.1' ||
                      self.location.hostname.startsWith('192.168.') ||
                      self.location.hostname.startsWith('10.') ||
                      self.location.port === '3000' ||
                      self.location.port === '3001';

// ========== 开发环境 - 轻量级模式 ==========
if (IS_DEVELOPMENT) {
  console.log('🔧 开发模式 - Service Worker 运行在轻量级模式');
  
  // 安装阶段 - 简化
  self.addEventListener('install', (event) => {
    console.log('🔄 开发模式 - Service Worker 安装');
    // 立即激活，不等待
    self.skipWaiting();
  });

  // 激活阶段 - 简化
  self.addEventListener('activate', (event) => {
    console.log('🚀 开发模式 - Service Worker 激活');
    event.waitUntil(
      (async () => {
        // 不立即声明控制权，避免页面刷新
        // 仅清理可能存在的旧缓存
        const cacheNames = await caches.keys();
        const devCaches = cacheNames.filter(name => 
          name.includes('dev-') || name.includes('localhost')
        );
        await Promise.all(devCaches.map(name => caches.delete(name)));
        console.log('✅ 开发模式 - 清理完成');
      })()
    );
  });

  // 请求拦截 - 开发环境下大部分直接放行
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 只处理同源请求
    if (!url.origin.startsWith(self.location.origin)) {
      return;
    }

    // 开发环境下，只对特定路径进行简单处理
    if (url.pathname.includes('/offline-data')) {
      // 离线数据请求返回空数据
      event.respondWith(
        new Response(JSON.stringify({
          data: null,
          offline: false,
          development: true,
          message: '开发模式 - 离线数据未启用'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      return;
    }

    // 其他所有请求直接通过网络，不缓存
    // 不调用 event.respondWith()，让浏览器正常处理
  });

  // 消息处理 - 简化版
  self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_CACHE_STATUS':
        // 开发环境返回未启用状态
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            status: 'success',
            data: {
              hasCache: false,
              count: 0,
              timestamp: null,
              development: true,
              message: '开发模式 - 缓存未启用'
            }
          });
        }
        break;
        
      default:
        console.log('📨 开发模式 - 收到消息:', data);
    }
  });

  console.log('✅ 开发模式 - Service Worker 初始化完成');
  return; // 停止执行生产环境代码
}

// ========== 生产环境完整代码 ==========
console.log('🚀 生产模式 - Service Worker 启用完整功能');

const STATIC_CACHE_NAME = 'bagu-mock-static-v2.0.0';
const DATA_CACHE_NAME = 'questions-data-v2';
const OFFLINE_PAGE = '/offline.html';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// ========== 安装阶段 ==========
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker 安装中...');
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 创建离线页面
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.add(OFFLINE_PAGE);
      })
    ]).then(() => {
      console.log('✅ Service Worker 安装完成');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Service Worker 安装失败:', error);
    })
  );
});

// ========== 激活阶段 ==========
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 激活');
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE_NAME, DATA_CACHE_NAME].includes(cacheName)) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker 激活完成');
      // 通知所有客户端
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '2.0.0',
            environment: 'production'
          });
        });
      });
    })
  );
});

// ========== 请求拦截 ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // API 请求 - 优先网络，失败时使用缓存
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/questions')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 数据缓存请求
  if (url.pathname.includes('/offline-data')) {
    event.respondWith(handleOfflineDataRequest(request));
    return;
  }

  // 静态资源 - 缓存优先
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image' ||
      url.pathname.includes('/static/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // 页面导航 - 网络优先
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
});

// ========== API 请求处理 ==========
async function handleApiRequest(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  try {
    // 优先尝试网络请求
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 缓存成功的 API 响应
      console.log('✅ API 请求成功，更新缓存:', request.url);
      cache.put(request, networkResponse.clone());
      
      // 如果是题目数据，发送消息给客户端
      if (request.url.includes('/questions') || request.url.includes('/api/')) {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'DATA_UPDATED',
              url: request.url,
              timestamp: Date.now()
            });
          });
        });
      }
      
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
  } catch (error) {
    console.log('📶 网络请求失败，尝试缓存:', request.url);
    
    // 返回缓存数据
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('✅ 从缓存返回 API 数据');
      return cachedResponse;
    }
    
    // 没有缓存数据，返回离线响应
    return new Response(
      JSON.stringify({ 
        error: '网络不可用且无缓存数据',
        offline: true,
        data: [] 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ========== 离线数据请求处理 ==========
async function handleOfflineDataRequest(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  try {
    // 解析请求参数
    const url = new URL(request.url);
    const cacheKey = url.searchParams.get('key') || 'default';
    
    // 从缓存获取数据
    const cachedResponse = await cache.match(`/offline-data?key=${cacheKey}`);
    
    if (cachedResponse) {
      console.log('📦 返回离线缓存数据:', cacheKey);
      return cachedResponse;
    }
    
    // 没有缓存数据
    return new Response(
      JSON.stringify({ 
        data: null,
        error: 'No cached data available',
        timestamp: Date.now()
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ 离线数据请求失败:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Cache error',
        data: null 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ========== 静态资源请求处理 ==========
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 对于图片，返回占位符
    if (request.destination === 'image') {
      return createImagePlaceholder();
    }
    
    throw error;
  }
}

// ========== 页面导航请求处理 ==========
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
  } catch (error) {
    console.log('📶 导航请求失败，显示离线页面');
    
    // 返回缓存的离线页面
    const cachedPage = await caches.match(OFFLINE_PAGE);
    if (cachedPage) {
      return cachedPage;
    }
    
    // 创建简单的离线页面
    return createOfflinePage();
  }
}

// ========== 消息处理 ==========
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'CACHE_QUESTIONS':
      handleCacheQuestions(data.payload);
      break;
      
    case 'GET_CACHE_STATUS':
      handleGetCacheStatus(event);
      break;
      
    case 'CLEAR_CACHE':
      handleClearCache();
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// ========== 处理题目数据缓存 ==========
async function handleCacheQuestions(questions) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const cacheData = {
      questions: questions.slice(0, 30), // 限制30道题目
      timestamp: Date.now(),
      version: '2.0.0',
      count: Math.min(questions.length, 30)
    };
    
    // 缓存到多个键以便不同用途
    const responses = [
      cache.put(
        new Request('/offline-data?key=questions'),
        new Response(JSON.stringify(cacheData))
      ),
      cache.put(
        new Request('/api/cached/questions'),
        new Response(JSON.stringify(cacheData))
      )
    ];
    
    await Promise.all(responses);
    
    console.log('✅ 题目数据缓存成功:', cacheData.count, '道题目');
    
    // 通知客户端
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          count: cacheData.count,
          timestamp: cacheData.timestamp
        });
      });
    });
    
  } catch (error) {
    console.error('❌ 题目数据缓存失败:', error);
  }
}

// ========== 获取缓存状态 ==========
async function handleGetCacheStatus(event) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = await cache.match('/offline-data?key=questions');
    
    if (response) {
      const data = await response.json();
      event.ports[0].postMessage({
        status: 'success',
        data: {
          hasCache: true,
          count: data.count,
          timestamp: data.timestamp,
          version: data.version
        }
      });
    } else {
      event.ports[0].postMessage({
        status: 'success',
        data: {
          hasCache: false,
          count: 0,
          timestamp: null
        }
      });
    }
  } catch (error) {
    event.ports[0].postMessage({
      status: 'error',
      error: error.message
    });
  }
}

// ========== 清理缓存 ==========
async function handleClearCache() {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const keys = await cache.keys();
    
    await Promise.all(keys.map(key => cache.delete(key)));
    
    console.log('✅ 缓存数据清理完成');
    
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_CLEARED'
        });
      });
    });
  } catch (error) {
    console.error('❌ 缓存清理失败:', error);
  }
}

// ========== 工具函数 ==========
function createOfflinePage() {
  const html = `
<!DOCTYPE html>
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
        .cache-info {
            background: rgba(255,255,255,0.2);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📶</div>
        <h1>离线模式</h1>
        <p>网络连接已断开，但您仍然可以：</p>
        
        <div class="features">
            <div class="feature">✓ 查看缓存的题目</div>
            <div class="feature">✓ 复习已学习的内容</div>
            <div class="feature">✓ 在本地记录进度</div>
        </div>
        
        <div class="cache-info" id="cacheInfo">
            正在检查缓存数据...
        </div>
        
        <button onclick="window.location.reload()">重新加载</button>
        <button onclick="checkCache()">检查缓存</button>
    </div>
    
    <script>
        window.addEventListener('online', () => window.location.reload());
        
        async function checkCache() {
            try {
                const response = await fetch('/offline-data?key=questions');
                const data = await response.json();
                
            } catch (error) {
                document.getElementById('cacheInfo').innerHTML = 
                    '❌ 无法访问缓存数据';
            }
        }
        
        // 页面加载时检查缓存
        checkCache();
    </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function createImagePlaceholder() {
  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#f5f5f5"/>
    <text x="50" y="55" text-anchor="middle" fill="#999" font-size="12">图片加载中</text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}