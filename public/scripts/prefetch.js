/**
 * 预加载和预取脚本
 *
 * 功能：
 * 1. 预加载关键资源
 * 2. 预取可能的下一页链接
 * 3. 延迟加载非关键资源
 */

// 获取基础路径
function getBasePath() {
    // 从 HTML 元素的 data-base-path 属性获取基础路径
    const basePath = document.documentElement.dataset.basePath || '';
    return basePath ? `/${basePath}` : '';
}

// 在 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('预加载和预取脚本已加载')

    // 预取可能的下一页链接
    prefetchNextPages()

    // 延迟加载非关键资源
    lazyLoadNonCriticalResources()

    // 监听用户交互，预加载鼠标悬停的链接
    setupLinkPrefetching()
})

/**
 * 预取可能的下一页链接
 */
function prefetchNextPages() {
    // 获取所有相关文章链接
    const relatedLinks = document.querySelectorAll('.related-posts a')

    // 获取分页链接
    const paginationLinks = document.querySelectorAll('.pagination a')

    // 合并所有可能的下一页链接
    const nextPageLinks = [...relatedLinks, ...paginationLinks]

    // 如果链接数量过多，只预取前几个
    const linksToFetch = nextPageLinks.slice(0, 3)

    // 延迟预取，避免与初始页面加载竞争资源
    setTimeout(() => {
        for (const link of linksToFetch) {
            const url = link.getAttribute('href')
            if (url && !url.startsWith('#') && !url.startsWith('javascript:')) {
                prefetchUrl(url)
            }
        }
    }, 1000) // 延迟1秒预取
}

/**
 * 预取URL
 * @param {string} url - 要预取的URL
 */
function prefetchUrl(url) {
    // 创建link元素
    const link = document.createElement('link')
    link.rel = 'prefetch'

    // 处理相对路径
    let finalUrl = url;
    if (url.startsWith('/') && !url.startsWith('//')) {
        // 添加基础路径
        const basePath = getBasePath();
        finalUrl = basePath + url;
    }

    link.href = finalUrl

    // 添加到head
    document.head.appendChild(link)
    console.log(`预取链接: ${url}`)
}

/**
 * 延迟加载非关键资源
 */
function lazyLoadNonCriticalResources() {
    // 延迟加载字体
    setTimeout(() => {
        // 加载额外字体
        loadFont(
            'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap'
        )

        // 加载本地字体
        const basePath = getBasePath();
        loadFont(`${basePath}/fonts/local-fonts.css`)
    }, 2000) // 延迟2秒加载

    // 延迟加载其他非关键脚本
    setTimeout(() => {
        // 加载分析脚本等
        // loadScript('https://example.com/analytics.js');
    }, 3000) // 延迟3秒加载
}

/**
 * 加载字体
 * @param {string} url - 字体URL
 */
function loadFont(url) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    console.log(`延迟加载字体: ${url}`)
}

/**
 * 加载脚本
 * @param {string} url - 脚本URL
 */
function loadScript(url) {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    document.body.appendChild(script)
    console.log(`延迟加载脚本: ${url}`)
}

// 存储已预取的URL，避免重复预取
const prefetchedUrls = new Set()

/**
 * 设置链接预加载
 */
function setupLinkPrefetching() {
    // 获取所有链接
    const links = document.querySelectorAll('a')

    // 为每个链接添加鼠标悬停事件
    for (const link of links) {
        link.addEventListener('mouseenter', () => {
            const url = link.getAttribute('href')
            if (
                url &&
                !url.startsWith('#') &&
                !url.startsWith('javascript:') &&
                !prefetchedUrls.has(url)
            ) {
                // 添加到已预取集合
                prefetchedUrls.add(url)

                // 预取链接
                prefetchUrl(url)
            }
        })
    }
}
