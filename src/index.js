import "core-js/stable";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <div className="scaled-container">
    <React.StrictMode>
      <App />
    </React.StrictMode>
    </div>
);

// 注册 Service Worker - 开发环境禁用版
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    // 开发环境不注册 Service Worker
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.port === "3000" ||
      window.location.port === "3001";

    if (isDevelopment) {
      //("🔧 开发模式 - 跳过 Service Worker 注册");

      // 清理可能已存在的 Service Worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        //("✅ 已卸载开发环境 Service Worker");
      }
      return;
    }

    try {
      // 生产环境：检查并注册 Service Worker
      const response = await fetch("/sw.js");
      if (!response.ok) {
        throw new Error(`sw.js not found: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("javascript")) {
        throw new Error(`Invalid MIME type: ${contentType}`);
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      //("SW registered successfully: ", registration);
    } catch (error) {
      //("SW registration failed: ", error);
    }
  });
}
