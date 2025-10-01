const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

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
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: ['last 2 versions', 'not dead', 'not < 2%']
                  },
                  useBuiltIns: 'entry',
                  corejs: 3,
                  modules: false
                }],
                '@babel/preset-react'
              ],
              plugins: [
                isProduction && [
                  'babel-plugin-transform-react-remove-prop-types',
                  { removeImport: true }
                ]
              ].filter(Boolean)
            }
          }
        },
        
        // CSS 配置
        {
          test: /\.css$/i,
          use: [
            'style-loader',
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
        
        // SCSS/SASS 配置（如果需要）
        {
          test: /\.(scss|sass)$/i,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader'
          ]
        },
        
        // 图片资源
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8kb 以下转 base64
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
        },
        
        // 其他文件
        {
          test: /\.(pdf|doc|docx|xls|xlsx)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/files/[name].[hash:8][ext]'
          }
        }
      ]
    },
    
    plugins: [
      // 清理输出目录
      new CleanWebpackPlugin(),
      
      // HTML 模板
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
        } : false,
        templateParameters: {
          // 可以在这里注入 HTML 模板变量
        }
      }),
      
      // 环境变量注入
      new Dotenv({
        path: './.env',
        safe: false, // 如果 .env 文件不存在也不报错
        systemvars: true, // 同时读取系统环境变量
        defaults: false,
        expand: true, // 支持变量扩展
        silent: false // 显示加载信息
      }),
      
      // 手动定义一些构建时常量（备用）
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.PUBLIC_URL': JSON.stringify('/')
      }),
      
      // 生产环境优化插件
      ...(isProduction ? [
        // 可以添加其他生产环境插件
      ] : [])
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // 第三方库单独打包
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20
          },
          // 公共代码单独打包
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
        name: entrypoint => `runtime-${entrypoint.name}`
      }
    },
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      port: 3000,
      open: true,
      hot: true,
      historyApiFallback: {
        disableDotRule: true,
        index: '/'
      },
      compress: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      }
    },
    
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isProduction ? 'warning' : false
    },
    
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }
  };
};