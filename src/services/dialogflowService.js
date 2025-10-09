// services/dialogflowService.js
import { jwtDecode } from 'jwt-decode';

// 环境变量配置
const PROJECT_ID = process.env.REACT_APP_DIALOGFLOW_PROJECT_ID;
const CLIENT_EMAIL = process.env.REACT_APP_DIALOGFLOW_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.REACT_APP_DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n');

/**
 * 生成 JWT Token
 */
const generateJWT = async () => {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // 编码 header 和 payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // 使用 Web Crypto API 进行签名
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(atob(PRIVATE_KEY.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, ''))),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${encodedSignature}`;
};

/**
 * 获取访问令牌
 */
const getAccessToken = async () => {
  try {
    const jwt = await generateJWT();
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    throw error;
  }
};

/**
 * 向 Dialogflow 发送请求
 */
export const detectIntent = async (text, sessionId = 'react-client-session') => {
  if (!text.trim()) {
    throw new Error('Query text cannot be empty');
  }

  try {
    const accessToken = await getAccessToken();
    const sessionPath = `projects/${PROJECT_ID}/agent/sessions/${sessionId}`;

    const request = {
      queryInput: {
        text: {
          text: text,
          languageCode: 'zh-CN',
        },
      },
    };

    const API_URL = `https://dialogflow.googleapis.com/v2/${sessionPath}:detectIntent`;
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Dialogflow API request failed: ${response.status} ${response.statusText}. ${errorDetails}`);
    }

    const data = await response.json();
    
    return {
      text: data.queryResult.fulfillmentText || '抱歉，我没有理解您的意思。',
      actions: extractActions(data.queryResult),
      quickReplies: ['查看分类', '搜索题目', '开始复习', '学习统计']
    };

  } catch (error) {
    console.error('Dialogflow 请求失败:', error);
    throw error;
  }
};

/**
 * 发送欢迎消息
 */
export const sendWelcome = async (userId) => {
  try {
    const response = await detectIntent('你好', `user-${userId || 'anonymous'}`);
    return response;
  } catch (error) {
    console.error('Welcome message failed, using fallback:', error);
    return {
      text: `👋 你好！我是你的学习助手，我可以帮你：\n\n• 导航到不同功能页面\n• 查找分类和题目\n• 管理复习计划\n• 查看学习统计\n\n请问需要什么帮助？`,
      quickReplies: ['查看所有分类', '需要复习的题目', '学习统计', '创建新分类'],
      actions: []
    };
  }
};

/**
 * 从响应中提取动作
 */
const extractActions = (queryResult) => {
  const actions = [];
  
  if (queryResult.intent?.displayName === 'SearchQuestions') {
    actions.push({
      type: 'function',
      target: 'searchQuestions',
      label: '🔍 开始搜索'
    });
  }
  
  actions.push(
    {
      type: 'navigate',
      target: '/categories',
      label: '📚 查看分类'
    },
    {
      type: 'navigate', 
      target: '/review',
      label: '🔄 开始复习'
    }
  );
  
  return actions;
};

/**
 * 字符串转 ArrayBuffer
 */
const str2ab = (str) => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

export default {
  detectIntent,
  sendWelcome
};