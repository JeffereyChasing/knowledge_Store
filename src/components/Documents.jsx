// Documents.jsx
import React, { useState, useEffect } from 'react';
import './Documents.css';

const Documents = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // 技术名言数据
  const techQuotes = [
    {
      text: "任何足够先进的技术都与魔法无异。",
      author: "亚瑟·C·克拉克",
      category: "科技哲学"
    },
    {
      text: "代码就像是幽默，当你需要解释它时，它就不再有趣了。",
      author: "Cory House",
      category: "编程"
    },
    {
      text: "首先，解决问题。然后，编写代码。",
      author: "John Johnson",
      category: "开发方法"
    },
    {
      text: "编程不是关于你知道什么，而是关于你能弄清楚什么。",
      author: "Chris Pine",
      category: "学习"
    },
    {
      text: "简单性是可靠性的先决条件。",
      author: "Edsger W. Dijkstra",
      category: "软件工程"
    },
    {
      text: "测试只能证明 bug 的存在，而不能证明它们的不存在。",
      author: "Edsger W. Dijkstra",
      category: "测试"
    },
    {
      text: "最好的错误信息是根本不需要错误信息。",
      author: "Jef Raskin",
      category: "用户体验"
    },
    {
      text: "过早优化是万恶之源。",
      author: "Donald Knuth",
      category: "性能优化"
    },
    {
      text: "代码的阅读次数远多于编写次数。",
      author: "Guido van Rossum",
      category: "代码质量"
    },
    {
      text: "完美不是在没有东西可加时达到的，而是在没有东西可拿走时达到的。",
      author: "Antoine de Saint-Exupéry",
      category: "设计"
    },
    {
      text: "计算机科学的核心是解决问题。",
      author: "Abelson and Sussman",
      category: "计算机科学"
    },
    {
      text: "未来已经到来，只是分布不均。",
      author: "William Gibson",
      category: "科技创新"
    },
    {
      text: "最危险的代码是你看不到问题的代码。",
      author: "Douglas Crockford",
      category: "代码安全"
    },
    {
      text: "编程是理解的艺术。",
      author: "Kristen Nygaard",
      category: "编程哲学"
    },
    {
      text: "技术应该改善生活，而不是支配生活。",
      author: "Tim Cook",
      category: "科技伦理"
    }
  ];

  // 自动轮播名言
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => 
        prevIndex === techQuotes.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // 每5秒切换一次

    return () => clearInterval(interval);
  }, [techQuotes.length]);

  // 手动切换名言
  const nextQuote = () => {
    setCurrentQuoteIndex((prevIndex) => 
      prevIndex === techQuotes.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevQuote = () => {
    setCurrentQuoteIndex((prevIndex) => 
      prevIndex === 0 ? techQuotes.length - 1 : prevIndex - 1
    );
  };

  // 扩展的知名文档数据（专注于前端和后端）
  const documents = [
    // 前端框架
    {
      id: 1,
      title: 'React 官方文档',
      description: '用于构建用户界面的 JavaScript 库',
      category: '前端框架',
      url: 'https://react.dev',
      icon: '⚛️'
    },
    {
      id: 2,
      title: 'Vue.js 文档',
      description: '渐进式 JavaScript 框架',
      category: '前端框架',
      url: 'https://vuejs.org',
      icon: '🟢'
    },
    {
      id: 3,
      title: 'Angular 文档',
      description: 'Google 开发的前端框架',
      category: '前端框架',
      url: 'https://angular.io',
      icon: '🅰️'
    },
    {
      id: 4,
      title: 'Svelte 文档',
      description: '编译时框架，无虚拟DOM',
      category: '前端框架',
      url: 'https://svelte.dev',
      icon: '⚡'
    },
    {
      id: 5,
      title: 'SolidJS 文档',
      description: '用于构建用户界面的声明式 JavaScript 库',
      category: '前端框架',
      url: 'https://solidjs.com',
      icon: '🔷'
    },
    {
      id: 6,
      title: 'Next.js 文档',
      description: 'React 全栈框架',
      category: '前端框架',
      url: 'https://nextjs.org',
      icon: '⏭️'
    },
    {
      id: 7,
      title: 'Nuxt.js 文档',
      description: 'Vue.js 全栈框架',
      category: '前端框架',
      url: 'https://nuxtjs.org',
      icon: '🔥'
    },

    // 前端状态管理
    {
      id: 8,
      title: 'Redux 文档',
      description: 'JavaScript 应用状态容器',
      category: '前端状态管理',
      url: 'https://redux.js.org',
      icon: '📦'
    },
    {
      id: 9,
      title: 'Zustand 文档',
      description: '小型、快速、可扩展的状态管理',
      category: '前端状态管理',
      url: 'https://github.com/pmndrs/zustand',
      icon: '🐻'
    },
    {
      id: 10,
      title: 'MobX 文档',
      description: '简单、可扩展的状态管理',
      category: '前端状态管理',
      url: 'https://mobx.js.org',
      icon: '🔄'
    },
    {
      id: 11,
      title: 'Vuex 文档',
      description: 'Vue.js 的状态管理库',
      category: '前端状态管理',
      url: 'https://vuex.vuejs.org',
      icon: '🏪'
    },

    // CSS 框架和预处理器
    {
      id: 12,
      title: 'Tailwind CSS 文档',
      description: '实用优先的 CSS 框架',
      category: 'CSS 框架',
      url: 'https://tailwindcss.com',
      icon: '🎨'
    },
    {
      id: 13,
      title: 'Bootstrap 文档',
      description: '最流行的前端框架',
      category: 'CSS 框架',
      url: 'https://getbootstrap.com',
      icon: '🎯'
    },
    {
      id: 14,
      title: 'Sass 文档',
      description: '专业级 CSS 扩展语言',
      category: 'CSS 框架',
      url: 'https://sass-lang.com',
      icon: '💎'
    },
    {
      id: 15,
      title: 'Less 文档',
      description: 'CSS 预处理器',
      category: 'CSS 框架',
      url: 'http://lesscss.org',
      icon: '➖'
    },
    {
      id: 16,
      title: 'Styled Components',
      description: 'CSS-in-JS 样式库',
      category: 'CSS 框架',
      url: 'https://styled-components.com',
      icon: '💅'
    },

    // 前端构建工具
    {
      id: 17,
      title: 'Webpack 文档',
      description: '模块打包工具',
      category: '前端构建工具',
      url: 'https://webpack.js.org',
      icon: '📦'
    },
    {
      id: 18,
      title: 'Vite 文档',
      description: '下一代前端构建工具',
      category: '前端构建工具',
      url: 'https://vitejs.dev',
      icon: '⚡'
    },
    {
      id: 19,
      title: 'Parcel 文档',
      description: '零配置构建工具',
      category: '前端构建工具',
      url: 'https://parceljs.org',
      icon: '📮'
    },
    {
      id: 20,
      title: 'Rollup 文档',
      description: 'JavaScript 模块打包器',
      category: '前端构建工具',
      url: 'https://rollupjs.org',
      icon: '🔄'
    },

    // 前端测试
    {
      id: 21,
      title: 'Jest 文档',
      description: 'JavaScript 测试框架',
      category: '前端测试',
      url: 'https://jestjs.io',
      icon: '🎭'
    },
    {
      id: 22,
      title: 'Cypress 文档',
      description: '端到端测试框架',
      category: '前端测试',
      url: 'https://docs.cypress.io',
      icon: '🎯'
    },
    {
      id: 23,
      title: 'Testing Library',
      description: 'DOM 测试工具库',
      category: '前端测试',
      url: 'https://testing-library.com',
      icon: '🧪'
    },
    {
      id: 24,
      title: 'Vitest 文档',
      description: '基于 Vite 的测试框架',
      category: '前端测试',
      url: 'https://vitest.dev',
      icon: '⚡'
    },

    // 后端框架 (Node.js)
    {
      id: 25,
      title: 'Express.js 文档',
      description: 'Node.js Web 应用框架',
      category: '后端框架',
      url: 'https://expressjs.com',
      icon: '🚂'
    },
    {
      id: 26,
      title: 'Koa 文档',
      description: '下一代 Node.js 框架',
      category: '后端框架',
      url: 'https://koajs.com',
      icon: '🎋'
    },
    {
      id: 27,
      title: 'NestJS 文档',
      description: '用于构建高效、可扩展的服务器端应用',
      category: '后端框架',
      url: 'https://nestjs.com',
      icon: '🪺'
    },
    {
      id: 28,
      title: 'Fastify 文档',
      description: '快速且低开销的 Web 框架',
      category: '后端框架',
      url: 'https://fastify.io',
      icon: '🚀'
    },
    {
      id: 29,
      title: 'Hapi 文档',
      description: '丰富的框架用于构建应用和服务',
      category: '后端框架',
      url: 'https://hapi.dev',
      icon: '🎯'
    },

    // 后端框架 (Python)
    {
      id: 30,
      title: 'Django 文档',
      description: 'Python Web 框架',
      category: '后端框架',
      url: 'https://docs.djangoproject.com',
      icon: '🎸'
    },
    {
      id: 31,
      title: 'Flask 文档',
      description: 'Python 微框架',
      category: '后端框架',
      url: 'https://flask.palletsprojects.com',
      icon: '🍶'
    },
    {
      id: 32,
      title: 'FastAPI 文档',
      description: '现代、快速的 Python Web 框架',
      category: '后端框架',
      url: 'https://fastapi.tiangolo.com',
      icon: '⚡'
    },

    // 后端框架 (Java)
    {
      id: 33,
      title: 'Spring 文档',
      description: 'Java 应用框架',
      category: '后端框架',
      url: 'https://spring.io/docs',
      icon: '🌱'
    },
    {
      id: 34,
      title: 'Spring Boot 文档',
      description: '简化 Spring 应用开发',
      category: '后端框架',
      url: 'https://spring.io/projects/spring-boot',
      icon: '👢'
    },

    // 后端框架 (其他语言)
    {
      id: 35,
      title: 'Laravel 文档',
      description: 'PHP Web 应用框架',
      category: '后端框架',
      url: 'https://laravel.com/docs',
      icon: '🔨'
    },
    {
      id: 36,
      title: 'Ruby on Rails 文档',
      description: 'Ruby Web 应用框架',
      category: '后端框架',
      url: 'https://rubyonrails.org',
      icon: '💎'
    },
    {
      id: 37,
      title: 'ASP.NET Core 文档',
      description: '.NET Web 框架',
      category: '后端框架',
      url: 'https://docs.microsoft.com/aspnet/core',
      icon: '🌐'
    },
    {
      id: 38,
      title: 'Gin 文档',
      description: 'Go 语言 Web 框架',
      category: '后端框架',
      url: 'https://gin-gonic.com',
      icon: '🍸'
    },

    // 数据库和 ORM
    {
      id: 39,
      title: 'MySQL 文档',
      description: 'MySQL 数据库官方文档',
      category: '数据库',
      url: 'https://dev.mysql.com/doc',
      icon: '🐬'
    },
    {
      id: 40,
      title: 'PostgreSQL 文档',
      description: 'PostgreSQL 数据库文档',
      category: '数据库',
      url: 'https://www.postgresql.org/docs',
      icon: '🐘'
    },
    {
      id: 41,
      title: 'MongoDB 文档',
      description: 'MongoDB NoSQL 数据库文档',
      category: '数据库',
      url: 'https://docs.mongodb.com',
      icon: '🍃'
    },
    {
      id: 42,
      title: 'Redis 文档',
      description: 'Redis 内存数据结构存储',
      category: '数据库',
      url: 'https://redis.io/documentation',
      icon: '🔴'
    },
    {
      id: 43,
      title: 'Prisma 文档',
      description: '下一代 Node.js TypeScript ORM',
      category: '数据库',
      url: 'https://www.prisma.io',
      icon: '🛡️'
    },
    {
      id: 44,
      title: 'Sequelize 文档',
      description: 'Node.js 的 ORM',
      category: '数据库',
      url: 'https://sequelize.org',
      icon: '🗄️'
    },
    {
      id: 45,
      title: 'Mongoose 文档',
      description: 'MongoDB 对象建模工具',
      category: '数据库',
      url: 'https://mongoosejs.com',
      icon: '🐍'
    },

    // API 和微服务
    {
      id: 46,
      title: 'GraphQL 文档',
      description: 'API 查询语言',
      category: 'API 和微服务',
      url: 'https://graphql.org',
      icon: '📈'
    },
    {
      id: 47,
      title: 'Apollo 文档',
      description: 'GraphQL 平台',
      category: 'API 和微服务',
      url: 'https://www.apollographql.com',
      icon: '🚀'
    },
    {
      id: 48,
      title: 'Swagger 文档',
      description: 'API 设计和文档工具',
      category: 'API 和微服务',
      url: 'https://swagger.io',
      icon: '📝'
    },
    {
      id: 49,
      title: 'gRPC 文档',
      description: '高性能 RPC 框架',
      category: 'API 和微服务',
      url: 'https://grpc.io',
      icon: '🔧'
    },
    {
      id: 50,
      title: 'RESTful API 指南',
      description: 'REST API 最佳实践',
      category: 'API 和微服务',
      url: 'https://restfulapi.net',
      icon: '🌐'
    },

    // 认证和授权
    {
      id: 51,
      title: 'JWT 文档',
      description: 'JSON Web Tokens 官方文档',
      category: '认证和授权',
      url: 'https://jwt.io',
      icon: '🔐'
    },
    {
      id: 52,
      title: 'OAuth 2.0 指南',
      description: 'OAuth 2.0 授权框架',
      category: '认证和授权',
      url: 'https://oauth.net/2',
      icon: '🔑'
    },
    {
      id: 53,
      title: 'Passport.js 文档',
      description: 'Node.js 认证中间件',
      category: '认证和授权',
      url: 'http://www.passportjs.org',
      icon: '🛂'
    },
    {
      id: 54,
      title: 'Auth0 文档',
      description: '身份验证和授权平台',
      category: '认证和授权',
      url: 'https://auth0.com/docs',
      icon: '🔒'
    },

    // 部署和 DevOps
    {
      id: 55,
      title: 'Docker 文档',
      description: '容器化平台文档',
      category: '部署和 DevOps',
      url: 'https://docs.docker.com',
      icon: '🐳'
    },
    {
      id: 56,
      title: 'Kubernetes 文档',
      description: '容器编排系统文档',
      category: '部署和 DevOps',
      url: 'https://kubernetes.io/docs',
      icon: '⚓'
    },
    {
      id: 57,
      title: 'PM2 文档',
      description: 'Node.js 进程管理器',
      category: '部署和 DevOps',
      url: 'https://pm2.keymetrics.io',
      icon: '🔄'
    },
    {
      id: 58,
      title: 'Nginx 文档',
      description: 'Web 服务器和反向代理',
      category: '部署和 DevOps',
      url: 'https://nginx.org/en/docs',
      icon: '🔧'
    },

    // 编程语言
    {
      id: 59,
      title: 'TypeScript 文档',
      description: 'TypeScript 语言文档',
      category: '编程语言',
      url: 'https://www.typescriptlang.org',
      icon: '🔷'
    },
    {
      id: 60,
      title: 'JavaScript MDN',
      description: 'JavaScript 语言参考文档',
      category: '编程语言',
      url: 'https://developer.mozilla.org/javascript',
      icon: '📜'
    },
    {
      id: 61,
      title: 'Python 官方文档',
      description: 'Python 编程语言官方文档',
      category: '编程语言',
      url: 'https://docs.python.org',
      icon: '🐍'
    },
    {
      id: 62,
      title: 'Node.js 文档',
      description: 'Node.js 运行时文档',
      category: '编程语言',
      url: 'https://nodejs.org',
      icon: '📦'
    },

    // 工具和包管理
    {
      id: 63,
      title: 'Git 文档',
      description: '分布式版本控制系统',
      category: '开发工具',
      url: 'https://git-scm.com/doc',
      icon: '📚'
    },
    {
      id: 64,
      title: 'NPM 文档',
      description: 'Node 包管理器文档',
      category: '开发工具',
      url: 'https://docs.npmjs.com',
      icon: '📦'
    },
    {
      id: 65,
      title: 'Yarn 文档',
      description: '快速、可靠、安全的依赖管理',
      category: '开发工具',
      url: 'https://yarnpkg.com',
      icon: '🧶'
    },
    {
      id: 66,
      title: 'VS Code 文档',
      description: 'Visual Studio Code 编辑器文档',
      category: '开发工具',
      url: 'https://code.visualstudio.com/docs',
      icon: '💻'
    },

    // 性能和优化
    {
      id: 67,
      title: 'Lighthouse 文档',
      description: '自动化网站质量评估工具',
      category: '性能和优化',
      url: 'https://developers.google.com/web/tools/lighthouse',
      icon: '💡'
    },
    {
      id: 68,
      title: 'Web Vitals',
      description: '网站用户体验质量指标',
      category: '性能和优化',
      url: 'https://web.dev/vitals',
      icon: '📊'
    },
    {
      id: 69,
      title: 'Bundlephobia',
      description: '检查 npm 包大小对性能的影响',
      category: '性能和优化',
      url: 'https://bundlephobia.com',
      icon: '📦'
    }
  ];

  // 按类别分组
  const categories = [...new Set(documents.map(doc => doc.category))];

  // 过滤文档
  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDocClick = (doc) => {
    setSelectedDoc(doc);
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
  };

  const handleVisitSite = () => {
    if (selectedDoc) {
      window.open(selectedDoc.url, '_blank');
    }
  };

  return (
    <div className="documents-container">
      {/* 技术名言轮播屏 */}
      <div className="quotes-carousel">
        <div className="carousel-container">
          <button className="carousel-btn prev-btn" onClick={prevQuote}>
            ‹
          </button>
          
          <div className="quote-slide">
            <div className="quote-content">
              <div className="quote-icon">💭</div>
              <div className="quote-text">
                <p className="quote-main">"{techQuotes[currentQuoteIndex].text}"</p>
                <div className="quote-meta">
                  <span className="quote-author">— {techQuotes[currentQuoteIndex].author}</span>
                  <span className="quote-category">{techQuotes[currentQuoteIndex].category}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button className="carousel-btn next-btn" onClick={nextQuote}>
            ›
          </button>
        </div>
        
        <div className="carousel-indicators">
          {techQuotes.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentQuoteIndex ? 'active' : ''}`}
              onClick={() => setCurrentQuoteIndex(index)}
            />
          ))}
        </div>
      </div>

      <div className="documents-header">
        <h1>📚 开发文档库</h1>
        <p>专注于前端和后端开发文档 - 共 {documents.length} 个资源</p>
        
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索文档名称、描述或类别..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="documents-content">
        {categories.map(category => {
          const categoryDocs = filteredDocs.filter(doc => doc.category === category);
          
          if (categoryDocs.length === 0) return null;
          
          return (
            <div key={category} className="category-section">
              <h2 className="category-title">
                {category} 
                <span className="category-count">({categoryDocs.length})</span>
              </h2>
              <div className="documents-grid">
                {categoryDocs.map(doc => (
                  <div
                    key={doc.id}
                    className="document-card"
                    onClick={() => handleDocClick(doc)}
                  >
                    <div className="doc-header">
                      <div className="doc-icon">{doc.icon}</div>
                      <div className="doc-info">
                        <h3 className="doc-title">{doc.title}</h3>
                        <p className="doc-description">{doc.description}</p>
                        <div className="doc-category">{doc.category}</div>
                      </div>
                    </div>
                    
                    <div className="doc-footer">
                      <button className="visit-button">
                        访问网站 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>未找到匹配的文档</h3>
            <p>尝试调整搜索关键词</p>
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              清除搜索
            </button>
          </div>
        )}
      </div>

      {/* 文档详情模态框 */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <span className="doc-modal-icon">{selectedDoc.icon}</span>
                <div>
                  <h3>{selectedDoc.title}</h3>
                  <span className="doc-category-badge">{selectedDoc.category}</span>
                </div>
              </div>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="doc-modal-description">{selectedDoc.description}</p>
              
              <div className="doc-url-section">
                <label>网站地址:</label>
                <div className="url-display">
                  <span className="url-text">{selectedDoc.url}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCloseModal}>
                关闭
              </button>
              <button className="visit-site-btn" onClick={handleVisitSite}>
                🌐 访问网站
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;