// services/authService.js
import { UserService } from './userService.js';

export const AuthService = {
  /**
   * 显示登录弹窗
   */
  showAuthModal: (defaultTab = 'login') => {
    const modal = document.getElementById('auth-modal');
    const forms = document.querySelectorAll('.auth-form');
    const tabs = document.querySelectorAll('.auth-tab');
    
    // 重置表单
    forms.forEach(form => form.reset());
    
    // 设置激活标签
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === defaultTab);
    });
    
    forms.forEach(form => {
      form.classList.toggle('active', form.id === `${defaultTab}-form`);
    });
    
    modal.style.display = 'block';
  },

  /**
   * 隐藏登录弹窗
   */
  hideAuthModal: () => {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
  },

  /**
   * 初始化认证事件
   */
  initAuthEvents: () => {
    // 标签切换
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        AuthService.showAuthModal(tabName);
      });
    });

    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await AuthService.handleLogin();
    });

    // 注册表单提交
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await AuthService.handleRegister();
    });

    // 点击模态框外部关闭
    document.getElementById('auth-modal').addEventListener('click', (e) => {
      if (e.target.id === 'auth-modal') {
        AuthService.hideAuthModal();
      }
    });
  },

  /**
   * 处理登录
   */
  handleLogin: async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
      await UserService.login(username, password);
      AuthService.hideAuthModal();
      AuthService.updateUIAfterAuth();
      alert('登录成功！');
    } catch (error) {
      alert(`登录失败: ${error.message}`);
    }
  },

  /**
   * 处理注册
   */
  handleRegister: async () => {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    
    try {
      await UserService.register(username, password, email);
      AuthService.hideAuthModal();
      AuthService.updateUIAfterAuth();
      alert('注册成功！');
    } catch (error) {
      alert(`注册失败: ${error.message}`);
    }
  },

  /**
   * 更新认证后的UI
   */
  updateUIAfterAuth: () => {
    const user = UserService.getCurrentUser();
    
    // 更新导航栏显示用户信息
    const authButton = document.getElementById('auth-button');
    if (authButton) {
      if (user) {
        authButton.innerHTML = `
          <div class="user-info">
            <span>${user.getUsername()}</span>
            <button onclick="AuthService.handleLogout()">退出</button>
          </div>
        `;
      } else {
        authButton.innerHTML = '<button onclick="AuthService.showAuthModal()">登录/注册</button>';
      }
    }
    
    // 触发自定义事件，通知其他组件
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { user }
    }));
  },

  /**
   * 处理退出
   */
  handleLogout: async () => {
    try {
      await UserService.logout();
      AuthService.updateUIAfterAuth();
      alert('已退出登录');
    } catch (error) {
      alert(`退出失败: ${error.message}`);
    }
  }
};