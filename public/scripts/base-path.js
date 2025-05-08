/**
 * 基础路径设置脚本
 *
 * 这个脚本会在页面加载时设置基础路径，以便在客户端 JavaScript 中使用。
 * 它会将基础路径设置为 document.documentElement 的 data-base-path 属性。
 *
 * 优先使用 HTML 中设置的 data-base-path 属性，如果没有则尝试从 URL 中检测。
 */

;(() => {
    try {
        // 检查 HTML 是否已经设置了 data-base-path 属性
        const existingBasePath = document.documentElement.dataset.basePath;

        if (existingBasePath !== undefined) {
            // 已经设置了基础路径，不需要再次设置
            console.log('Base path already set:', existingBasePath);
            return;
        }

        // 获取当前页面的路径
        const path = window.location.pathname;

        // 检查是否有基础路径
        // 例如，如果页面 URL 是 https://example.com/xpx/blog，则基础路径是 xpx
        const match = path.match(/^\/([^\/]+)/);

        if (match?.[1]) {
            // 设置基础路径
            document.documentElement.dataset.basePath = match[1];
            console.log('Base path detected:', match[1]);
        } else {
            // 没有基础路径
            document.documentElement.dataset.basePath = '';
        }
    } catch (error) {
        console.error('Error setting base path:', error);
    }
})()
