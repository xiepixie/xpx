/**
 * 动态生成字体 CSS
 *
 * 这个文件会生成一个包含字体定义的 CSS 字符串，
 * 使用 getPath() 函数确保字体 URL 包含正确的基础路径前缀。
 */

import { getPath } from '../lib/path.js'

// 生成字体 CSS
export function generateFontsCss() {
    return `
/* 字体定义 - 使用 getPath 函数处理路径 */
@font-face {
  font-family: 'Atkinson';
  src: url('${getPath('fonts/atkinson-regular.woff')}') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Atkinson';
  src: url('${getPath('fonts/atkinson-bold.woff')}') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`
}

export default generateFontsCss
