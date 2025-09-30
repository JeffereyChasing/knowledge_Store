// webpack.dev.js
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3001,
    hot: true,
    open: true,
    historyApiFallback: {
      disableDotRule: true, // 修复点规则问题
      htmlAcceptHeaders: ['text/html'], // 明确接受头
    },
    client: {
      overlay: {
        warnings: false,
        errors: true
      }
    },
    // 添加静态文件服务配置
    static: {
      directory: path.join(__dirname, 'dist'),
      staticOptions: {
        etag: false // 禁用 etag 可能解决某些缓存问题
      },
      // 修复目录列表问题
      serveIndex: false // 禁用目录索引
    }
  }
});