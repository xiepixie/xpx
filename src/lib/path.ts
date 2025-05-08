/**
 * 这个文件是为了兼容性而保留的。
 * 实际实现已经移动到 path.js 中。
 *
 * 警告：不要在 path.js 中导入这个文件，以避免循环依赖。
 */

import * as pathUtils from './path.js';

/**
 * 获取基于设置的 base 路径的完整链接
 * @param path 相对路径，可以包含或不包含前导斜杠
 * @param debug 是否输出调试信息
 * @returns 完整的链接路径
 */
export function getPath(path: string, debug = false): string {
  return pathUtils.getPath(path, debug);
}

/**
 * 获取完整URL
 * @param path 相对路径
 * @param baseUrl 基础URL，默认为环境变量中的SITE_URL
 * @param debug 是否输出调试信息
 * @returns 完整URL
 */
export function getFullUrl(path: string, baseUrl?: string, debug = false): string {
  return pathUtils.getFullUrl(path, baseUrl, debug);
}

/**
 * 检查路径是否为外部链接
 * @param path 要检查的路径
 * @param debug 是否输出调试信息
 * @returns 是否为外部链接
 */
export function isExternalLink(path: string, debug = false): boolean {
  return pathUtils.isExternalLink(path, debug);
}

/**
 * 获取相对路径
 * @param path 原始路径
 * @param debug 是否输出调试信息
 * @returns 相对路径
 */
export function getRelativePath(path: string, debug = false): string {
  return pathUtils.getRelativePath(path, debug);
}