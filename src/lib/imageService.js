/**
 * 图片处理服务 - 使用Astro内置的图片优化功能
 *
 * 这个模块提供了图片优化和处理的功能，使用Astro的内置图片优化API。
 * 它提供了与之前Sharp实现兼容的API，但性能更好，错误处理更强大。
 */
import { getImage } from 'astro:assets'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 项目根目录
const rootDir = path.resolve(__dirname, '../../')
// 缓存目录
const cacheDir = path.join(rootDir, '.cache/images')

// 确保缓存目录存在
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
}

/**
 * 优化图片并返回处理后的图片路径
 * @param {string} imagePath - 原始图片路径
 * @param {Object} options - 处理选项
 * @param {number} [options.width] - 目标宽度
 * @param {number} [options.height] - 目标高度
 * @param {string} [options.format] - 目标格式 (webp, jpeg, png, avif)
 * @param {number} [options.quality] - 图片质量 (1-100)
 * @returns {Promise<string>} - 处理后的图片路径
 */
export async function optimizeImage(imagePath, options = {}) {
    try {
        // 默认选项
        const {
            width = undefined,
            height = undefined,
            format = 'webp',
            quality = 80,
        } = options

        // 解析图片路径
        const isExternalUrl = imagePath.startsWith('http')
        let src

        if (isExternalUrl) {
            // 外部URL直接使用
            src = imagePath
        } else {
            // 处理相对路径，确保以/开头
            const normalizedPath = imagePath.startsWith('/')
                ? imagePath
                : `/${imagePath}`

            // 检查文件是否存在
            const publicPath = path.join(rootDir, 'public', normalizedPath)
            if (!fs.existsSync(publicPath)) {
                console.warn(`图片文件不存在: ${publicPath}`)
                return imagePath // 返回原始路径
            }

            // 使用相对于public目录的路径
            src = normalizedPath
        }

        // 生成缓存文件名
        const dimensions = width ? `${width}x${height || 'auto'}` : 'original'
        const fileNameBase = path.basename(imagePath, path.extname(imagePath))
        const cacheFileName = `${fileNameBase}-${dimensions}-q${quality}.${format}`
        const cachePath = path.join(cacheDir, cacheFileName)

        // 检查缓存
        if (fs.existsSync(cachePath)) {
            return cachePath
        }

        // 使用Astro的getImage API优化图片
        try {
            const optimizedImage = await getImage({
                src,
                width,
                height,
                format,
                quality,
            })

            // 返回优化后的图片URL
            return optimizedImage.src
        } catch (error) {
            console.error('Astro图片优化失败:', error)
            return imagePath // 出错时返回原始路径
        }
    } catch (error) {
        console.error('图片优化失败:', error)
        return imagePath // 出错时返回原始路径
    }
}

/**
 * 生成响应式图片集
 * @param {string} imagePath - 原始图片路径
 * @param {number[]} widths - 宽度数组
 * @param {string} format - 输出格式
 * @param {number} quality - 图片质量
 * @returns {Promise<{srcset: string, placeholder: string}>} - srcset字符串和占位图
 */
export async function generateResponsiveImageSet(
    imagePath,
    widths = [320, 640, 960, 1280, 1600],
    format = 'webp',
    quality = 80
) {
    try {
        const isExternalUrl = imagePath.startsWith('http')
        if (isExternalUrl) {
            // 外部URL不生成响应式图片集
            return { srcset: '', placeholder: imagePath }
        }

        const srcsetEntries = []
        let placeholder = ''

        // 处理每个宽度
        for (const width of widths) {
            try {
                const optimizedImageUrl = await optimizeImage(imagePath, {
                    width,
                    format,
                    quality,
                })

                srcsetEntries.push(`${optimizedImageUrl} ${width}w`)

                // 使用最小宽度的图片作为占位图
                if (width === Math.min(...widths)) {
                    placeholder = optimizedImageUrl
                }
            } catch (error) {
                console.error(`生成宽度为 ${width} 的响应式图片失败:`, error)
            }
        }

        return {
            srcset: srcsetEntries.join(', '),
            placeholder: placeholder || imagePath,
        }
    } catch (error) {
        console.error('生成响应式图片集失败:', error)
        return { srcset: '', placeholder: imagePath }
    }
}

/**
 * 批量优化目录中的图片
 * @param {string} directory - 图片目录
 * @param {Object} options - 处理选项
 * @returns {Promise<Array>} - 处理结果
 */
export async function optimizeDirectory(directory, options = {}) {
    try {
        const dirPath = path.join(rootDir, 'public', directory)

        // 检查目录是否存在
        if (!fs.existsSync(dirPath)) {
            console.warn(`目录不存在: ${dirPath}`)
            return []
        }

        const files = fs.readdirSync(dirPath)
        const imageFiles = files.filter((file) => {
            const ext = path.extname(file).toLowerCase()
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(
                ext
            )
        })

        const results = []
        for (const file of imageFiles) {
            try {
                const filePath = path.join(directory, file)
                const optimizedPath = await optimizeImage(filePath, options)
                results.push({
                    original: filePath,
                    optimized: optimizedPath,
                })
            } catch (error) {
                console.error(`优化图片 ${file} 失败:`, error)
            }
        }

        return results
    } catch (error) {
        console.error('批量优化图片失败:', error)
        return []
    }
}

/**
 * 获取图片的元数据
 * @param {string} imagePath - 图片路径
 * @returns {Promise<Object>} - 图片元数据
 */
export async function getImageMetadata(imagePath) {
    try {
        // 使用Astro的getImage API获取图片元数据
        const optimizedImage = await getImage({
            src: imagePath,
        })

        return {
            width: optimizedImage.options.width,
            height: optimizedImage.options.height,
            format: optimizedImage.options.format,
        }
    } catch (error) {
        console.error('获取图片元数据失败:', error)
        return null
    }
}

/**
 * 生成图片的模糊占位符
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string>} - Base64编码的占位符
 */
export async function generateBlurPlaceholder(imagePath) {
    try {
        // 使用Astro的getImage API生成模糊占位符
        const blurredImage = await getImage({
            src: imagePath,
            width: 20,
            height: 20,
            format: 'webp',
            quality: 30,
        })

        return blurredImage.src
    } catch (error) {
        console.error('生成模糊占位符失败:', error)
        return ''
    }
}

export default {
    optimizeImage,
    generateResponsiveImageSet,
    optimizeDirectory,
    getImageMetadata,
    generateBlurPlaceholder,
}
