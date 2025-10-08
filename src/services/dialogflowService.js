// src/services/dialogflowService.js
const PROXY_BASE_URL = 'http://localhost:3001';

class DialogflowService {
  constructor() {
    this.baseUrl = PROXY_BASE_URL;
    this.sessions = new Map();
  }

  // 检查服务器状态
  async checkServerStatus() {
    try {
      console.log('🔍 检查代理服务器状态...');
      const response = await fetch(`${this.baseUrl}/api/health`);
      const data = await response.json();
      console.log('📊 服务器状态:', data);
      return response.ok;
    } catch (error) {
      console.error('❌ 代理服务器未响应:', error.message);
      return false;
    }
  }

  // 发送欢迎消息
  async sendWelcome(userId) {
    console.log('🔄 开始发送欢迎消息...');
    console.log('用户ID:', userId);
    console.log('目标URL:', `${this.baseUrl}/api/dialogflow/welcome`);

    // 先检查服务器状态
    const isServerRunning = await this.checkServerStatus();
    if (!isServerRunning) {
      console.error('❌ 代理服务器未运行');
      return this.getFallbackWelcome();
    }

    try {
      console.log('📤 发送欢迎消息请求...');
      
      const requestBody = {
        userId: userId
      };
      console.log('请求体:', requestBody);

      const response = await fetch(`${this.baseUrl}/api/dialogflow/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 收到响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP 错误:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 欢迎消息响应数据:', data);
      
      if (!data.success) {
        console.warn('⚠️ 欢迎消息返回失败:', data.error);
        return this.getFallbackWelcome();
      }

      console.log('🎉 欢迎消息成功');
      return {
        text: data.text,
        intent: data.intent,
        success: true
      };

    } catch (error) {
      console.error('💥 欢迎消息请求失败:', error.message);
      console.error('错误堆栈:', error.stack);
      return this.getFallbackWelcome();
    }
  }

  // 检测意图
  async detectIntent(message, userId) {
    console.log('🔄 开始检测意图...');
    console.log('消息:', message);
    console.log('用户ID:', userId);

    // 先检查服务器状态
    const isServerRunning = await this.checkServerStatus();
    if (!isServerRunning) {
      console.error('❌ 代理服务器未运行');
      return this.getFallbackResponse(message);
    }

    try {
      console.log('📤 发送聊天消息请求...');
      
      const requestBody = {
        message: message,
        userId: userId
      };
      console.log('请求体:', requestBody);

      const response = await fetch(`${this.baseUrl}/api/dialogflow/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 收到响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP 错误:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 聊天消息响应数据:', data);
      
      if (!data.success) {
        console.warn('⚠️ 聊天消息返回失败:', data.error);
        return this.getFallbackResponse(message);
      }

      console.log('🎉 聊天消息成功');
      return {
        text: data.text,
        intent: data.intent,
        confidence: data.confidence,
        parameters: data.parameters,
        success: true
      };

    } catch (error) {
      console.error('💥 聊天消息请求失败:', error.message);
      return this.getFallbackResponse(message);
    }
  }

  // 回退欢迎消息
  getFallbackWelcome() {
    console.log('🔄 使用回退欢迎消息');
    return {
      text: '👋 你好！我是你的学习助手，我可以帮你：\n\n📚 管理学习分类和题目\n🔍 搜索特定内容\n🔄 安排复习计划\n📊 查看学习统计\n\n请问需要什么帮助？',
      intent: 'welcome_fallback',
      success: true
    };
  }

  // 回退响应
  getFallbackResponse(message) {
    console.log('🔄 使用回退响应');
    const msg = message.toLowerCase();
    
    if (msg.includes('分类') || msg.includes('类别')) {
      return {
        text: '📚 正在加载学习分类...',
        intent: 'categories_fallback',
        success: true
      };
    } else if (msg.includes('搜索') || msg.includes('查找') || msg.includes('找题')) {
      return {
        text: '🔍 请告诉我你想搜索什么题目？',
        intent: 'search_fallback',
        success: true
      };
    } else if (msg.includes('复习')) {
      return {
        text: '🔄 开始复习！我会安排合适的学习计划。',
        intent: 'review_fallback',
        success: true
      };
    } else if (msg.includes('统计') || msg.includes('数据')) {
      return {
        text: '📊 正在生成学习统计报告...',
        intent: 'stats_fallback',
        success: true
      };
    } else if (msg.includes('你好') || msg.includes('hello') || msg.includes('hi')) {
      return {
        text: '👋 你好！我是学习助手，可以帮你管理分类、搜索题目、安排复习。',
        intent: 'greeting_fallback',
        success: true
      };
    } else {
      return {
        text: '🤔 我不太明白。你可以问我关于分类、题目、复习或统计的问题。',
        intent: 'general_fallback',
        success: true
      };
    }
  }
}

export default new DialogflowService();