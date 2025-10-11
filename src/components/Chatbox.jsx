// components/Chatbox.jsx
import React, { useState, useRef, useEffect } from 'react';
import DialogflowService from '../services/dialogflowService';
import './Chatbox.css';

const Chatbox = ({ onNavigate, onTriggerCategory, categories, questions, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // 初始欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendWelcomeMessage();
    }
  }, [isOpen]);

  const sendWelcomeMessage = async () => {
    setIsTyping(true);
    
    try {
      // 使用正确的 DialogflowService 方法
      const response = await DialogflowService.sendWelcome(currentUser?.id);
      
      const welcomeMessage = {
        id: Date.now(),
        text: response.text,
        isBot: true,
        timestamp: new Date(),
        quickReplies: response.quickReplies || [
          '查看所有分类',
          '需要复习的题目',
          '学习统计',
          '创建新分类'
        ],
        actions: response.actions || []
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Welcome message error:', error);
      // 回退到本地欢迎消息
      const fallbackMessage = {
        id: 1,
        text: `👋 你好${currentUser ? ` ${currentUser.getUsername()}` : ''}！我是你的学习助手，我可以帮你：\n\n• 导航到不同功能页面\n• 查找分类和题目\n• 管理复习计划\n• 查看学习统计\n\n请问需要什么帮助？`,
        isBot: true,
        timestamp: new Date(),
        quickReplies: [
          '查看所有分类',
          '需要复习的题目',
          '学习统计',
          '创建新分类'
        ],
        actions: [
          {
            type: 'triggerButton',
            target: 'viewCategoriesBtn',
            label: '📚 查看分类',
            buttonId: 'categories-button'
          }
        ]
      };
      setMessages([fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 使用新的代理服务器处理消息
  const processMessage = async (userMessage) => {
    setIsTyping(true);
    
    try {
      // 使用增强版的 detectIntent
      const response = await DialogflowService.detectIntentWithActions(userMessage, currentUser?.id);
      return response;
    } catch (error) {
      console.error('Message processing error:', error);
      return {
        text: '网络错误，请稍后重试。',
        quickReplies: ['查看分类', '搜索题目', '开始复习', '学习统计'],
        actions: [
          {
            type: 'triggerButton',
            target: 'viewCategoriesBtn',
            label: '📚 查看分类',
            buttonId: 'categories-button'
          }
        ],
        parameters: {},
        intent: 'Fallback'
      };
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // 处理消息并获取回复
    const botResponse = await processMessage(inputText);
    
    const botMessage = {
      id: Date.now() + 1,
      text: botResponse.text,
      isBot: true,
      timestamp: new Date(),
      actions: botResponse.actions,
      quickReplies: botResponse.quickReplies
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleQuickReply = (text) => {
    setInputText(text);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // 在 Chatbox.jsx 的 handleActionClick 函数中添加调试

const handleActionClick = (action) => {
  //('🖱️ 动作被点击:', action);
  
  if (action.type === 'navigate' && onNavigate) {
    //(`📍 导航到: ${action.target}`);
    onNavigate(action.target);
    
    const confirmMessage = {
      id: Date.now(),
      text: `✅ 正在为你跳转到 ${action.label}...`,
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
    
  } else if (action.type === 'triggerButton' && onNavigate) {
    //(`🔘 触发按钮: ${action.buttonId}`);
    onNavigate(action.target);
    
    const confirmMessage = {
      id: Date.now(),
      text: `✅ 正在为你打开 ${action.label}...`,
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
    
  } else if (action.type === 'triggerCategory' && onTriggerCategory) {
    //(`📂 触发分类: ${action.categoryName}`);
    onTriggerCategory(action.categoryName, action.buttonId);
    
    const confirmMessage = {
      id: Date.now(),
      text: `✅ 正在为你打开 ${action.categoryName} 分类...`,
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
    
  } else if (action.type === 'function') {
    //(`⚙️ 执行功能: ${action.target}`);
    handleFunctionAction(action);
  } else {
    console.warn('❌ 未知的动作类型或缺少处理器:', action);
  }
};

  const handleFunctionAction = (action) => {
    switch (action.target) {
      case 'searchQuestions':
        // 触发搜索功能
        const searchMessage = {
          id: Date.now(),
          text: '请告诉我你想搜索题目的关键词：',
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, searchMessage]);
        break;
      default:
        //('Function action:', action);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 清除对话历史
  const clearConversation = () => {
    setMessages([]);
    sendWelcomeMessage();
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button 
          className="chatbox-floating-btn"
          onClick={() => setIsOpen(true)}
          title="AI学习助手"
        >
          <span className="chatbot-icon">🤖</span>
          <span className="pulse-dot"></span>
        </button>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="chatbox-container">
          <div className="chatbox-header">
            <div className="chatbox-title">
              <span className="bot-avatar">🤖</span>
              <div className="title-text">
                <h4>AI学习助手</h4>
                <span className="status">AI在线</span>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="clear-btn"
                onClick={clearConversation}
                title="清除对话"
              >
                🗑️
              </button>
              <button 
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="chatbox-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
              >
                <div className="message-content">
                  <div className="message-text">
                    {message.text.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  
                  {/* 快速回复按钮 */}
                  {message.quickReplies && (
                    <div className="quick-replies">
                      {message.quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          className="quick-reply-btn"
                          onClick={() => handleQuickReply(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  {message.actions && (
                    <div className="action-buttons">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          className="action-btn"
                          onClick={() => handleActionClick(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span>AI正在思考</span>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbox-input">
            <div className="input-container">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="向AI助手提问..."
                rows="1"
                className="message-input"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="send-btn"
              >
                {isTyping ? '⏳' : '📤'}
              </button>
            </div>
            <div className="input-hint">
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbox;