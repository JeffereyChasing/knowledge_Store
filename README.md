📚 知识题库管理系统
一个现代化的全栈学习管理平台，帮助您高效管理技术题目、跟踪学习进度，并提供智能复习提醒功能

https://img.shields.io/badge/React-18.2.0-blue
https://img.shields.io/badge/LeanCloud-BaaS-green
https://img.shields.io/badge/License-MIT-yellow
https://img.shields.io/badge/PRs-welcome-brightgreen

✨ 核心特性
📝 智能题目管理
分类管理 - 支持创建、编辑、删除分类

题目详情 - 详细答案、口述答案、代码片段、相关链接

难度分级 - 简单、中等、困难三级难度体系

掌握程度 - 初级、中级、高级、精通四档掌握度

出现频率 - 可调节的出现频率，影响复习优先级

🔄 智能复习系统
间隔重复算法 - 基于艾宾浩斯遗忘曲线

复习提醒 - 自动识别需要复习的题目

进度跟踪 - 实时显示复习进度和统计

自定义阈值 - 可调整复习提醒时间阈值

📊 学习数据分析
学习日历 - 可视化展示每日学习活动

分类统计 - 题目分布饼图和难度分布柱状图

活跃度追踪 - 记录学习天数和日均题目数

进度可视化 - 分类进度条和完成度统计

👥 用户系统
多用户支持 - 完整的用户注册登录系统

数据隔离 - 用户数据完全隔离

微信登录 - 支持微信和微信扫码登录

权限管理 - 管理员特殊权限控制

🎯 用户体验
响应式设计 - 适配桌面和移动设备

拖拽排序 - 支持题目拖拽重新排序

搜索过滤 - 全局搜索和分类内搜索

多视图模式 - 列表视图和网格视图切换

🚀 快速开始
环境要求
Node.js 16.0 或更高版本

npm 或 yarn 包管理器

LeanCloud 账户

安装步骤
克隆项目

bash
git clone https://github.com/your-username/knowledge-base.git
cd knowledge-base
安装依赖

bash
npm install
# 或
yarn install
配置 LeanCloud

在 LeanCloud 官网 注册账号

创建新应用

获取 App ID 和 App Key

配置环境变量
在项目根目录创建 .env 文件：

env
REACT_APP_LEANCLOUD_APP_ID=your_app_id_here
REACT_APP_LEANCLOUD_APP_KEY=your_app_key_here
REACT_APP_LEANCLOUD_SERVER_URL=your_server_url_here
启动开发服务器

bash
npm start
# 或
yarn start
访问 http://localhost:3000 查看应用

生产环境部署
构建项目

bash
npm run build
# 或
yarn build
部署到静态托管服务

bash
# 使用 surge
npx surge build

# 或使用 netlify
npm install -g netlify-cli
netlify deploy --prod --dir=build
🛠 技术架构
前端技术栈
React 18 - 现代化前端框架

React Router - 单页面应用路由

React Query - 服务端状态管理

LeanCloud SDK - BaaS 后端服务

Recharts - 数据可视化图表

CSS3 - 现代化样式设计

后端服务
LeanCloud - 后端即服务平台

数据存储 - 结构化数据存储

用户认证 - 内置用户系统

云函数 - 自定义业务逻辑

📁 项目结构
text
src/
├── components/                 # 可复用组件
│   ├── AuthModal.jsx          # 登录注册弹窗
│   ├── ReviewReminderSection.jsx # 复习提醒组件
│   ├── QuestionForm.jsx       # 题目表单
│   ├── QuestionDetailCard.jsx # 题目详情卡片
│   ├── CalendarTooltip.jsx    # 日历提示框
│   ├── Navigation.jsx         # 导航栏
│   ├── Documents.jsx          # 开发文档库
│   └── QuestionCard.jsx       # 题目卡片组件
├── pages/                     # 页面组件
│   ├── HomePage.jsx          # 首页
│   ├── CategoryDetailPage.jsx # 分类详情页
│   ├── ReviewPage.jsx        # 复习页面
│   ├── TestPage.jsx          # 测试页面
│   └── CommunityPage.jsx     # 社区页面
├── services/                  # 服务层
│   ├── categoryService.js    # 分类服务
│   ├── questionService.js    # 题目服务
│   ├── userService.js        # 用户服务
│   ├── dataMigrationService.js # 数据迁移服务
│   └── wechatAuthService.js  # 微信认证服务
└── styles/                   # 样式文件
    ├── HomePage.css
    ├── CategoryDetailPage.css
    └── component-specific CSS files
