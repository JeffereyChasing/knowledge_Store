// services/userService.js
import AV from 'leancloud-storage';

// 错误码映射 - 使用更友好的提示
const ErrorCodes = {
  // LeanCloud 错误码
  127: '服务器内部错误，请稍后重试',
  202: '用户名已被占用，请尝试其他用户名',
  203: '邮箱已被注册，请使用其他邮箱或尝试登录',
  210: '用户名或密码错误，请检查后重试',
  211: '用户不存在，请检查用户名或注册新账号',
  217: '用户名格式不正确，请使用字母、数字、下划线或中文字符',
  218: '密码格式不正确，密码至少需要6个字符',
  219: '登录失败次数过多，请15分钟后再试',
  125: '邮箱地址格式不正确，请检查后重试',
  1: '服务器内部错误，请稍后重试',
  600: '请求参数错误，请刷新页面后重试',
  
  // 自定义错误信息
  NETWORK_ERROR: '网络连接失败，请检查网络设置后重试',
  TIMEOUT_ERROR: '请求超时，请检查网络连接后重试',
  UNKNOWN_ERROR: '发生未知错误，请稍后重试'
};

class UserServiceError extends Error {
  constructor(code, message, originalError = null) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

export const UserService = {
  /**
   * 处理 LeanCloud 错误
   */
  _handleError: (error) => {
    console.error('UserService Error:', error);
    
    // 网络错误
    if (error.message?.includes('Network request failed') || error.message?.includes('Network Error')) {
      throw new UserServiceError(
        'NETWORK_ERROR', 
        ErrorCodes.NETWORK_ERROR,
        error
      );
    }
    
    // 超时错误
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      throw new UserServiceError(
        'TIMEOUT_ERROR',
        ErrorCodes.TIMEOUT_ERROR,
        error
      );
    }
    
    // LeanCloud 错误码 - 从错误对象中提取
    let leanCloudCode = error.code;
    
    // 如果 code 不存在，尝试从其他属性获取
    if (!leanCloudCode && error.rawCode) {
      leanCloudCode = error.rawCode;
    }
    
    // 如果还是没有，尝试从错误消息中解析
    if (!leanCloudCode && error.message) {
      const codeMatch = error.message.match(/\[(\d+)\]/);
      if (codeMatch) {
        leanCloudCode = parseInt(codeMatch[1]);
      }
    }
    
    //('Detected LeanCloud error code:', leanCloudCode);
    
    // 根据错误码提供用户友好的消息
    let userMessage;
    if (leanCloudCode && ErrorCodes[leanCloudCode]) {
      userMessage = ErrorCodes[leanCloudCode];
    } else {
      // 对于未知错误，尝试从错误消息中提取有用信息
      if (error.message?.includes('Could not find user')) {
        userMessage = '用户不存在，请检查用户名或注册新账号';
      } else if (error.message?.includes('The username and password mismatch')) {
        userMessage = '用户名或密码错误，请检查后重试';
      } else if (error.message?.includes('Invalid username')) {
        userMessage = '用户名格式不正确，请使用字母、数字、下划线或中文字符';
      } else if (error.message?.includes('Invalid email address')) {
        userMessage = '邮箱地址格式不正确，请检查后重试';
      } else {
        userMessage = ErrorCodes.UNKNOWN_ERROR;
      }
    }
    
    throw new UserServiceError(
      leanCloudCode || 'UNKNOWN_ERROR',
      userMessage,
      error
    );
  },

  /**
   * 验证用户名格式
   */
  _validateUsername: (username) => {
    if (!username || username.trim().length === 0) {
      throw new UserServiceError('EMPTY_USERNAME', '请输入用户名');
    }
    
    if (username.length < 3) {
      throw new UserServiceError('USERNAME_TOO_SHORT', '用户名至少需要3个字符');
    }
    
    if (username.length > 20) {
      throw new UserServiceError('USERNAME_TOO_LONG', '用户名不能超过20个字符');
    }
    
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
    if (!usernameRegex.test(username)) {
      throw new UserServiceError('INVALID_USERNAME', '用户名只能包含字母、数字、下划线和中文字符');
    }
  },

