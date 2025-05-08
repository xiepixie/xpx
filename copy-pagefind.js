/**
 * 复制Pagefind文件到正确位置的脚本
 *
 * 这个脚本会将dist/pagefind目录复制到public/pagefind，
 * 以便在开发和预览模式下能够正确加载Pagefind文件。
 */

import fs from 'fs';
import path from 'path';

// 源目录和目标目录
const sourceDir = path.join(process.cwd(), 'dist', 'pagefind');
const targetDir = path.join(process.cwd(), 'public', 'pagefind');

/**
 * 复制目录及其内容
 * @param {string} source - 源目录
 * @param {string} target - 目标目录
 */
function copyDir(source, target) {
  // 如果目标目录不存在，创建它
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // 读取源目录中的所有文件和子目录
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    // 如果是目录，递归复制
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      // 如果是文件，直接复制
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// 检查源目录是否存在
if (!fs.existsSync(sourceDir)) {
  console.error(`错误: 源目录 ${sourceDir} 不存在。请先运行 pnpm run build 命令。`);
  process.exit(1);
}

// 检查源目录中是否有必要的文件
const requiredFiles = ['pagefind.js', 'pagefind-ui.js', 'pagefind-ui.css', 'pagefind-highlight.js'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(sourceDir, file)));

if (missingFiles.length > 0) {
  console.warn(`警告: 源目录中缺少以下文件: ${missingFiles.join(', ')}`);
  console.warn('这可能会导致搜索功能在某些情况下无法正常工作。');
  console.warn('继续复制可用文件...');
}

// 如果目标目录已存在，先删除它
if (fs.existsSync(targetDir)) {
  console.log(`删除已存在的目标目录: ${targetDir}`);
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// 复制目录
try {
  console.log(`正在将 ${sourceDir} 复制到 ${targetDir}...`);
  copyDir(sourceDir, targetDir);
  console.log('复制完成!');
} catch (error) {
  console.error('复制过程中出错:', error);
  process.exit(1);
}
