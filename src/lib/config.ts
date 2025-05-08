/**
 * 全局配置值，包括基础路径设置
 */

// 是否使用基础路径前缀
export const useBasePath: boolean = import.meta.env.PUBLIC_USE_BASE_PATH === true;

// 基础路径 (不包含前导斜杠和尾部斜杠)
export const basePath: string = import.meta.env.PUBLIC_BASE_PATH || 'xpx';

// 格式化的基础路径，带有前导斜杠
export const formattedBasePath: string = useBasePath && basePath ? `/${basePath}` : '';

// 用于客户端路由的完整基础URL
export const baseUrl: string = import.meta.env.BASE_URL || '/';