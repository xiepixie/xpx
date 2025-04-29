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
 * @returns {string} - 基础URL路径，如 "/" 或 "/base-path/"
 */
function getBasePath() {
    // 如果已经缓存了基础路径，直接返回
    if (cachedBasePath !== null) {
        return cachedBasePath
    }

    let useBasePath
    let basePath

    // 在客户端，使用 import.meta.env
    if (typeof window !== 'undefined') {
        // 客户端环境
        useBasePath = parseBooleanEnv(import.meta.env.PUBLIC_USE_BASE_PATH)
        basePath = import.meta.env.PUBLIC_BASE_PATH || ''
    } else {
        // 服务器端环境
        useBasePath = parseBooleanEnv(process.env.PUBLIC_USE_BASE_PATH)
        basePath = process.env.PUBLIC_BASE_PATH || ''
    }

    // 计算并缓存基础路径
    cachedBasePath = useBasePath && basePath ? `/${basePath}/` : '/'
    return cachedBasePath
}

/**
 * 处理路径，添加基础路径前缀
 * @param {string} path - 原始路径
 * @returns {string} - 处理后的路径
 */
export function getPath(path) {
    // 快速路径：如果是外部链接或空路径，直接返回
    if (!path) return getBasePath()
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path
    }

    const basePath = getBasePath()

    // 快速路径：如果基础路径是根路径，只需确保路径以斜杠开头
    if (basePath === '/') {
        return path.startsWith('/') ? path : `/${path}`
    }

    // 规范化路径：移除开头的斜杠，因为basePath已经包含了
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path

    // 组合路径
    return `${basePath}${normalizedPath}`
}

/**
 * 获取完整URL
 * @param {string} path - 相对路径
 * @param {string} [baseUrl] - 基础URL，默认为环境变量中的SITE_URL
 * @returns {string} - 完整URL
 */
export function getFullUrl(path, baseUrl) {
    // 如果已经是完整URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path
    }

    // 获取基础URL（使用缓存）
    if (!baseUrl && cachedBaseUrl === null) {
        cachedBaseUrl =
            (typeof process !== 'undefined'
                ? process.env.SITE_URL
                : import.meta.env.SITE_URL) || ''
    }

    const base = baseUrl || cachedBaseUrl

    // 处理路径
    const processedPath = getPath(path)

    // 如果没有基础URL，返回处理后的路径
    if (!base) {
        return processedPath
    }

    // 规范化基础URL和路径
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const normalizedPath = processedPath.startsWith('/')
        ? processedPath.substring(1)
        : processedPath

    // 组合URL
    return `${normalizedBase}${normalizedPath}`
}

/**
 * 检查路径是否为外部链接
 * @param {string} path - 要检查的路径
 * @returns {boolean} - 是否为外部链接
 */
export function isExternalLink(path) {
    return (
        path &&
        (path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('//'))
    )
}

/**
 * 获取相对路径
 * @param {string} path - 原始路径
 * @returns {string} - 相对路径
 */
export function getRelativePath(path) {
    // 如果是外部链接，直接返回
    if (isExternalLink(path)) {
        return path
    }

    // 获取基础路径
    const basePath = getBasePath()

    // 如果路径已经包含基础路径，移除它
    if (basePath !== '/' && path.startsWith(basePath)) {
        return path.substring(basePath.length - 1) // 保留开头的斜杠
    }

    // 确保路径以斜杠开头
    return path.startsWith('/') ? path : `/${path}`
}

export default {
    getPath,
    getFullUrl,
    isExternalLink,
    getRelativePath,
    getBasePath,
}
