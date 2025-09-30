// components/UserTestPanel.jsx
import React, { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { createCategory } from '../services/categoryService';
import { createQuestion } from '../services/questionService';
import './UserTestPanel.css';

const UserTestPanel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testData, setTestData] = useState({
    register: { username: '', password: '', email: '', nickname: '' },
    login: { username: '', password: '' },
    category: { name: '', description: '' },
    question: { title: '', detailedAnswer: '', categoryId: '' }
  });

  // 检查当前登录状态
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const user = UserService.getCurrentUser();
    setCurrentUser(user);
    console.log('当前用户:', user);
  };

  // 用户注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const result = await UserService.register(testData.register);
      setMessage(`✅ 注册成功！用户ID: ${result.id}`);
      setCurrentUser(result);
      
      // 清空表单
      setTestData(prev => ({
        ...prev,
        register: { username: '', password: '', email: '', nickname: '' }
      }));
    } catch (error) {
      setMessage(`❌ 注册失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 用户登录
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const result = await UserService.login(testData.login.username, testData.login.password);
      setMessage(`✅ 登录成功！欢迎 ${result.username}`);
      setCurrentUser(result);
      
      // 清空表单
      setTestData(prev => ({
        ...prev,
        login: { username: '', password: '' }
      }));
    } catch (error) {
      setMessage(`❌ 登录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 用户登出
  const handleLogout = async () => {
    setLoading(true);
    try {
      await UserService.logout();
      setMessage('✅ 已退出登录');
      setCurrentUser(null);
    } catch (error) {
      setMessage(`❌ 登出失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建测试分类
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage('❌ 请先登录');
      return;
    }
    
    setLoading(true);
    try {
      const result = await createCategory(testData.category);
      setMessage(`✅ 分类创建成功！ID: ${result.id}`);
      
      // 保存分类ID用于创建题目
      setTestData(prev => ({
        ...prev,
        question: { ...prev.question, categoryId: result.id },
        category: { name: '', description: '' }
      }));
    } catch (error) {
      setMessage(`❌ 创建分类失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建测试题目
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage('❌ 请先登录');
      return;
    }
    
    setLoading(true);
    try {
      const result = await createQuestion({
        ...testData.question,
        categoryId: testData.question.categoryId,
        oralAnswer: '这是口述版本的答案',
        tags: ['测试', '示例'],
        difficulty: 'medium',
        proficiency: 'intermediate'
      });
      setMessage(`✅ 题目创建成功！ID: ${result.id}`);
      
      setTestData(prev => ({
        ...prev,
        question: { title: '', detailedAnswer: '', categoryId: prev.question.categoryId }
      }));
    } catch (error) {
      setMessage(`❌ 创建题目失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateTestData = (section, field, value) => {
    setTestData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  return (
    <div className="user-test-panel">
      <h2>🧪 用户系统测试面板</h2>
      
      {/* 当前用户状态 */}
      <div className="user-status">
        <h3>当前状态</h3>
        {currentUser ? (
          <div className="user-info">
            <p>✅ 已登录</p>
            <p>用户名: {currentUser.username}</p>
            <p>邮箱: {currentUser.email}</p>
            <p>用户ID: {currentUser.id}</p>
            <button onClick={handleLogout} disabled={loading}>
              退出登录
            </button>
          </div>
        ) : (
          <p>❌ 未登录</p>
        )}
      </div>

      {message && (
        <div className={`test-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="test-sections">
        {/* 注册测试 */}
        <div className="test-section">
          <h3>1. 用户注册测试</h3>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="用户名"
              value={testData.register.username}
              onChange={(e) => updateTestData('register', 'username', e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={testData.register.password}
              onChange={(e) => updateTestData('register', 'password', e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="邮箱"
              value={testData.register.email}
              onChange={(e) => updateTestData('register', 'email', e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="昵称 (可选)"
              value={testData.register.nickname}
              onChange={(e) => updateTestData('register', 'nickname', e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        </div>

        {/* 登录测试 */}
        <div className="test-section">
          <h3>2. 用户登录测试</h3>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="用户名"
              value={testData.login.username}
              onChange={(e) => updateTestData('login', 'username', e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={testData.login.password}
              onChange={(e) => updateTestData('login', 'password', e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>

        {/* 创建分类测试 */}
        {currentUser && (
          <div className="test-section">
            <h3>3. 创建测试分类</h3>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                placeholder="分类名称"
                value={testData.category.name}
                onChange={(e) => updateTestData('category', 'name', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="分类描述 (可选)"
                value={testData.category.description}
                onChange={(e) => updateTestData('category', 'description', e.target.value)}
              />
              <button type="submit" disabled={loading}>
                {loading ? '创建中...' : '创建分类'}
              </button>
            </form>
          </div>
        )}

        {/* 创建题目测试 */}
        {currentUser && testData.question.categoryId && (
          <div className="test-section">
            <h3>4. 创建测试题目</h3>
            <p>分类ID: {testData.question.categoryId}</p>
            <form onSubmit={handleCreateQuestion}>
              <input
                type="text"
                placeholder="题目标题"
                value={testData.question.title}
                onChange={(e) => updateTestData('question', 'title', e.target.value)}
                required
              />
              <textarea
                placeholder="详细答案"
                value={testData.question.detailedAnswer}
                onChange={(e) => updateTestData('question', 'detailedAnswer', e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? '创建中...' : '创建题目'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 快速测试按钮 */}
      <div className="quick-test">
        <h3>🚀 快速测试</h3>
        <button 
          onClick={() => {
            setTestData({
              register: {
                username: `testuser_${Date.now()}`,
                password: '123456',
                email: `test_${Date.now()}@example.com`,
                nickname: '测试用户'
              },
              login: { username: '', password: '' },
              category: { name: '测试分类', description: '这是一个测试分类' },
              question: { title: '', detailedAnswer: '', categoryId: '' }
            });
          }}
        >
          填充测试数据
        </button>
      </div>
    </div>
  );
};

export default UserTestPanel;