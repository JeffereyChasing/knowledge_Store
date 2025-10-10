// HomePage.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Chatbox from "../components/Chatbox";
import {
  getCategories,
  initAV,
  QueryOptions,
  createCategory,
  deleteCategory,
} from "../services/categoryService";
import { getAllQuestions, updateQuestion } from "../services/questionService";
import { cacheService } from "../services/cacheService";
import { offlineService } from "../services/offlineService";
import OfflineIndicator from "../components/OfflineIndicator";
import AV from "leancloud-storage";
import CacheManagementTab from '../components/CacheManagementTab';
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
  const [reviewThreshold, setReviewThreshold] = useState(7);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [showReviewSettings, setShowReviewSettings] = useState(false);

  // 用户状态
  const [currentUser, setCurrentUser] = useState(null);

  // 日历hover相关状态
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const calendarRef = useRef(null);

  // 新增离线相关状态
  const [isOnline, setIsOnline] = useState(true);
  const [cacheStatus, setCacheStatus] = useState({});
  const [offlineQuestions, setOfflineQuestions] = useState([]);
  const [showOfflineMode, setShowOfflineMode] = useState(false);
  const [swStatus, setSwStatus] = useState({
    supported: false,
    activated: false,
    error: null,
  });

  // 添加状态
  const [cacheSettings, setCacheSettings] = useState({
    cacheLimit: cacheService.getCacheLimit(),
    autoCache: true,
  });

  // 新增：分类引用，用于聊天机器人触发
  const categoryRefs = useRef({});

  // 新增：处理分类触发
  // 在 Homepage.jsx 的 handleTriggerCategory 函数中添加调试

