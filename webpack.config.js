const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction 
        ? 'static/js/[name].[contenthash:8].js'
        : 'static/js/[name].js',
      chunkFilename: isProduction
        ? 'static/js/[name].[contenthash:8].chunk.js'
        : 'static/js/[name].chunk.js',
      publicPath: '/',
      clean: true
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
          exclude: /(node_modules|sw\.js)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: ['last 2 versions', 'not dead', 'not < 2%']
                  },
                  useBuiltIns: 'entry',
                  corejs: 3
                }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ],
              plugins: [
                isProduction && 'babel-plugin-transform-react-remove-prop-types'
              ].filter(Boolean)
            }
          }
        },
        
        // CSS 配置
        {
          test: /\.css$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: false,
                importLoaders: 1
              }
            }
          ]
        },
        
        // 图片资源
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024
            }
          },
          generator: {
            filename: 'static/media/[name].[hash:8][ext]'
          }
        },
        
        // 字体资源
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/fonts/[name].[hash:8][ext]'
          }
        }
      ]
    },
    
    plugins: [
      new CleanWebpackPlugin(),
      
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      
      // 复制静态文件 - 关键修复：确保文件被正确复制
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public/sw.js',
            to: 'sw.js',
            toType: 'file'
          },
          {
            from: 'public/offline.html',
            to: 'offline.html',
            toType: 'file'
          },
          {
            from: 'public/manifest.json',
            to: 'manifest.json',
            toType: 'file'
          },
          {
            from: 'public/favicon.ico',
            to: 'favicon.ico',
            toType: 'file'
          },
          {
            from: 'public/icons',
            to: 'icons',
            noErrorOnMissing: true,
            toType: 'dir'
          }
        ]
      }),
      
      new Dotenv({
        path: './.env',
        safe: false,
        systemvars: true,
        defaults: false
      }),
      
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
      }),

      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css'
        })
      ] : [])
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: {
        name: 'runtime'
      }
    },
    
    // 关键修复：修正 historyApiFallback 配置
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
        publicPath: '/',
        // 添加静态文件服务配置
        staticOptions: {
          setHeaders: (res, path) => {
            // 确保正确的 MIME 类型
            if (path.endsWith('.html')) {
              res.setHeader('Content-Type', 'text/html');
            } else if (path.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
            } else if (path.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css');
            } else if (path.endsWith('.json')) {
              res.setHeader('Content-Type', 'application/json');
            }
          }
        }
      },
      port: 3000,
      open: true,
      hot: true,
      // 关键修复：只对 SPA 路由进行回退，不干扰静态文件
      historyApiFallback: {
        rewrites: [
          // 排除已知的静态文件
          { from: /^\/sw\.js$/, to: '/sw.js' },
          { from: /^\/offline\.html$/, to: '/offline.html' },
          { from: /^\/manifest\.json$/, to: '/manifest.json' },
          { from: /^\/favicon\.ico$/, to: '/favicon.ico' },
          { from: /^\/icons\/.*$/, to: (context) => context.parsedUrl.pathname },
          { from: /^\/static\/.*$/, to: (context) => context.parsedUrl.pathname },
          // 其他所有路由返回 index.html（SPA 路由）
          { from: /./, to: '/index.html' }
        ]
      },
      compress: true,
      // 添加开发服务器配置，确保文件服务正确
      devMiddleware: {
        publicPath: '/',
        writeToDisk: false
      }
    },
    
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isProduction ? 'warning' : false
    }
  };
};