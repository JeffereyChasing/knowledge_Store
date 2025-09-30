// src/config/env.js
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    leanCloudAppId: 'your-dev-app-id',
    leanCloudAppKey: 'your-dev-app-key'
  },
  production: {
    apiBaseUrl: 'https://your-domain.com/api',
    leanCloudAppId: 'your-prod-app-id',
    leanCloudAppKey: 'your-prod-app-key'
  }
};

export default config[env];