// 处理分类触发
const handleTriggerCategory = (categoryName, buttonId) => {
  console.log(`🎯 触发分类: ${categoryName}, 按钮ID: ${buttonId}`);
  console.log(`📊 当前分类列表:`, categories.map(cat => cat.name));
  
  // 首先切换到分类标签页
  setActiveTab("categories");
  
  // 延迟执行，确保分类页面已经渲染
  setTimeout(() => {
    // 找到匹配的分类 - 增强匹配逻辑
    const targetCategory = categories.find(cat => {
      const catNameLower = cat.name.toLowerCase();
      const searchNameLower = categoryName.toLowerCase();
      
      // 多种匹配方式
      const exactMatch = catNameLower === searchNameLower;
      const containsMatch = catNameLower.includes(searchNameLower) || searchNameLower.includes(catNameLower);
      const fuzzyMatch = catNameLower.replace(/\s+/g, '') === searchNameLower.replace(/\s+/g, '');
      
      console.log(`🔍 匹配检查: ${cat.name}`, {
        exactMatch,
        containsMatch,
        fuzzyMatch,
        catNameLower,
        searchNameLower
      });
      
      return exactMatch || containsMatch || fuzzyMatch;
    });
    
    if (targetCategory) {
      console.log(`✅ 找到分类: ${targetCategory.name}`, targetCategory);
      
      // 如果有对应的分类卡片引用，模拟点击
      const categoryKey = `category-${targetCategory.id}`;
      if (categoryRefs.current[categoryKey]) {
        console.log(`🖱️ 模拟点击分类卡片: ${targetCategory.name}`);
        categoryRefs.current[categoryKey].click();
      } else {
        // 如果没有引用，直接导航到分类页面
        console.log(`🔗 直接导航到分类: ${targetCategory.name}`);
        handleCategoryClick(targetCategory.id);
      }
      
      // 显示成功消息
      setSyncMessage(`已为您打开 ${targetCategory.name} 分类`);
      setTimeout(() => setSyncMessage(""), 3000);
    } else {
      console.log(`❌ 未找到匹配的分类: ${categoryName}`);
      console.log(`💡 可用的分类:`, categories.map(c => c.name));
      
      // 尝试更宽松的匹配
      const looseMatch = categories.find(cat => 
        cat.name.toLowerCase().includes(categoryName.toLowerCase().substring(0, 3))
      );
      
      if (looseMatch) {
        console.log(`🔍 宽松匹配找到: ${looseMatch.name}`);
        const categoryKey = `category-${looseMatch.id}`;
        if (categoryRefs.current[categoryKey]) {
          categoryRefs.current[categoryKey].click();
          setSyncMessage(`已为您打开相近分类: ${looseMatch.name}`);
        } else {
          handleCategoryClick(looseMatch.id);
        }
      } else {
        setSyncMessage(`未找到"${categoryName}"分类，请检查分类名称`);
      }
      setTimeout(() => setSyncMessage(""), 3000);
    }
  }, 100);
};

  // 预缓存函数
  const preCacheQuestions = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log("🔄 通过 Service Worker 缓存题目...");
      setSyncing(true);

      cacheService.setCacheLimit(cacheSettings.cacheLimit);

      const success = await cacheService.cacheQuestions(questions);

      if (success) {
        const status = await cacheService.getCacheStatus();
        setCacheStatus(status);
        setTimeout(() => setSyncMessage(""), 3000);
      }
    } catch (error) {
      console.error("预缓存失败:", error);
      setSyncMessage("缓存失败: " + error.message);
    } finally {
      setSyncing(false);
    }
  }, [currentUser, questions, cacheSettings.cacheLimit]);

  // 缓存设置组件
  const CacheSettingsModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>📦 离线缓存设置</h3>
          <button
            className="close-btn"
            onClick={() => setShowCacheSettings(false)}
          >
            ×
          </button>
        </div>

        <div className="cache-settings-form">
          <div className="form-group">
            <label htmlFor="cacheLimit">
              缓存题目数量: {cacheSettings.cacheLimit} 题
            </label>
            <input
              id="cacheLimit"
              type="range"
              min="10"
              max="100"
              step="10"
              value={cacheSettings.cacheLimit}
              onChange={(e) =>
                setCacheSettings((prev) => ({
                  ...prev,
                  cacheLimit: parseInt(e.target.value),
                }))
              }
              className="cache-limit-slider"
            />
            <div className="range-labels">
              <span>10题</span>
              <span>100题</span>
            </div>
            <div className="cache-hint">
              当前配置: 最多缓存 {cacheSettings.cacheLimit} 道题目供离线使用
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowCacheSettings(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={() => {
                cacheService.setCacheLimit(cacheSettings.cacheLimit);
                setShowCacheSettings(false);
                setTimeout(() => setSyncMessage(""), 3000);
              }}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const [showCacheSettings, setShowCacheSettings] = useState(false);

  // 加载离线数据
  const loadOfflineData = useCallback(async () => {
    try {
      const cacheData = await cacheService.getCachedQuestions();
      setOfflineQuestions(cacheData.questions);
      setShowOfflineMode(true);
      console.log("📦 加载离线数据:", cacheData.questions.length);
    } catch (error) {
      console.error("加载离线数据失败:", error);
    }
  }, []);

  // 手动缓存功能
  const handleManualCache = useCallback(async () => {
    setSyncing(true);
    setSyncMessage("正在缓存题目数据...");

    try {
      await preCacheQuestions();
      setCacheStatus(cacheService.getCacheStatus());
    } catch (error) {
      setSyncMessage("缓存失败: " + error.message);
    } finally {
      setSyncing(false);
    }
  }, [preCacheQuestions]);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMode(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (cacheService.getCacheStatus().hasCache) {
        loadOfflineData();
      }
    };

    offlineService.addEventListener("online", handleOnline);
    offlineService.addEventListener("offline", handleOffline);

    setIsOnline(offlineService.isOnlineMode());
    setCacheStatus(cacheService.getCacheStatus());

    return () => {
      offlineService.removeEventListener("online", handleOnline);
      offlineService.removeEventListener("offline", handleOffline);
    };
  }, [loadOfflineData]);

  useEffect(() => {
    const user = AV.User.current();
    setCurrentUser(user);

    if (user) {
      if (offlineService.shouldUseOfflineData()) {
        console.log("🚀 启动离线模式");
        setShowOfflineMode(true);
        loadOfflineData();
        setLoading(false);
      } else {
        initializeData();
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Service Worker 事件监听
  useEffect(() => {
    if (!cacheService.isSupported) return;

    const handleCacheUpdated = (event) => {
      const { count, timestamp } = event.detail;
      setSyncMessage(``);
      setCacheStatus((prev) => ({ ...prev, hasCache: true, count }));
    };

    const handleSwActivated = (event) => {
      setSwStatus((prev) => ({
        ...prev,
        activated: true,
        version: event.detail.version,
      }));
      console.log("🚀 Service Worker 已激活:", event.detail.version);
    };

    cacheService.addEventListener("cacheUpdated", handleCacheUpdated);
    cacheService.addEventListener("swActivated", handleSwActivated);

    setSwStatus((prev) => ({
      ...prev,
      supported: cacheService.isSupported,
    }));

    return () => {
      cacheService.removeEventListener("cacheUpdated", handleCacheUpdated);
      cacheService.removeEventListener("swActivated", handleSwActivated);
    };
  }, []);

  // 用户登录后自动缓存
  useEffect(() => {
    if (currentUser && questions.length > 0) {
      const timer = setTimeout(() => {
        preCacheQuestions();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, questions, preCacheQuestions]);

  const handleManualRefresh = useCallback(async () => {
    console.log("🔄 手动刷新数据...");
    setSyncMessage("刷新数据中...");

    try {
      clearAllCache();
      clearCategoryCache();
      await initializeData();
      setSyncMessage("数据刷新成功！");
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (error) {
      console.error("刷新数据失败:", error);
      setSyncMessage("刷新失败: " + error.message);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  }, []);

  useEffect(() => {
    const handleQuestionCreated = () => {
      console.log("📝 检测到题目创建，自动刷新数据...");
      setTimeout(() => {
        handleManualRefresh();
      }, 1000);
    };

    window.addEventListener("questionCreated", handleQuestionCreated);

    return () => {
      window.removeEventListener("questionCreated", handleQuestionCreated);
    };
  }, [handleManualRefresh]);

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

      setCategories((prev) => [newCategory, ...prev]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddCategory(false);

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
  const handleDeleteClick = useCallback((category, e) => {
    e.stopPropagation();
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  }, []);

  // 确认删除分类
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeletingCategory(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryToDelete.id)
      );
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
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
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  }, []);

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

  // 更新题目复习时间
  const handleUpdateQuestionTime = async (questionId) => {
    try {
      console.log("更新题目复习时间:", questionId);

      const question = questions.find((q) => q.id === questionId);
      if (!question) {
        throw new Error("未找到对应的题目");
      }

      const currentTime = new Date();

      await updateQuestion(questionId, {
        lastReviewedAt: currentTime,
      });

      console.log("LeanCloud 更新成功，开始更新本地状态");

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
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

  useEffect(() => {
    const handleGlobalError = (event) => {
      if (
        event.error &&
        (event.error.message.includes("network") ||
          event.error.message.includes("offline") ||
          event.error.message.includes("CORS") ||
          event.error.message.includes("LeanCloud"))
      ) {
        console.log("🌐 捕获到网络错误，切换到离线模式");
        setShowOfflineMode(true);
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleGlobalError);

    return () => {
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);


  

  // 计算需要复习的题目
  useEffect(() => {
    const calculateReviewQuestions = () => {
      const now = new Date();
      const thresholdMs = reviewThreshold * 24 * 60 * 60 * 1000;

      const needReview = questions
        .filter((question) => {
          const lastReviewed = new Date(
            question.lastReviewedAt || question.createdAt
          );
          const timeDiff = now - lastReviewed;
          return timeDiff >= thresholdMs;
        })
        .sort((a, b) => {
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

  const handleChatboxNavigate = (target) => {
    console.log("导航到:", target);
    switch (target) {
      case "categories":
        setActiveTab("categories");
        break;
      case "review":
        setActiveTab("review");
        break;
      case "stats":
        setActiveTab("stats");
        break;
      case "calendar":
        setActiveTab("calendar");
        break;
      case "community":
        setActiveTab("community");
        break;
      case "documents":
        setActiveTab("documents");
        break;
      case "createCategory":
        setShowAddCategory(true);
        break;
      case "cacheQuestions":
        handleManualCache();
        break;
      case "offlineMode":
        navigate("/offline/questions");
        break;
      default:
        setActiveTab("categories");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 优化后的 initializeData 函数
  const initializeData = async () => {
    try {
      if (!offlineService.shouldUseOfflineData()) {
        initAV();
      }

      console.log("🔄 开始加载数据...");

      const [categoriesData, questionsData] = await Promise.all([
        getCategories({
          page: 1,
          pageSize: 50,
          sortBy: QueryOptions.SORT_BY_UPDATED_AT,
          sortOrder: "desc",
        }),
        getAllQuestions(false),
      ]);

      console.log("✅ 数据加载完成:", {
        分类数据: categoriesData.data.length,
        题目数据: questionsData.length,
        模式: offlineService.shouldUseOfflineData() ? "离线" : "在线",
      });

      setCategories(categoriesData.data);
      setQuestions(questionsData);
      setLoading(false);
    } catch (err) {
      console.error("❌ 初始化数据失败:", err);

      if (err.message.includes("offline") || err.message.includes("network")) {
        console.log("🌐 网络错误，切换到完全离线模式");
        setShowOfflineMode(true);

        try {
          const cacheData = await cacheService.getCachedQuestions();
          setOfflineQuestions(cacheData.questions);
          setCategories([]);
          setQuestions([]);
          setLoading(false);
          return;
        } catch (cacheError) {
          console.error("加载离线数据也失败:", cacheError);
        }
      }

      setError(err.message);
      setLoading(false);
    }
  };

  // 使用 useMemo 优化计算密集型操作
  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // 计算准确的分类题目数量统计
  const categoryStats = useMemo(() => {
    if (!categories.length) {
      return {
        totalCategories: 0,
        totalQuestions: 0,
        categoriesWithQuestions: 0,
      };
    }

    const totalQuestionsFromCategories = categories.reduce(
      (sum, cat) => sum + (cat.questionCount || 0),
      0
    );
    const categoriesWithQuestions = categories.filter(
      (cat) => (cat.questionCount || 0) > 0
    ).length;

    console.log("🔍 详细统计信息:", {
      分类总数: categories.length,
      基于分类的题目总数: totalQuestionsFromCategories,
      基于所有题目的题目总数: questions.length,
      差异: Math.abs(totalQuestionsFromCategories - questions.length),
      有题目的分类数: categoriesWithQuestions,
      对象: questions,
      各分类详情: categories.map((cat) => ({
        分类名称: cat.name,
        服务层题目数: cat.questionCount,
        前端计算题目数: questions.filter((q) => q.category?.id === cat.id)
          .length,
        是否匹配:
          cat.questionCount ===
          questions.filter((q) => q.category?.id === cat.id).length,
      })),
    });

    return {
      totalCategories: categories.length,
      totalQuestions: totalQuestionsFromCategories,
      categoriesWithQuestions: categoriesWithQuestions,
    };
  }, [categories, questions]);

  // 获取某一天的题目详情
  const getDayQuestions = useCallback(
    (date) => {
      const dateStr = date.toISOString().split("T")[0];

      const dayQuestions = questions.filter((question) => {
        const questionDate = new Date(question.createdAt);
        const questionDateStr = questionDate.toISOString().split("T")[0];
        return questionDateStr === dateStr;
      });

      return dayQuestions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    },
    [questions]
  );

  // 获取固定颜色
  const getDayColor = useCallback((count) => {
    if (count === 0) return "#f8f9fa";
    if (count <= 1) return "#4CAF50";
    if (count <= 3) return "#8BC34A";
    if (count <= 5) return "#FFC107";
    if (count <= 8) return "#FF9800";
    return "#F44336";
  }, []);

  // 生成月度日历数据
  const getMonthlyCalendarData = useCallback(() => {
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
  }, [selectedMonth, questions, getDayQuestions, getDayColor]);

  // 处理日历日期的鼠标悬停
  const handleDayMouseEnter = useCallback((dayData, event) => {
    setHoveredDay(dayData);
    setTooltipVisible(true);

    if (calendarRef.current) {
      const calendarRect = calendarRef.current.getBoundingClientRect();
      const dayRect = event.currentTarget.getBoundingClientRect();

      setTooltipPosition({
        x: dayRect.left + dayRect.width / 2 - calendarRect.left,
        y: dayRect.top - calendarRect.top - 10,
      });
    }

    setTooltipVisible(true);
  }, []);

  const handleDayMouseLeave = useCallback(() => {
    setTimeout(() => {
      if (!document.querySelector(".calendar-tooltip:hover")) {
        setTooltipVisible(false);
      }
    }, 100);
  }, []);

  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
    setHoveredDay(null);
  }, []);

  // 月份导航
  const navigateMonth = useCallback(
    (direction) => {
      const newDate = new Date(selectedMonth);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setSelectedMonth(newDate);
    },
    [selectedMonth]
  );

  // 获取月份统计
  const getMonthStats = useCallback(() => {
    const monthData = getMonthlyCalendarData();
    const daysWithQuestions = monthData.filter((day) => day.count > 0).length;
    const totalQuestions = monthData.reduce((sum, day) => sum + day.count, 0);
    const maxDaily = Math.max(...monthData.map((day) => day.count));

    return { daysWithQuestions, totalQuestions, maxDaily };
  }, [getMonthlyCalendarData]);

  const getCategoryChartData = useCallback(() => {
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
  }, [questions]);

  const getDifficultyData = useCallback(() => {
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
  }, [questions]);

  const getDifficultyColor = useCallback((difficulty) => {
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
  }, []);

  const getDifficultyText = useCallback((difficulty) => {
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
  }, []);

  const getActiveDays = useCallback(() => {
    const uniqueDays = new Set(
      questions.map((q) => new Date(q.createdAt).toDateString())
    );
    return uniqueDays.size;
  }, [questions]);

  const handleCategoryClick = useCallback(
    (categoryId) => {
      if (offlineService.shouldUseOfflineData()) {
        alert("离线模式下无法查看分类详情，请连接网络后重试");
        return;
      }
      navigate(`/category/${categoryId}`);
    },
    [navigate]
  );

  const handleQuestionClick = useCallback(
    (questionId) => {
      const question = questions.find((q) => q.id === questionId);
      if (question && question.category) {
        navigate(`/category/${question.category.id}`);
      }
    },
    [questions, navigate]
  );

  // 跳转到离线分类
  const navigateToOfflineCategory = useCallback((category) => {
    alert(
      `离线模式：查看 ${category.name} 分类的 ${category.questions.length} 道题目\n\n请连接网络后查看完整功能`
    );
  }, []);

  const formatTime = useCallback((date) => {
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
  }, []);

  const getProgressWidth = useCallback(
    (count) => {
      if (!categories.length) return 0;
      const maxCount = Math.max(...categories.map((c) => c.questionCount || 0));
      return maxCount > 0 ? (count / maxCount) * 100 : 0;
    },
    [categories]
  );

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

  // 使用 useMemo 缓存计算结果
  const chartData = useMemo(
    () => getCategoryChartData(),
    [getCategoryChartData]
  );
  const difficultyData = useMemo(
    () => getDifficultyData(),
    [getDifficultyData]
  );
  const calendarData = useMemo(
    () => getMonthlyCalendarData(),
    [getMonthlyCalendarData]
  );
  const activeDays = useMemo(() => getActiveDays(), [getActiveDays]);
  const monthStats = useMemo(() => getMonthStats(), [getMonthStats]);

  const monthName = useMemo(
    () =>
      selectedMonth.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
      }),
    [selectedMonth]
  );

  // 离线模式下的分类浏览
  const renderOfflineCategories = useCallback(() => {
    const categoryMap = {};
    offlineQuestions.forEach((question) => {
      const categoryName = question.category?.name || "未分类";
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          questions: [],
          questionCount: 0,
          id: `offline-${categoryName}`,
        };
      }
      categoryMap[categoryName].questions.push(question);
      categoryMap[categoryName].questionCount++;
    });

    const offlineCategories = Object.values(categoryMap);

    return (
      <section className="categories-section">
        <div className="container">
          <div className="offline-header">
            <h3 style={{ color: "#666666" }}>📦 离线模式</h3>
            <p style={{ color: "#666666" }}>
              当前处于离线状态，显示缓存的题目数据
            </p>

            <div className="cache-stats" style={{ color: "#666666" }}>
              已缓存 {offlineQuestions.length} 道题目，
              {offlineCategories.length} 个分类
            </div>

            <div className="offline-global-actions">
              <button
                onClick={() => navigate("/offline/questions")}
                className="view-all-offline-btn"
                style={{ color: "#333333" }}
              >
                📚 查看所有离线题目 ({offlineQuestions.length})
              </button>
              <button
                onClick={() => window.location.reload()}
                className="refresh-network-btn"
                style={{ color: "#333333" }}
              >
                🔄 检查网络连接
              </button>
            </div>

            <div
              className="cache-progress-fill"
              style={{
                width: `${
                  (offlineQuestions.length / cacheService.getCacheLimit()) * 100
                }%`,
              }}
            ></div>
          </div>

          <div className="categories-grid">
            {offlineCategories.map((category, index) => {
              const color = defaultColors[index % defaultColors.length];

              return (
                <div
                  key={category.id}
                  className="category-card offline-card"
                  onClick={() => navigateToOfflineCategory(category)}
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
                      <span className="question-count">
                        {category.questionCount}题
                      </span>
                    </div>
                    <div className="offline-badge">离线</div>
                  </div>

                  <div className="card-footer">
                    <div className="progress-info">
                      <div className="progress-stats">
                        <span>离线缓存数据</span>
                      </div>
                    </div>

                    <button className="explore-btn">查看题目 →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }, [offlineQuestions, navigateToOfflineCategory, navigate]);

  // 修改现有的渲染逻辑
  const renderContent = () => {
    if (showOfflineMode) {
      return renderOfflineCategories();
    }

    switch (activeTab) {
      case "categories":
        return renderCategoriesTab();
      case "review":
        return renderReviewTab();
      case "stats":
        return renderStatsTab();
      case "calendar":
        return renderCalendarTab();
      case "documents":
        return renderDocumentsTab();
      case "community":
        return renderCommunityTab();
      case 'cache':
        return (
          <CacheManagementTab 
            questions={questions}
            onCacheUpdate={setCacheStatus}
            currentUser={currentUser}
          />
        );
      default:
        return renderCategoriesTab();
    }
  };

  // 原有的标签页渲染函数
  const renderCategoriesTab = () => (
    <>
      <section className="filters-section">
        <div className="container">
          <div className="filters">
            <div className="stats">
              找到 {filteredCategories.length} 个类别
              {categories.length > 0 && ` • 总计 ${questions.length} 道题目`}
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
                  style={{ color: "black" }}
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
                  style={{ color: "black" }}
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
                  确定要删除分类 <strong>"{categoryToDelete.name}"</strong> 吗？
                </p>
                {categoryToDelete.questionCount > 0 && (
                  <p className="warning-text">
                    ⚠️ 此分类包含 {categoryToDelete.questionCount}{" "}
                    道题目，删除后这些题目将变为未分类状态！
                  </p>
                )}
                <p className="delete-hint">此操作不可撤销，请谨慎操作。</p>
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

                const actualQuestionCount = questions.filter(
                  (q) => q.category?.id === category.id
                ).length;

                const displayCount =
                  actualQuestionCount > 0
                    ? actualQuestionCount
                    : category.questionCount || 0;

                return (
                  <div
                    key={category.id}
                    ref={(el) => categoryRefs.current[`category-${category.id}`] = el}
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
                        <span className="question-count">{displayCount}题</span>
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
  );

  const renderReviewTab = () => (
    <ReviewReminderSection
      reviewQuestions={reviewQuestions}
      setReviewQuestions={setReviewQuestions}
      reviewThreshold={reviewThreshold}
      setReviewThreshold={setReviewThreshold}
      showReviewSettings={showReviewSettings}
      setShowReviewSettings={setShowReviewSettings}
      onQuestionClick={handleQuestionClick}
      onUpdateQuestionTime={handleUpdateQuestionTime}
      questions={questions}
    />
  );

  const renderStatsTab = () => (
    <section className="stats-section">
      <div className="container">
        <div className="stats-overview">
          <div className="modern-stat-card primary">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-number">{categoryStats.totalCategories}</div>
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
                {categoryStats.totalQuestions > 0
                  ? (categoryStats.totalQuestions / activeDays).toFixed(1)
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
                    label={({ name, percentage }) => `${name} ${percentage}%`}
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
                  <Tooltip formatter={(value, name) => [`${value} 题`, name]} />
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
                  <Tooltip formatter={(value) => [`${value} 题`, "数量"]} />
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
  );

  const renderCalendarTab = () => (
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
                    <div className="question-count-badge">{dayData.count}</div>
                  )}
                </div>
              ))}
            </div>

            <CalendarTooltip
              dayData={hoveredDay}
              position={tooltipPosition}
              isVisible={tooltipVisible}
              onClose={handleTooltipClose}
            />
          </div>

          <div className="calendar-stats">
            <div className="calendar-stat">
              <span className="stat-value">{monthStats.totalQuestions}</span>
              <span className="stat-label">本月题目</span>
            </div>
            <div className="calendar-stat">
              <span className="stat-value">{monthStats.daysWithQuestions}</span>
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
  );

  const renderDocumentsTab = () => (
    <section className="documents-tab-section">
      <div className="container">
        <Documents />
      </div>
    </section>
  );

  const renderCommunityTab = () => <CommunityPage />;

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
              <div className="feature-item">
                <span className="feature-icon">📦</span>
                <span>离线缓存题目</span>
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="homepage">
        <OfflineIndicator />

        <header className="hero-section">
          <div className="hero-content">
            <div className="user-welcome">
              <h1 className="hero-title">我的知识题库</h1>
              <p className="hero-subtitle">
                欢迎回来, {currentUser.getUsername()}！
                {!isOnline && (
                  <span className="offline-status"> • 离线模式</span>
                )}
              </p>
              <div className="cache-actions">
                {/* 缓存操作按钮 */}
              </div>
            </div>

            <div className="header-actions">
              <div className="search-container">
                {/* 搜索容器 */}
              </div>
             
              {showCacheSettings && <CacheSettingsModal />}
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

              <button
                className={`modern-tab ${
                  activeTab === "cache" ? "active" : ""
                }`}
                onClick={() => setActiveTab("cache")}
              >
                <span className="tab-icon">💾</span>
                <span className="tab-text">
                  缓存管理
                  {cacheStatus.hasCache && (
                    <span className="tab-badge">{cacheStatus.count}</span>
                  )}
                </span>
                {activeTab === "cache" && (
                  <div className="tab-indicator"></div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 同步状态消息 */}
        {syncMessage && <div className="sync-message">{syncMessage}</div>}

        {/* 主要内容区域 */}
        {renderContent()}

        {/* 修复底部统计 */}
        <footer className="footer-section">
          <div className="container">
            <div className="footer-stats">
              <div className="stat-item">
                <div className="stat-number">
                  {categoryStats.totalCategories}
                </div>
                <div className="stat-label">总类别数</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{questions.length}</div>
                <div className="stat-label">总题目数</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{cacheStatus.count || 0}</div>
                <div className="stat-label">缓存题目</div>
              </div>
            </div>
          </div>
        </footer>

        <Chatbox
          onNavigate={handleChatboxNavigate}
          onTriggerCategory={handleTriggerCategory}
          categories={categories}
          questions={questions}
          currentUser={currentUser}
          cacheStatus={cacheStatus}
          isOnline={isOnline}
        />
      </div>
    </QueryClientProvider>
  );
};

// 清理缓存的函数
const clearAllCache = () => {
  console.log("清理所有缓存");
};

const clearCategoryCache = () => {
  console.log("清理分类缓存");
};

export default HomePage;