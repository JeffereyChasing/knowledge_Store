// server.js - 使用 ES6 模块语法
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { SessionsClient } from '@google-cloud/dialogflow';
import { JWT } from 'google-auth-library';

// 加载环境变量
config({ path: '.env.backend' });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// 从环境变量获取认证信息
const projectId = process.env.DIALOGFLOW_PROJECT_ID || 'learningassistant-vjfs';
const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL;
const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('🔍 认证信息检查:');
console.log('项目ID:', projectId);
console.log('客户端邮箱:', clientEmail ? '已设置' : '未设置');
console.log('私钥:', privateKey ? `已设置 (${privateKey.length} 字符)` : '未设置');

// 初始化 Dialogflow 客户端
let sessionClient;
try {
  if (clientEmail && privateKey) {
    // 使用 JWT 认证
    const authClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      projectId: projectId
    });

    sessionClient = new SessionsClient({
      authClient: authClient,
      projectId: projectId
    });
    console.log('✅ 使用 JWT 认证初始化 Dialogflow 客户端');
  } else {
    // 使用默认认证
    sessionClient = new SessionsClient();
    console.log('⚠️ 使用默认认证初始化 Dialogflow 客户端');
  }
  
  // 测试认证
  const actualProjectId = await sessionClient.getProjectId();
  console.log(`✅ Dialogflow 客户端初始化成功，项目ID: ${actualProjectId}`);
  
} catch (error) {
  console.error('❌ Dialogflow 客户端初始化失败:', error.message);
  process.exit(1);
}

// 健康检查端点
app.get('/api/health', async (req, res) => {
  try {
    // 测试 Dialogflow 连接
    const testSessionId = 'health-check-session';
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, testSessionId);
    
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: 'hello',
          languageCode: 'zh-CN',
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    res.json({
      success: true,
      message: 'Dialogflow 代理服务器运行正常',
      authentication: 'JWT 认证',
      projectId: projectId,
      intent: result.intent.displayName,
      confidence: result.intentDetectionConfidence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dialogflow 连接测试失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 处理欢迎消息
app.post('/api/dialogflow/welcome', async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log('📨 收到欢迎消息请求, 用户:', userId);

    const sessionId = userId ? `user_${userId}` : 'default-session';
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: 'WELCOME',
          languageCode: 'zh-CN',
        },
      },
    };

    console.log('🔄 发送欢迎事件到 Dialogflow...');
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    console.log('✅ 欢迎消息响应成功:', {
      intent: result.intent.displayName,
      text: result.fulfillmentText.substring(0, 100) + '...'
    });

    res.json({
      success: true,
      text: result.fulfillmentText,
      intent: result.intent.displayName,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 欢迎消息错误:', error.message);
    res.status(500).json({
      success: false,
      error: '欢迎消息服务暂时不可用',
      message: '👋 你好！我是你的学习助手，我可以帮你管理分类、搜索题目、查看学习统计。有什么可以帮你的？',
      timestamp: new Date().toISOString()
    });
  }
});

// 处理聊天消息
app.post('/api/dialogflow/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    console.log('📨 收到聊天消息:', {
      message: message.substring(0, 100),
      userId: userId
    });

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
    }

    const sessionId = userId ? `user_${userId}` : 'default-session';
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'zh-CN',
        },
      },
    };

    console.log('🔄 调用 Dialogflow 检测意图...');
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    console.log('✅ 聊天消息响应成功:', {
      intent: result.intent.displayName,
      confidence: result.intentDetectionConfidence
    });

    res.json({
      success: true,
      text: result.fulfillmentText,
      intent: result.intent.displayName,
      confidence: result.intentDetectionConfidence,
      parameters: result.parameters,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 聊天消息处理错误:', error.message);
    res.status(500).json({
      success: false,
      error: 'AI 服务暂时不可用',
      message: '抱歉，AI助手暂时无法响应，请稍后再试。',
      timestamp: new Date().toISOString()
    });
  }
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('💥 服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '内部服务器错误',
    timestamp: new Date().toISOString()
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 Dialogflow 代理服务器启动成功!');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
});