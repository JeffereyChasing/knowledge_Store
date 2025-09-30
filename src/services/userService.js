// services/userService.js
import AV from 'leancloud-storage';

export const UserService = {
  /**
   * 用户注册
   */
  register: async (username, password, email) => {
    try {
      const user = new AV.User();
      user.setUsername(username);
      user.setPassword(password);
      user.setEmail(email);
      
      const result = await user.signUp();
      console.log('注册成功:', result);
      return result;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  },

  /**
   * 用户登录
   */
  login: async (username, password) => {
    try {
      const result = await AV.User.logIn(username, password);
      console.log('登录成功:', result);
      return result;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },

  /**
   * 用户退出
   */
  logout: async () => {
    try {
      await AV.User.logOut();
      console.log('退出成功');
    } catch (error) {
      console.error('退出失败:', error);
      throw error;
    }
  },

  /**
   * 获取当前用户
   */
  getCurrentUser: () => {
    return AV.User.current();
  },

  /**
   * 检查登录状态
   */
  isLoggedIn: () => {
    return !!AV.User.current();
  },

  /**
   * 更新用户信息
   */
  updateProfile: async (updates) => {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      Object.keys(updates).forEach(key => {
        currentUser.set(key, updates[key]);
      });

      await currentUser.save();
      return currentUser;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }
};