🔧 核心功能详解
1. 首页 (HomePage)
功能：系统仪表盘，展示概览信息

分类网格展示

学习数据统计面板

交互式学习日历

复习提醒概览卡片

2. 分类详情页 (CategoryDetailPage)
功能：管理特定分类下的题目

题目列表/网格双视图模式

拖拽排序功能

高级搜索和筛选

批量操作（展开/折叠所有）

3. 复习提醒系统 (ReviewReminderSection)
功能：智能间隔重复学习系统

自动识别待复习题目

紧急程度三级分类（高、中、低）

一键复习和进度更新

可自定义复习阈值

4. 题目管理 (QuestionForm & QuestionDetailCard)
功能：完整的题目生命周期管理

富文本答案编辑（支持 Markdown）

代码语法高亮

多版本答案支持

标签和分类管理

🎨 界面预览
主界面
https://via.placeholder.com/800x400?text=HomePage+Dashboard

题目管理
https://via.placeholder.com/800x400?text=Question+Management

学习日历
https://via.placeholder.com/800x400?text=Learning+Calendar

复习系统
https://via.placeholder.com/800x400?text=Review+System

🔐 数据模型
核心数据表结构
Category（分类）
javascript
{
  id: String,           // 唯一标识
  name: String,         // 分类名称
  description: String,  // 分类描述
  questionCount: Number,// 题目数量
  createdBy: Pointer,   // 创建者
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
Question（题目）
javascript
{
  id: String,           // 唯一标识
  title: String,        // 题目标题
  detailedAnswer: String, // 详细答案
  oralAnswer: String,   // 口述答案
  code: String,         // 代码片段
  url: String,          // 相关链接
  difficulty: String,   // 难度等级
  proficiency: String,  // 掌握程度
  appearanceLevel: Number, // 出现频率
  tags: Array,          // 标签数组
  category: Pointer,    // 所属分类
  lastReviewedAt: Date, // 最后复习时间
  createdBy: Pointer,   // 创建者
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
🚀 开发指南
添加新功能
在 components/ 目录创建新组件

在对应的服务文件中添加 API 调用

更新路由配置（如需要）

添加样式文件

自定义样式
系统使用 CSS Modules，每个组件有对应的 CSS 文件：

css
/* 示例样式结构 */
.component-name {
  /* 基础样式 */
}

.component-name__element {
  /* 元素样式 */
}

.component-name--modifier {
  /* 修饰符样式 */
}
API 开发
所有数据操作通过 LeanCloud SDK 进行：

javascript
// 示例：创建题目
import { createQuestion } from '../services/questionService';

const newQuestion = await createQuestion({
  title: '题目标题',
  detailedAnswer: '详细答案',
  difficulty: 'medium',
  categoryId: 'category123'
});
📱 移动端支持
系统完全响应式，支持：

📱 手机端优化布局

👆 触摸友好的交互

📲 PWA 支持（可选）

🌐 离线功能（计划中）

🤝 贡献指南
我们欢迎各种形式的贡献！

报告问题
使用 GitHub Issues 报告 bug

描述清晰的问题复现步骤

提供相关截图或错误日志

提交代码
Fork 本仓库

创建功能分支 (git checkout -b feature/AmazingFeature)

提交更改 (git commit -m 'Add some AmazingFeature')

推送到分支 (git push origin feature/AmazingFeature)

开启 Pull Request

开发规范
使用 ESLint 和 Prettier 保持代码风格一致

为新功能添加相应的测试用例

更新相关文档

遵循现有的代码结构