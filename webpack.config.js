// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack'); // 添加这行

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['last 2 versions']
                },
                useBuiltIns: 'entry',
                corejs: 3
              }],
              '@babel/preset-react'
            ]
          }
        }
      },
      // 修复的 CSS 配置
      {
        test: /\.css$/i,
        use: [
          {
            loader: 'style-loader',
            options: {
              injectType: 'styleTag'
            }
          },
          {
            loader: 'css-loader',
            options: {
              modules: false,
              importLoaders: 1,
              esModule: false
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash:8][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]'
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
      minify: false // 开发环境先禁用压缩，避免其他问题
    }),
    new webpack.DefinePlugin({
      // 注入环境变量到浏览器环境
      'process.env.REACT_APP_LC_APP_ID': JSON.stringify(process.env.REACT_APP_LC_APP_ID ),
      'process.env.REACT_APP_LC_APP_KEY': JSON.stringify(process.env.REACT_APP_LC_APP_KEY),
      'process.env.REACT_APP_LC_SERVER_URL': JSON.stringify(process.env.REACT_APP_LC_SERVER_URL)
    }),
  ]
};