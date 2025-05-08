/**
 * Astro 中间件 - 处理静态资源路径
 *
 * 这个中间件会检查请求的 URL，如果是静态资源（如图片、字体等），
 * 但没有包含正确的基础路径，则会重定向到正确的 URL。
 *
 * 它还会处理 Markdown 内容中的图片路径，确保它们包含正确的基础路径前缀。
 */

import { getPath } from './lib/path.js'

export async function onRequest({ request, redirect }, next) {
    const url = new URL(request.url)
    const pathname = url.pathname

    // 检查是否是静态资源请求 - 扩展支持更多文件类型
    const isStaticAsset =
        /\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|ico|css|js|pdf|mp3|mp4|webm|ogg|avif|json|xml)$/i.test(
            pathname
        ) ||
        // 检查特定的资源文件名
        /\b(blog-placeholder-\w+|placeholder-\w+|image)\.\w+$/i.test(pathname) ||
        // 检查Astro优化的图片（带有哈希值的文件名）
        /\/_astro\/.*\.[a-zA-Z0-9]+_[a-zA-Z0-9]+\.(webp|avif|png|jpg|jpeg)$/i.test(pathname)

    // 检查是否是 _astro 目录下的资源
    const isAstroAsset = pathname.includes('/_astro/') || pathname.startsWith('/_astro')

    // 获取环境变量
    const useBasePath = process.env.PUBLIC_USE_BASE_PATH === 'true'
    const basePath = process.env.PUBLIC_BASE_PATH || ''

    // 如果是静态资源请求或_astro目录下的资源，检查是否包含正确的基础路径
    if (isStaticAsset || isAstroAsset) {
        // 如果需要使用基础路径，但请求的 URL 没有包含它
        if (useBasePath && basePath && !pathname.startsWith(`/${basePath}/`)) {
            // 特别处理不同类型的资源
            const isPlaceholderImage = /\b(blog-placeholder-\w+|placeholder-\w+)\.\w+$/i.test(pathname);
            const isAstroOptimizedImage = pathname.includes('/_astro/') && /\.(webp|avif|png|jpg|jpeg)$/i.test(pathname);

            // 构建正确的 URL
            let correctPath;
            if (isPlaceholderImage) {
                // 对于占位图片，直接添加基础路径前缀
                const imageName = pathname.startsWith('/')
                    ? pathname.substring(1)
                    : pathname;
                correctPath = `/${basePath}/${imageName}`;
            } else if (isAstroOptimizedImage) {
                // 对于Astro优化的图片，特殊处理
                const astroPath = pathname.startsWith('/')
                    ? pathname.substring(1)
                    : pathname;
                correctPath = `/${basePath}/${astroPath}`;
                console.log(`[Middleware] 处理Astro优化图片: ${pathname} -> ${correctPath}`);
            } else {
                // 对于其他资源，使用 getPath 函数
                correctPath = getPath(
                    pathname.startsWith('/') ? pathname.substring(1) : pathname
                );
            }

            console.log(`[Middleware] 重定向静态资源: ${pathname} -> ${correctPath}`)

            // 重定向到正确的 URL
            return redirect(correctPath, 301)
        }
    }

    // 处理 Markdown 内容中的图片路径
    // 这里我们不能直接修改 Markdown 内容，但可以在响应中添加一个脚本来修复图片路径
    const response = await next()

    // 只处理 HTML 响应
    if (response.headers.get('content-type')?.includes('text/html')) {
        try {
            const html = await response.text()

            // 添加一个脚本来修复图片路径
            const script = `
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // 获取基础路径
                    const basePath = '${useBasePath && basePath ? `/${basePath}` : ''}';
                    if (!basePath) return;

                    // 修复所有图片路径 - 增强版
                    document.querySelectorAll('img').forEach(img => {
                        const src = img.getAttribute('src');
                        if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith(basePath)) {
                            return; // 跳过外部链接、数据URI和已经有基础路径的图片
                        }

                        // 移除前导斜杠
                        const normalizedSrc = src.startsWith('/') ? src.substring(1) : src;

                        // 添加基础路径前缀
                        const newSrc = \`\${basePath}/\${normalizedSrc}\`;
                        img.setAttribute('src', newSrc);
                        console.log('[Path Fix] 修复图片路径:', src, '->', newSrc);

                        // 同时修复srcset属性（如果存在）
                        const srcset = img.getAttribute('srcset');
                        if (srcset) {
                            const newSrcset = srcset.split(',').map(s => {
                                const [url, size] = s.trim().split(' ');
                                if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith(basePath)) {
                                    const normalizedUrl = url.startsWith('/') ? url.substring(1) : url;
                                    return \`\${basePath}/\${normalizedUrl} \${size || ''}\`.trim();
                                }
                                return s;
                            }).join(', ');
                            img.setAttribute('srcset', newSrcset);
                        }
                    });

                    // 特别处理 _astro 目录下的资源
                    document.querySelectorAll('img[src*="_astro/"], source[srcset*="_astro/"]').forEach(element => {
                        // 处理src属性（img标签）
                        if (element.hasAttribute('src')) {
                            const src = element.getAttribute('src');
                            if (src && !src.startsWith('http') && !src.includes(\`\${basePath}/_astro/\`)) {
                                // 如果是 _astro 路径但不包含基础路径
                                const astroPath = src.includes('/_astro/')
                                    ? src.substring(src.indexOf('/_astro/') + 1)
                                    : (src.startsWith('_astro/') ? src : \`_astro/\${src}\`);

                                // 添加基础路径前缀
                                const newSrc = \`\${basePath}/\${astroPath}\`;
                                element.setAttribute('src', newSrc);
                                console.log('[Path Fix] 修复 _astro 图片路径:', src, '->', newSrc);
                            }
                        }

                        // 处理srcset属性（source标签或img标签的响应式图片）
                        if (element.hasAttribute('srcset')) {
                            const srcset = element.getAttribute('srcset');
                            if (srcset && srcset.includes('_astro/') && !srcset.includes(\`\${basePath}/_astro/\`)) {
                                const newSrcset = srcset.split(',').map(s => {
                                    const parts = s.trim().split(' ');
                                    const url = parts[0];
                                    const descriptor = parts.slice(1).join(' ');

                                    if (url && url.includes('_astro/') && !url.includes(\`\${basePath}/_astro/\`)) {
                                        const astroPath = url.includes('/_astro/')
                                            ? url.substring(url.indexOf('/_astro/') + 1)
                                            : (url.startsWith('_astro/') ? url : \`_astro/\${url}\`);

                                        return \`\${basePath}/\${astroPath} \${descriptor}\`.trim();
                                    }
                                    return s;
                                }).join(', ');

                                element.setAttribute('srcset', newSrcset);
                                console.log('[Path Fix] 修复 _astro srcset 路径');
                            }
                        }
                    });

                    // 特别处理 Markdown 内容中的图片路径
                    // 这些图片通常在 .prose 类下，或者在 article 元素内
                    document.querySelectorAll('.prose img, article img, .markdown-content img').forEach(img => {
                        const src = img.getAttribute('src');
                        if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith(basePath)) {
                            // 移除前导斜杠
                            const normalizedSrc = src.startsWith('/') ? src.substring(1) : src;

                            // 添加基础路径前缀
                            const newSrc = \`\${basePath}/\${normalizedSrc}\`;
                            img.setAttribute('src', newSrc);
                            console.log('[Path Fix] 修复Markdown图片路径:', src, '->', newSrc);
                        }
                    });

                    // 特别处理 blog-placeholder-about.jpg 图片
                    document.querySelectorAll('img[src*="blog-placeholder-about.jpg"]').forEach(img => {
                        const src = img.getAttribute('src');
                        if (src && !src.startsWith('http') && !src.includes(basePath)) {
                            const newSrc = \`\${basePath}/blog-placeholder-about.jpg\`;
                            img.setAttribute('src', newSrc);
                            console.log('[Path Fix] 修复特定图片路径:', src, '->', newSrc);
                        }
                    });

                    // 特别处理 Astro 优化后的图片路径
                    document.querySelectorAll('img[src*="_astro/"], picture source[srcset*="_astro/"]').forEach(element => {
                        const attr = element.hasAttribute('src') ? 'src' : 'srcset';
                        const value = element.getAttribute(attr);

                        if (value && !value.startsWith('http') && value.includes('_astro/') && !value.includes(\`\${basePath}/_astro/\`)) {
                            // 检查是否包含哈希值的优化图片路径
                            const isOptimizedImage = /_astro\/.*\.[a-zA-Z0-9]+_[a-zA-Z0-9]+\.(webp|avif|png|jpg|jpeg)/i.test(value);

                            if (isOptimizedImage) {
                                // 提取 _astro/ 之后的部分
                                let astroPath = '';
                                if (value.includes('/_astro/')) {
                                    astroPath = value.substring(value.indexOf('/_astro/') + 1);
                                } else if (value.startsWith('_astro/')) {
                                    astroPath = value;
                                } else {
                                    // 如果格式不符合预期，尝试正则匹配
                                    const match = value.match(/(_astro\/.*)/);
                                    if (match) {
                                        astroPath = match[1];
                                    }
                                }

                                if (astroPath) {
                                    const newValue = \`\${basePath}/\${astroPath}\`;
                                    element.setAttribute(attr, newValue);
                                    console.log(\`[Path Fix] 修复Astro优化图片\${attr}:\`, value, '->', newValue);
                                }
                            }
                        }
                    });
                });
            </script>
            `

            // 在 </body> 前插入脚本
            const modifiedHtml = html.replace('</body>', `${script}</body>`)

            // 创建新的响应
            return new Response(modifiedHtml, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            })
        } catch (error) {
            console.error('[Middleware] 处理响应时出错:', error)
        }
    }

    // 返回原始响应
    return response
}
