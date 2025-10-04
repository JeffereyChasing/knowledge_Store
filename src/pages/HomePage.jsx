// HomePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getCategories,
  initAV,
  QueryOptions,
  createCategory,
  deleteCategory,
} from "../services/categoryService";
import { getAllQuestions, updateQuestion } from "../services/questionService";
import AV from "leancloud-storage";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ReviewReminderSection from "../components/ReviewReminderSection";
import CalendarTooltip from "../components/CalendarTooltip";
import "./HomePage.css";
import Documents from "../components/Documents";
import CommunityPage from "../components/community/CommunityPage";


// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
      retry: 1,
    },
  },
});

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // 复习提醒相关状态
  const [reviewThreshold, setReviewThreshold] = useState(7); // 默认7天
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [showReviewSettings, setShowReviewSettings] = useState(false);

  // 用户状态
  const [currentUser, setCurrentUser] = useState(null);

  // 日历hover相关状态
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const calendarRef = useRef(null);

  // 检查用户登录状态
  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);

    if (user) {
      initializeData();
    } else {
      setLoading(false);
    }
  }, []);

  // 处理添加分类
  const handleAddCategory = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("请先登录");
      return;
    }

    if (!newCategoryName.trim()) {
      alert("请输入分类名称");
      return;
    }

    setAddingCategory(true);
    try {
      const newCategory = await createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });

      // 添加新分类到列表
      setCategories((prev) => [newCategory, ...prev]);

      // 重置表单
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddCategory(false);

      // 显示成功消息
      setSyncMessage(`分类 "${newCategory.name}" 创建成功！`);
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (error) {
      console.error("创建分类失败:", error);
      setSyncMessage("创建分类失败: " + (error.message || "请检查网络连接"));
    } finally {
      setAddingCategory(false);
    }
  };

  // 处理删除分类确认
  const handleDeleteClick = (category, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发分类卡片点击
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  // 确认删除分类
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingCategory(true);
    try {
      await deleteCategory(categoryToDelete.id);

      // 从列表中移除分类
      setCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryToDelete.id)
      );

      // 关闭确认对话框
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);

      // 显示成功消息
      setSyncMessage(`分类 "${categoryToDelete.name}" 删除成功！`);
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (error) {
      console.error("删除分类失败:", error);
      setSyncMessage("删除分类失败: " + (error.message || "请检查网络连接"));
    } finally {
      setDeletingCategory(false);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  const handleSyncFromNotion = async () => {
    if (!currentUser) {
      alert("请先登录");
      return;
    }

    setSyncing(true);
    setSyncMessage("开始从Notion导入数据...");

    try {
      const result = await AV.Cloud.run("syncProblemsFromNotion");
      setSyncMessage(result.message || "同步成功！");

      setTimeout(() => {
        reloadData();
      }, 1000);
    } catch (error) {
      console.error("同步失败:", error);
      setSyncMessage("同步失败: " + (error.message || "请检查网络连接或配置"));
    } finally {
      setSyncing(false);
    }
  };

  const reloadData = async () => {
    try {
      const categoriesData = await getCategories({
        page: 1,
        pageSize: 50,
        sortBy: QueryOptions.SORT_BY_UPDATED_AT,
        sortOrder: "desc",
      });
      setCategories(categoriesData.data);

      const questionsData = await getAllQuestions();
      setQuestions(questionsData);
    } catch (err) {
      console.error("重新加载数据失败:", err);
    }
  };

  // 更新题目复习时间 - 修复版本
  const handleUpdateQuestionTime = async (questionId) => {
    try {
      console.log("更新题目复习时间:", questionId);

      const question = questions.find((q) => q.id === questionId);
      if (!question) {
        throw new Error("未找到对应的题目");
      }

      const currentTime = new Date();

      // 只更新自定义字段，不要更新 reserved fields
      await updateQuestion(questionId, {
        lastReviewedAt: currentTime, // 只更新自定义的复习时间字段
      });

      console.log("LeanCloud 更新成功，开始更新本地状态");

      // 更新本地状态中的题目更新时间
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                // updatedAt 由 LeanCloud 自动更新，我们只更新 lastReviewedAt
                lastReviewedAt: currentTime.toISOString(),
              }
            : q
        )
      );

      console.log(`题目 ${questionId} 复习时间已更新`);
      return true;
    } catch (error) {
      console.error("更新题目时间失败:", error);
      console.error("错误详情:", {
        questionId,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  };

  // 计算需要复习的题目 - 修复版本
  useEffect(() => {
    const calculateReviewQuestions = () => {
      const now = new Date();
      const thresholdMs = reviewThreshold * 24 * 60 * 60 * 1000; // 转换为毫秒

      const needReview = questions
        .filter((question) => {
          // 使用 lastReviewedAt 字段，如果不存在则使用 createdAt
          const lastReviewed = new Date(
            question.lastReviewedAt || question.createdAt
          );
          const timeDiff = now - lastReviewed;
          return timeDiff >= thresholdMs;
        })
        .sort((a, b) => {
          // 按复习时间正序排列，最久未复习的排在最前面
          const timeA = new Date(a.lastReviewedAt || a.createdAt);
          const timeB = new Date(b.lastReviewedAt || b.createdAt);
          return timeA - timeB;
        });

      setReviewQuestions(needReview);
    };

    if (questions.length > 0) {
      calculateReviewQuestions();
    }
  }, [questions, reviewThreshold]);

  const initializeData = async () => {
    try {
      initAV();
      const categoriesData = await getCategories({
        page: 1,
        pageSize: 50,
        sortBy: QueryOptions.SORT_BY_UPDATED_AT,
        sortOrder: "desc",
      });

      setCategories(categoriesData.data);

      const questionsData = await getAllQuestions();
      setQuestions(questionsData);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 获取某一天的题目详情
  const getDayQuestions = (date) => {
    const dateStr = date.toISOString().split("T")[0];

    const dayQuestions = questions.filter((question) => {
      const questionDate = new Date(question.createdAt);
      const questionDateStr = questionDate.toISOString().split("T")[0];
      return questionDateStr === dateStr;
    });

    // 按创建时间排序
    return dayQuestions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  // 获取固定颜色
  const getDayColor = (count) => {
    if (count === 0) return "#f8f9fa"; // 无题目 - 浅灰色
    if (count <= 1) return "#4CAF50"; // 1题 - 深绿色
    if (count <= 3) return "#8BC34A"; // 2-3题 - 浅绿色
    if (count <= 5) return "#FFC107"; // 4-5题 - 黄色
    if (count <= 8) return "#FF9800"; // 6-8题 - 橙色
    return "#F44336"; // 9题以上 - 红色
  };

  // 生成月度日历数据
  const getMonthlyCalendarData = () => {
    const monthStart = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    );

    const dateCounts = {};
    questions.forEach((question) => {
      const questionDate = new Date(question.createdAt);
      if (questionDate >= monthStart && questionDate <= monthEnd) {
        const dateStr = questionDate.toISOString().split("T")[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });

    const calendarData = [];
    const currentDate = new Date(monthStart);

    while (currentDate <= monthEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayQuestions = getDayQuestions(currentDate);
      const questionCount = dayQuestions.length;

      calendarData.push({
        date: new Date(currentDate),
        count: questionCount,
        day: currentDate.getDate(),
        isToday: dateStr === new Date().toISOString().split("T")[0],
        questions: dayQuestions,
        color: getDayColor(questionCount),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return calendarData;
  };

  // 处理日历日期的鼠标悬停
  const handleDayMouseEnter = (dayData, event) => {
    setHoveredDay(dayData);
    setTooltipVisible(true);

    // 计算相对于日历容器的位置
    if (calendarRef.current) {
      const calendarRect = calendarRef.current.getBoundingClientRect();
      const dayRect = event.currentTarget.getBoundingClientRect();

      setTooltipPosition({
        x: dayRect.left + dayRect.width / 2 - calendarRect.left,
        y: dayRect.top - calendarRect.top - 10,
      });
    }

    setTooltipVisible(true);
  };

  const handleDayMouseLeave = () => {
    // 延迟隐藏，给用户时间移动到提示框
    setTimeout(() => {
      if (!document.querySelector(".calendar-tooltip:hover")) {
        setTooltipVisible(false);
      }
    }, 100);
  };

  const handleTooltipClose = () => {
    setTooltipVisible(false);
    setHoveredDay(null);
  };

  // 月份导航
  const navigateMonth = (direction) => {
    const newDate = new Date(selectedMonth);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

  // 获取月份统计
  const getMonthStats = () => {
    const monthData = getMonthlyCalendarData();
    const daysWithQuestions = monthData.filter((day) => day.count > 0).length;
    const totalQuestions = monthData.reduce((sum, day) => sum + day.count, 0);
    const maxDaily = Math.max(...monthData.map((day) => day.count));

    return { daysWithQuestions, totalQuestions, maxDaily };
  };

  const getCategoryChartData = () => {
    const categoryMap = {};

    questions.forEach((question) => {
      const categoryName = question.category?.name || "未分类";
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .map(([name, count]) => ({
        name: name.length > 8 ? name.substring(0, 8) + "..." : name,
        fullName: name,
        value: count,
        percentage: ((count / questions.length) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getDifficultyData = () => {
    const difficultyMap = {};

    questions.forEach((question) => {
      const difficulty = question.difficulty || "unknown";
      difficultyMap[difficulty] = (difficultyMap[difficulty] || 0) + 1;
    });

    return Object.entries(difficultyMap).map(([name, count]) => ({
      name: getDifficultyText(name),
      value: count,
      color: getDifficultyColor(name),
    }));
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "#52c41a";
      case "medium":
        return "#faad14";
      case "hard":
        return "#f5222d";
      default:
        return "#666";
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "简单";
      case "medium":
        return "中等";
      case "hard":
        return "困难";
      default:
        return "未知";
    }
  };

  const getActiveDays = () => {
    const uniqueDays = new Set(
      questions.map((q) => new Date(q.createdAt).toDateString())
    );
    return uniqueDays.size;
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  const handleQuestionClick = (questionId) => {
    // 找到题目对应的分类并跳转
    const question = questions.find((q) => q.id === questionId);
    if (question && question.category) {
      navigate(`/category/${question.category.id}`);
    }
  };

  const formatTime = (date) => {
    if (!date) return "暂无";
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return new Date(date).toLocaleDateString();
  };

  const getProgressWidth = (count) => {
    if (!categories.length) return 0;
    const maxCount = Math.max(...categories.map((c) => c.questionCount || 0));
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  const defaultColors = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#feca57",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
    "#00d2d3",
    "#ff9f43",
  ];

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className="homepage">
        <div className="auth-required-container">
          <div className="auth-required-icon">🔐</div>
          <h2>请先登录</h2>
          <p>登录后即可查看和管理您的刷题数据</p>
          <div className="auth-required-actions">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("showAuthModal", {
                    detail: { tab: "login" },
                  })
                );
              }}
              className="login-btn primary"
            >
              🚀 立即登录
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("showAuthModal", {
                    detail: { tab: "register" },
                  })
                );
              }}
              className="login-btn secondary"
            >
              📝 注册账号
            </button>
          </div>

          <div className="auth-features">
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">📚</span>
                <span>管理您的刷题分类</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>查看学习统计</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔄</span>
                <span>使用复习提醒功能</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🗓️</span>
                <span>记录学习日历</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="homepage">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>加载知识库中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="homepage">
        <div className="error-container">
          <h2>加载失败</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-btn"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const chartData = getCategoryChartData();
  const difficultyData = getDifficultyData();
  const calendarData = getMonthlyCalendarData();
  const activeDays = getActiveDays();
  const monthStats = getMonthStats();
  const monthName = selectedMonth.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="homepage">
        <header className="hero-section">
          <div className="hero-content">
            <div className="user-welcome">
              <h1 className="hero-title">我的知识题库</h1>
              <p className="hero-subtitle">
                欢迎回来, {currentUser.getUsername()}！按类别管理您的学习内容
              </p>
            </div>

           
            <div className="search-container">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索类别..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            
          </div>
        </header>

        {/* 现代化标签导航 */}
        <section className="modern-tabs-section">
          <div className="container">
            <div className="modern-tabs">
              <button
                className={`modern-tab ${
                  activeTab === "categories" ? "active" : ""
                }`}
                onClick={() => setActiveTab("categories")}
              >
                <span className="tab-icon">📚</span>
                <span className="tab-text">分类浏览</span>
                {activeTab === "categories" && (
                  <div className="tab-indicator"></div>
                )}
              </button>
              <button
                className={`modern-tab ${
                  activeTab === "review" ? "active" : ""
                }`}
                onClick={() => setActiveTab("review")}
              >
                <span className="tab-icon">🔄</span>
                <span className="tab-text">
                  复习提醒
                  {reviewQuestions.length > 0 && (
                    <span className="tab-badge">{reviewQuestions.length}</span>
                  )}
                </span>
                {activeTab === "review" && (
                  <div className="tab-indicator"></div>
                )}
              </button>
              <button
                className={`modern-tab ${
                  activeTab === "stats" ? "active" : ""
                }`}
                onClick={() => setActiveTab("stats")}
              >
                <span className="tab-icon">📊</span>
                <span className="tab-text">数据统计</span>
                {activeTab === "stats" && <div className="tab-indicator"></div>}
              </button>
              <button
                className={`modern-tab ${
                  activeTab === "calendar" ? "active" : ""
                }`}
                onClick={() => setActiveTab("calendar")}
              >
                <span className="tab-icon">🗓️</span>
                <span className="tab-text">学习日历</span>
                {activeTab === "calendar" && (
                  <div className="tab-indicator"></div>
                )}
              </button>
              {/* 新增的 Documents 按钮 */}
              <button
                className={`modern-tab ${
                  activeTab === "documents" ? "active" : ""
                }`}
                onClick={() => setActiveTab("documents")}
              >
                <span className="tab-icon">📖</span>
                <span className="tab-text">开发文档</span>
                {activeTab === "documents" && (
                  <div className="tab-indicator"></div>
                )}
              </button>

              <button
                className={`modern-tab ${
                  activeTab === "community" ? "active" : ""
                }`}
                onClick={() => setActiveTab("community")}
              >
                <span className="tab-icon">👥</span>
                <span className="tab-text">学习社区</span>
                {activeTab === "community" && (
                  <div className="tab-indicator"></div>
                )}
              </button>


            </div>
          </div>
        </section>

        {activeTab === "categories" && (
          <>
            <section className="filters-section">
              <div className="container">
                <div className="filters">
                  <div className="stats">
                    找到 {filteredCategories.length} 个类别
                    {categories.length > 0 &&
                      ` • 总计 ${categories.reduce(
                        (sum, cat) => sum + (cat.questionCount || 0),
                        0
                      )} 道题目`}
                  </div>
                  <button
                    className="add-category-btn"
                    onClick={() => setShowAddCategory(true)}
                  >
                    <span className="btn-icon">+</span>
                    新建分类
                  </button>
                </div>
              </div>
            </section>

            {/* 添加分类弹窗 */}
            {showAddCategory && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>创建新分类</h3>
                    <button
                      className="close-btn"
                      onClick={() => setShowAddCategory(false)}
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleAddCategory} className="category-form">
  <div className="form-group">
    <label htmlFor="categoryName">分类名称 *</label>
    <input
      id="categoryName"
      type="text"
      value={newCategoryName}
      onChange={(e) => setNewCategoryName(e.target.value)}
      placeholder="请输入分类名称"
      maxLength={50}
      autoFocus
      style={{ color: 'black' }}  // 输入框文字设为黑色
    />
  </div>

  <div className="form-group">
    <label htmlFor="categoryDescription">分类描述</label>
    <textarea
      id="categoryDescription"
      value={newCategoryDescription}
      onChange={(e) => setNewCategoryDescription(e.target.value)}
      placeholder="请输入分类描述（可选）"
      rows="3"
      maxLength={200}
      style={{ color: 'black' }}  // 文本域文字设为黑色
    />
  </div>

  <div className="form-actions">
    <button
      type="button"
      className="cancel-btn"
      onClick={() => setShowAddCategory(false)}
    >
      取消
    </button>
    <button
      type="submit"
      className="submit-btn"
      disabled={addingCategory || !newCategoryName.trim()}
    >
      {addingCategory ? "创建中..." : "创建分类"}
    </button>
  </div>
</form>
                </div>
              </div>
            )}

            {/* 删除分类确认弹窗 */}
            {showDeleteConfirm && categoryToDelete && (
              <div className="modal-overlay">
                <div className="modal-content delete-confirm-modal">
                  <div className="modal-header">
                    <h3>确认删除</h3>
                    <button className="close-btn" onClick={handleCancelDelete}>
                      ×
                    </button>
                  </div>

                  <div className="delete-content">
                    <div className="delete-icon">🗑️</div>
                    <div className="delete-message">
                      <p>
                        确定要删除分类{" "}
                        <strong>"{categoryToDelete.name}"</strong> 吗？
                      </p>
                      {categoryToDelete.questionCount > 0 && (
                        <p className="warning-text">
                          ⚠️ 此分类包含 {categoryToDelete.questionCount}{" "}
                          道题目，删除后这些题目将变为未分类状态！
                        </p>
                      )}
                      <p className="delete-hint">
                        此操作不可撤销，请谨慎操作。
                      </p>
                    </div>

                    <div className="delete-actions">
                      <button
                        className="cancel-delete-btn"
                        onClick={handleCancelDelete}
                        disabled={deletingCategory}
                      >
                        取消
                      </button>
                      <button
                        className="confirm-delete-btn"
                        onClick={handleConfirmDelete}
                        disabled={deletingCategory}
                      >
                        {deletingCategory ? "删除中..." : "确认删除"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="categories-section">
              <div className="container">
                {filteredCategories.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h3>暂无类别数据</h3>
                    <p>没有找到匹配的类别，尝试调整搜索条件或创建新分类</p>
                    <button
                      className="create-first-category-btn"
                      onClick={() => setShowAddCategory(true)}
                    >
                      + 创建第一个分类
                    </button>
                  </div>
                ) : (
                  <div className="categories-grid">
                    {filteredCategories.map((category, index) => {
                      const color = defaultColors[index % defaultColors.length];

                      return (
                        <div
                          key={category.id}
                          className="category-card"
                          onClick={() => handleCategoryClick(category.id)}
                          style={{ "--accent-color": color }}
                        >
                          <div className="card-header">
                            <div
                              className="category-icon"
                              style={{ backgroundColor: color }}
                            >
                              {category.name.charAt(0)}
                            </div>
                            <div className="category-info">
                              <h3 className="category-name">{category.name}</h3>
                              {category.description && (
                                <p className="category-description">
                                  {category.description}
                                </p>
                              )}
                              <span className="question-count">
                                {category.questionCount || 0} 题
                              </span>
                            </div>
                            <button
                              className="delete-category-btn"
                              onClick={(e) => handleDeleteClick(category, e)}
                              title="删除分类"
                            >
                              ×
                            </button>
                          </div>

                          <div className="card-footer">
                            <div className="progress-info">
                              <div className="progress-stats">
                                <span>
                                  最近更新: {formatTime(category.updatedAt)}
                                </span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${getProgressWidth(
                                      category.questionCount
                                    )}%`,
                                    backgroundColor: color,
                                  }}
                                ></div>
                              </div>
                            </div>

                            <button className="explore-btn">查看题目 →</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* 复习提醒标签页 */}
        {activeTab === "review" && (
          <ReviewReminderSection
            reviewQuestions={reviewQuestions}
            setReviewQuestions={setReviewQuestions}
            reviewThreshold={reviewThreshold}
            setReviewThreshold={setReviewThreshold}
            showReviewSettings={showReviewSettings}
            setShowReviewSettings={setShowReviewSettings}
            onQuestionClick={handleQuestionClick} // 传递跳转函数
            onUpdateQuestionTime={handleUpdateQuestionTime}
            questions={questions}
          />
        )}

        {activeTab === "documents" && (
          <section className="documents-tab-section">
            <div className="container">
              <Documents />
            </div>
          </section>
        )}

        {activeTab === "community" && <CommunityPage />}

        {activeTab === "stats" && (
          <section className="stats-section">
            <div className="container">
              <div className="stats-overview">
                <div className="modern-stat-card primary">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-number">{categories.length}</div>
                    <div className="stat-label">总分类数</div>
                  </div>
                </div>
                <div className="modern-stat-card success">
                  <div className="stat-icon">❓</div>
                  <div className="stat-content">
                    <div className="stat-number">{questions.length}</div>
                    <div className="stat-label">总题目数</div>
                  </div>
                </div>
                <div className="modern-stat-card warning">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <div className="stat-number">{activeDays}</div>
                    <div className="stat-label">活跃天数</div>
                  </div>
                </div>
                <div className="modern-stat-card info">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {questions.length > 0
                        ? (questions.length / activeDays).toFixed(1)
                        : 0}
                    </div>
                    <div className="stat-label">日均题目</div>
                  </div>
                </div>
              </div>

              <div className="charts-grid">
                <div className="modern-chart-card">
                  <div className="chart-header">
                    <h3>📊 分类题目分布</h3>
                    <span className="chart-subtitle">各分类题目数量占比</span>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} ${percentage}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={defaultColors[index % defaultColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} 题`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="modern-chart-card">
                  <div className="chart-header">
                    <h3>🎯 难度分布</h3>
                    <span className="chart-subtitle">题目难度等级统计</span>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={difficultyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value} 题`, "数量"]}
                        />
                        <Bar dataKey="value" name="题目数量">
                          {difficultyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "calendar" && (
          <section className="modern-calendar-section">
            <div className="container">
              <div className="calendar-header">
                <h3>🗓️ 学习日历</h3>
                <p>查看每月的学习活动分布</p>
              </div>

              <div className="modern-calendar-card" ref={calendarRef}>
                <div className="calendar-controls">
                  <button
                    onClick={() => navigateMonth("prev")}
                    className="month-nav-btn"
                  >
                    ← 上个月
                  </button>
                  <h4 className="current-month">{monthName}</h4>
                  <button
                    onClick={() => navigateMonth("next")}
                    className="month-nav-btn"
                  >
                    下个月 →
                  </button>
                </div>

                <div className="monthly-calendar">
                  <div className="calendar-weekdays">
                    {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                      <div key={day} className="weekday">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-days">
                    {calendarData.map((dayData, index) => (
                      <div
                        key={index}
                        className={`calendar-day ${
                          dayData.count > 0 ? "has-questions" : ""
                        } ${dayData.isToday ? "today" : ""}`}
                        style={{ backgroundColor: dayData.color }}
                        onMouseEnter={(e) => handleDayMouseEnter(dayData, e)}
                        onMouseLeave={handleDayMouseLeave}
                        data-count={dayData.count}
                      >
                        <span className="day-number">{dayData.day}</span>
                        {dayData.count > 0 && (
                          <div className="question-count-badge">
                            {dayData.count}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 使用新的日历提示框组件 */}
                  <CalendarTooltip
                    dayData={hoveredDay}
                    position={tooltipPosition}
                    isVisible={tooltipVisible}
                    onClose={handleTooltipClose}
                  />
                </div>

                <div className="calendar-stats">
                  <div className="calendar-stat">
                    <span className="stat-value">
                      {monthStats.totalQuestions}
                    </span>
                    <span className="stat-label">本月题目</span>
                  </div>
                  <div className="calendar-stat">
                    <span className="stat-value">
                      {monthStats.daysWithQuestions}
                    </span>
                    <span className="stat-label">学习天数</span>
                  </div>
                  <div className="calendar-stat">
                    <span className="stat-value">{monthStats.maxDaily}</span>
                    <span className="stat-label">单日最高</span>
                  </div>
                </div>

                <div className="calendar-legend">
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#f8f9fa" }}
                    ></div>
                    <span>无题目</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#4CAF50" }}
                    ></div>
                    <span>1题</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#8BC34A" }}
                    ></div>
                    <span>2-3题</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#FFC107" }}
                    ></div>
                    <span>4-5题</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#FF9800" }}
                    ></div>
                    <span>6-8题</span>
                  </div>
                  <div className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: "#F44336" }}
                    ></div>
                    <span>9题以上</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="footer-section">
          <div className="container">
            <div className="footer-stats">
              <div className="stat-item">
                <div className="stat-number">{categories.length}</div>
                <div className="stat-label">总类别数</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{questions.length}</div>
                <div className="stat-label">总题目数</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {
                    categories.filter((cat) => (cat.questionCount || 0) > 0)
                      .length
                  }
                </div>
                <div className="stat-label">有题目的类别</div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
};

export default HomePage;
