const fs = require('fs');
const path = require('path');

try {
  const manifestPath = path.resolve(__dirname, '../public/manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  // 移除可能的 BOM
  const cleanContent = manifestContent.replace(/^\uFEFF/, '');
  
  // 验证 JSON
  JSON.parse(cleanContent);
  console.log('✅ manifest.json 语法正确');
  
  // 检查引用的文件是否存在
  const manifest = JSON.parse(cleanContent);
  const publicDir = path.resolve(__dirname, '../public');
  
  if (manifest.icons) {
    manifest.icons.forEach(icon => {
      const iconPath = path.join(publicDir, icon.src);
      if (!fs.existsSync(iconPath)) {
        console.warn(`⚠️  警告: ${icon.src} 不存在于 public 目录`);
      }
    });
  }
  
} catch (error) {
  console.error('❌ manifest.json 错误:', error.message);
  process.exit(1);
}