/**
 * Astro 中间件 - 处理静态资源路径
 *
 * 这个中间件会检查请求的 URL，如果是静态资源（如图片、字体等），
 * 但没有包含正确的基础路径，则会重定向到正确的 URL。
 */

import { getPath } from './lib/path.js'

export function onRequest({ request, redirect }, next) {
    const url = new URL(request.url)
    const pathname = url.pathname

    // 检查是否是静态资源请求
    const isStaticAsset =
        /\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|ico|css|js)$/i.test(
            pathname
        )

    // 如果是静态资源请求，检查是否包含正确的基础路径
    if (isStaticAsset) {
        // 获取环境变量
        const useBasePath = process.env.PUBLIC_USE_BASE_PATH === 'true'
        const basePath = process.env.PUBLIC_BASE_PATH || ''

        // 如果需要使用基础路径，但请求的 URL 没有包含它
        if (useBasePath && basePath && !pathname.startsWith(`/${basePath}/`)) {
            // 构建正确的 URL
            const correctPath = getPath(
                pathname.startsWith('/') ? pathname.substring(1) : pathname
            )

            // 重定向到正确的 URL
            return redirect(correctPath, 301)
        }
    }

    // 继续处理请求
    return next()
}