  /**
   * 验证密码格式
   */
  _validatePassword: (password) => {
    if (!password || password.length === 0) {
      throw new UserServiceError('EMPTY_PASSWORD', '请输入密码');
    }
    
    if (password.length < 6) {
      throw new UserServiceError('PASSWORD_TOO_SHORT', '密码至少需要6个字符');
    }
    
    if (password.length > 32) {
      throw new UserServiceError('PASSWORD_TOO_LONG', '密码不能超过32个字符');
    }
  },

  /**
   * 验证邮箱格式
   */
  _validateEmail: (email) => {
    if (!email || email.trim().length === 0) {
      throw new UserServiceError('EMPTY_EMAIL', '请输入邮箱地址');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new UserServiceError('INVALID_EMAIL', '请输入有效的邮箱地址');
    }
  },

  /**
   * 用户注册
   */
  register: async (username, password, email) => {
    try {
      // 前置验证
      UserService._validateUsername(username);
      UserService._validatePassword(password);
      UserService._validateEmail(email);

      const user = new AV.User();
      user.setUsername(username.trim());
      user.setPassword(password);
      user.setEmail(email.trim().toLowerCase());
      
      const result = await user.signUp();
      //('注册成功:', result);
      
      return {
        success: true,
        data: result,
        message: '注册成功！欢迎加入我们！'
      };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      return UserService._handleError(error);
    }
  },

  /**
   * 用户登录
   */
  login: async (username, password) => {
    try {
      // 前置验证
      if (!username || username.trim().length === 0) {
        throw new UserServiceError('EMPTY_USERNAME', '请输入用户名');
      }
      
      if (!password || password.length === 0) {
        throw new UserServiceError('EMPTY_PASSWORD', '请输入密码');
      }

      const result = await AV.User.logIn(username.trim(), password);
      //('登录成功:', result);
      
      return {
        success: true,
        data: result,
        message: '登录成功！欢迎回来！'
      };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      return UserService._handleError(error);
    }
  },

  /**
   * 用户退出
   */
  logout: async () => {
    try {
      await AV.User.logOut();
      //('退出成功');
      
      return {
        success: true,
        message: '退出成功'
      };
    } catch (error) {
      return UserService._handleError(error);
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
        throw new UserServiceError('NOT_LOGGED_IN', '请先登录后再操作');
      }

      // 验证更新字段
      const allowedFields = ['nickname', 'avatar', 'bio', 'website'];
      const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));
      
      if (invalidFields.length > 0) {
        throw new UserServiceError('INVALID_FIELDS', `不允许更新的字段: ${invalidFields.join(', ')}`);
      }

      Object.keys(updates).forEach(key => {
        currentUser.set(key, updates[key]);
      });

      await currentUser.save();
      
      return {
        success: true,
        data: currentUser,
        message: '个人信息更新成功'
      };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      return UserService._handleError(error);
    }
  },

  /**
   * 重置密码
   */
  resetPassword: async (email) => {
    try {
      UserService._validateEmail(email);
      
      await AV.User.requestPasswordReset(email.trim().toLowerCase());
      
      return {
        success: true,
        message: '密码重置邮件已发送，请查收您的邮箱'
      };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      return UserService._handleError(error);
    }
  },

  /**
   * 检查用户名是否可用
   */
  checkUsernameAvailability: async (username) => {
    try {
      UserService._validateUsername(username);
      
      const query = new AV.Query(AV.User);
      query.equalTo('username', username.trim());
      const existingUser = await query.first();
      
      return {
        available: !existingUser,
        message: existingUser ? '用户名已被占用' : '用户名可用'
      };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      return UserService._handleError(error);
    }
  }
};

// 导出错误类以便在其他地方使用
export { UserServiceError };