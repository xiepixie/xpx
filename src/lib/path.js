/**
 * 路径处理工具 - 根据环境变量动态处理路径
 *
 * 环境变量:
 * - PUBLIC_USE_BASE_PATH: 是否使用基础路径前缀 (true/false)
 * - PUBLIC_BASE_PATH: 基础路径 (不包含前导斜杠和尾部斜杠)
 */

// 缓存基础路径，避免重复计算
let cachedBasePath = null
let cachedBaseUrl = null

/**
 * 解析布尔值环境变量
 * @param {any} value - 环境变量值
 * @returns {boolean} - 解析后的布尔值
 */
function parseBooleanEnv(value) {
    return value === 'true' || value === true || value === '1'
}

/**
 * 获取基础URL路径
 * @param {boolean} [debug=false] - 是否输出调试信息
 * @returns {string} - 基础URL路径，如 "/" 或 "/base-path/"
 */
function getBasePath(debug = false) {
    // 如果已经缓存了基础路径，直接返回
    if (cachedBasePath !== null) {
        if (debug) console.log(`[getBasePath] 使用缓存的基础路径: ${cachedBasePath}`)
        return cachedBasePath
    }

    let useBasePath
    let basePath

    // 在客户端，使用 import.meta.env
    if (typeof window !== 'undefined') {
        // 客户端环境
        useBasePath = parseBooleanEnv(import.meta.env.PUBLIC_USE_BASE_PATH)
        basePath = import.meta.env.PUBLIC_BASE_PATH || ''

        if (debug) {
            console.log(`[getBasePath] 客户端环境: useBasePath=${useBasePath}, basePath=${basePath}`)
        }
    } else {
        // 服务器端环境
        useBasePath = parseBooleanEnv(process.env.PUBLIC_USE_BASE_PATH)
        basePath = process.env.PUBLIC_BASE_PATH || ''

        if (debug) {
            console.log(`[getBasePath] 服务器端环境: useBasePath=${useBasePath}, basePath=${basePath}`)
        }
    }

    // 计算并缓存基础路径
    cachedBasePath = useBasePath && basePath ? `/${basePath}/` : '/'

    if (debug) {
        console.log(`[getBasePath] 计算的基础路径: ${cachedBasePath}`)
    }

    return cachedBasePath
}

/**
 * 处理路径，添加基础路径前缀
 * @param {string} path - 原始路径
 * @param {boolean} [debug=false] - 是否输出调试信息
 * @returns {string} - 处理后的路径
 */
export function getPath(path, debug = false) {
    // 快速路径：如果是外部链接或空路径，直接返回
    if (!path) {
        const result = getBasePath(debug);
        if (debug) console.log(`[getPath] 空路径 -> ${result}`);
        return result;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        if (debug) console.log(`[getPath] 完整URL -> ${path}`);
        return path;
    }

    if (debug) {
        console.log(`[getPath] 输入: ${path}`);
    }

    // 处理特殊情况：如果路径已经包含 /xpx/ 前缀，移除它以避免重复
    if (path.startsWith('/xpx/') || path.startsWith('xpx/')) {
        const pathWithoutPrefix = path.startsWith('/xpx/') ? path.substring(5) : path.substring(4);
        if (debug) console.log(`[getPath] 检测到硬编码的xpx前缀，移除: ${path} -> ${pathWithoutPrefix}`);
        // 递归调用，但不带前缀
        return getPath(pathWithoutPrefix, debug);
    }

    const basePath = getBasePath(debug);

    // 处理 public/ 前缀
    let normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    if (normalizedPath.startsWith('public/')) {
        normalizedPath = normalizedPath.substring(7);
        if (debug) console.log(`[getPath] 移除public/前缀: ${normalizedPath}`);
    }

    // 快速路径：如果基础路径是根路径，只需确保路径以斜杠开头
    if (basePath === '/') {
        const result = `/${normalizedPath}`;
        if (debug) console.log(`[getPath] 根路径 -> ${result}`);
        return result;
    }

    // 组合路径
    const result = `${basePath}${normalizedPath}`;
    if (debug) console.log(`[getPath] 最终路径 -> ${result}`);
    return result;
}

/**
 * 获取完整URL
 * @param {string} path - 相对路径
 * @param {string} [baseUrl] - 基础URL，默认为环境变量中的SITE_URL
 * @param {boolean} [debug=false] - 是否输出调试信息
 * @returns {string} - 完整URL
 */
export function getFullUrl(path, baseUrl, debug = false) {
    // 如果已经是完整URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        if (debug) console.log(`[getFullUrl] 完整URL -> ${path}`);
        return path;
    }

    if (debug) {
        console.log(`[getFullUrl] 输入: path=${path}, baseUrl=${baseUrl || '未提供'}`);
    }

    // 获取基础URL（使用缓存）
    if (!baseUrl && cachedBaseUrl === null) {
        cachedBaseUrl =
            (typeof process !== 'undefined'
                ? process.env.SITE_URL
                : import.meta.env.SITE_URL) || '';

        if (debug) {
            console.log(`[getFullUrl] 缓存基础URL: ${cachedBaseUrl}`);
        }
    }

    const base = baseUrl || cachedBaseUrl;

    // 处理路径
    const processedPath = getPath(path, debug);

    // 如果没有基础URL，返回处理后的路径
    if (!base) {
        if (debug) console.log(`[getFullUrl] 无基础URL，返回处理后的路径: ${processedPath}`);
        return processedPath;
    }

    // 规范化基础URL和路径
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const normalizedPath = processedPath.startsWith('/')
        ? processedPath.substring(1)
        : processedPath;

    // 组合URL
    const result = `${normalizedBase}${normalizedPath}`;
    if (debug) console.log(`[getFullUrl] 最终URL: ${result}`);
    return result;
}

/**
 * 检查路径是否为外部链接
 * @param {string} path - 要检查的路径
 * @param {boolean} [debug=false] - 是否输出调试信息
 * @returns {boolean} - 是否为外部链接
 */
export function isExternalLink(path, debug = false) {
    const isExternal = path &&
        (path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('//'));

    if (debug && isExternal) {
        console.log(`[isExternalLink] 检测到外部链接: ${path}`);
    }

    return isExternal;
}

/**
 * 获取相对路径
 * @param {string} path - 原始路径
 * @param {boolean} [debug=false] - 是否输出调试信息
 * @returns {string} - 相对路径
 */
export function getRelativePath(path, debug = false) {
    // 如果是外部链接，直接返回
    if (isExternalLink(path, debug)) {
        if (debug) console.log(`[getRelativePath] 外部链接，直接返回: ${path}`);
        return path;
    }

    if (debug) {
        console.log(`[getRelativePath] 输入: ${path}`);
    }

    // 获取基础路径
    const basePath = getBasePath(debug);

    // 如果路径已经包含基础路径，移除它
    if (basePath !== '/' && path.startsWith(basePath)) {
        const result = path.substring(basePath.length - 1); // 保留开头的斜杠
        if (debug) console.log(`[getRelativePath] 移除基础路径: ${path} -> ${result}`);
        return result;
    }

    // 确保路径以斜杠开头
    const result = path.startsWith('/') ? path : `/${path}`;
    if (debug) console.log(`[getRelativePath] 最终路径: ${result}`);
    return result;
}

export default {
    getPath,
    getFullUrl,
    isExternalLink,
    getRelativePath,
    getBasePath,
}
