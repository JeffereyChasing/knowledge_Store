
// services/dataMigrationService.js
import AV from 'leancloud-storage';
import { UserService } from './userService';

/**
 * 数据迁移服务 - 将现有数据关联到管理员账户
 */
export const DataMigrationService = {
  /**
   * 创建管理员账户（使用当前登录用户作为管理员）
   */
  setupAdminUser: async () => {
    try {
      //('设置当前用户为管理员...');
      
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录一个账户作为管理员');
      }
      
      //('使用当前用户作为管理员:', currentUser.id);
      return {
        id: currentUser.id,
        username: currentUser.getUsername(),
        email: currentUser.getEmail(),
        nickname: currentUser.get('nickname')
      };
    } catch (error) {
      console.error('设置管理员失败:', error);
      throw error;
    }
  },

  /**
   * 迁移现有分类到当前用户
   */
  migrateCategoriesToCurrentUser: async () => {
    try {
      //('开始迁移分类数据...');
      
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      
      const query = new AV.Query('Category');
      
      // 获取所有没有 createdBy 字段的分类
      query.doesNotExist('createdBy');
      const categories = await query.find();
      
      //(`找到 ${categories.length} 个需要迁移的分类`);
      
      let migratedCount = 0;
      for (const category of categories) {
        try {
          category.set('createdBy', currentUser);
          
          // 更新 ACL 权限
          const acl = new AV.ACL();
          acl.setReadAccess(currentUser, true);
          acl.setWriteAccess(currentUser, true);
          acl.setPublicReadAccess(true); // 保持公开可读
          category.setACL(acl);
          
          await category.save();
          migratedCount++;
          //(`✅ 迁移分类: ${category.get('name')}`);
        } catch (error) {
          console.error(`迁移分类失败 ${category.id}:`, error);
        }
      }
      
      //(`分类迁移完成: ${migratedCount}/${categories.length}`);
      return { migrated: migratedCount, total: categories.length };
    } catch (error) {
      console.error('迁移分类数据失败:', error);
      throw error;
    }
  },

  /**
   * 迁移现有题目到当前用户
   */
  migrateQuestionsToCurrentUser: async () => {
    try {
      //('开始迁移题目数据...');
      
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      
      const query = new AV.Query('Question');
      
      // 获取所有没有 createdBy 字段的题目
      query.doesNotExist('createdBy');
      const questions = await query.find();
      
      //(`找到 ${questions.length} 个需要迁移的题目`);
      
      let migratedCount = 0;
      for (const question of questions) {
        try {
          question.set('createdBy', currentUser);
          
          // 更新 ACL 权限
          const acl = new AV.ACL();
          acl.setReadAccess(currentUser, true);
          acl.setWriteAccess(currentUser, true);
          acl.setPublicReadAccess(true); // 保持公开可读
          question.setACL(acl);
          
          await question.save();
          migratedCount++;
          //(`✅ 迁移题目: ${question.get('title')}`);
        } catch (error) {
          console.error(`迁移题目失败 ${question.id}:`, error);
        }
      }
      
      //(`题目迁移完成: ${migratedCount}/${questions.length}`);
      return { migrated: migratedCount, total: questions.length };
    } catch (error) {
      console.error('迁移题目数据失败:', error);
      throw error;
    }
  },

  /**
   * 执行完整的数据迁移（使用当前登录用户）
   */
  performFullMigration: async () => {
    try {
      //('🚀 开始完整数据迁移...');
      
      // 1. 使用当前用户作为管理员
      const adminUser = await DataMigrationService.setupAdminUser();
      
      // 2. 迁移分类数据
      const categoryResult = await DataMigrationService.migrateCategoriesToCurrentUser();
      
      // 3. 迁移题目数据
      const questionResult = await DataMigrationService.migrateQuestionsToCurrentUser();
      
      //('🎉 数据迁移完成！');
      
      return {
        success: true,
        adminUser,
        categories: categoryResult,
        questions: questionResult,
        message: `迁移完成: ${categoryResult.migrated}个分类, ${questionResult.migrated}个题目`
      };
    } catch (error) {
      console.error('数据迁移失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * 检查数据迁移状态
   */
  checkMigrationStatus: async () => {
    try {
      // 检查没有 createdBy 的分类数量
      const categoryQuery = new AV.Query('Category');
      categoryQuery.doesNotExist('createdBy');
      const orphanCategories = await categoryQuery.count();
      
      // 检查没有 createdBy 的题目数量
      const questionQuery = new AV.Query('Question');
      questionQuery.doesNotExist('createdBy');
      const orphanQuestions = await questionQuery.count();
      
      // 检查总数据量
      const totalCategories = await new AV.Query('Category').count();
      const totalQuestions = await new AV.Query('Question').count();
      
      return {
        orphanCategories,
        orphanQuestions,
        totalCategories,
        totalQuestions,
        migrationNeeded: orphanCategories > 0 || orphanQuestions > 0
      };
    } catch (error) {
      console.error('检查迁移状态失败:', error);
      throw error;
    }
  },
  
  migrateQuestionCreatedBy: async () => {
    try {
      //('开始专门迁移 Question 的 createdBy 属性...');
      
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }
      
      const query = new AV.Query('Question');
      
      // 获取所有没有 createdBy 字段的题目
      query.doesNotExist('createdBy');
      const questions = await query.find();
      
      //(`找到 ${questions.length} 个需要添加 createdBy 的题目`);
      
      let migratedCount = 0;
      for (const question of questions) {
        try {
          question.set('createdBy', currentUser);
          
          // 更新 ACL 权限
          const acl = new AV.ACL();
          acl.setReadAccess(currentUser, true);
          acl.setWriteAccess(currentUser, true);
          acl.setPublicReadAccess(false);
          question.setACL(acl);
          
          await question.save();
          migratedCount++;
          //(`✅ 为题目添加 createdBy: ${question.get('title')}`);
        } catch (error) {
          console.error(`迁移题目失败 ${question.id}:`, error);
        }
      }
      
      //(`Question createdBy 迁移完成: ${migratedCount}/${questions.length}`);
      return { migrated: migratedCount, total: questions.length };
    } catch (error) {
      console.error('迁移 Question createdBy 失败:', error);
      throw error;
    }
  },
  
  /**
   * 只迁移 Question 的完整流程
   */
  performQuestionMigrationOnly: async () => {
    try {
      //('🚀 开始专门迁移 Question 数据...');
      
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('请先登录');
      }
      
      // 只迁移 Question
      const questionResult = await DataMigrationService.migrateQuestionCreatedBy();
      
      //('🎉 Question 迁移完成！');
      
      return {
        success: true,
        questions: questionResult,
        message: `Question 迁移完成: ${questionResult.migrated}个题目`
      };
    } catch (error) {
      console.error('Question 迁移失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};