/**
 * 图片优化脚本 - 使用Sharp批量优化图片
 *
 * 使用方法:
 * node scripts/optimize-images.js
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 项目根目录
const rootDir = path.resolve(__dirname, '../')
// 公共图片目录
const publicDir = path.join(rootDir, 'public')
// 优化后的图片目录
const optimizedDir = path.join(publicDir, 'optimized')

// 确保优化目录存在
if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true })
}

// 支持的图片格式
const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/**
 * 递归查找目录中的所有图片
 * @param {string} dir - 要搜索的目录
 * @returns {string[]} - 图片文件路径数组
 */
function findImages(dir) {
    let results = []
    const items = fs.readdirSync(dir)

    for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
            // 递归搜索子目录，但排除优化目录
            if (itemPath !== optimizedDir) {
                results = results.concat(findImages(itemPath))
            }
        } else {
            // 检查是否是支持的图片格式
            const ext = path.extname(item).toLowerCase()
            if (supportedFormats.includes(ext)) {
                results.push(itemPath)
            }
        }
    }

    return results
}

/**
 * 优化单个图片
 * @param {string} imagePath - 图片路径
 * @returns {Promise<Object>} - 优化结果
 */
async function optimizeImage(imagePath) {
    try {
        const relativePath = path.relative(publicDir, imagePath)
        const outputDir = path.join(optimizedDir, path.dirname(relativePath))
        const filename = path.basename(relativePath)
        const ext = path.extname(filename).toLowerCase()
        const nameWithoutExt = path.basename(filename, ext)

        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // 获取原始图片信息
        const metadata = await sharp(imagePath).metadata()
        const originalSize = fs.statSync(imagePath).size

        // 定义输出格式和选项
        const formats = [
            {
                format: 'webp',
                options: { quality: 80 },
                suffix: '.webp',
            },
            {
                format: ext === '.png' ? 'png' : 'jpeg',
                options:
                    ext === '.png'
                        ? { quality: 80 }
                        : { quality: 85, mozjpeg: true },
                suffix: ext,
            },
        ]

        // 定义尺寸
        const sizes = [
            { width: 320, suffix: '-320' },
            { width: 640, suffix: '-640' },
            { width: 960, suffix: '-960' },
            { width: 1280, suffix: '-1280' },
            { width: null, suffix: '' }, // 原始尺寸
        ]

        const results = []

        // 处理每种格式和尺寸
        for (const formatConfig of formats) {
            for (const sizeConfig of sizes) {
                // 跳过大于原始尺寸的调整
                if (sizeConfig.width && sizeConfig.width > metadata.width) {
                    continue
                }

                const outputPath = path.join(
                    outputDir,
                    `${nameWithoutExt}${sizeConfig.suffix}${formatConfig.suffix}`
                )

                let pipeline = sharp(imagePath)

                // 调整尺寸
                if (sizeConfig.width) {
                    pipeline = pipeline.resize({
                        width: sizeConfig.width,
                        withoutEnlargement: true,
                    })
                }

                // 设置输出格式
                if (formatConfig.format === 'webp') {
                    pipeline = pipeline.webp(formatConfig.options)
                } else if (formatConfig.format === 'jpeg') {
                    pipeline = pipeline.jpeg(formatConfig.options)
                } else if (formatConfig.format === 'png') {
                    pipeline = pipeline.png(formatConfig.options)
                }

                // 保存文件
                await pipeline.toFile(outputPath)

                // 获取优化后的文件大小
                const optimizedSize = fs.statSync(outputPath).size
                const savings = (
                    ((originalSize - optimizedSize) / originalSize) *
                    100
                ).toFixed(2)

                results.push({
                    original: relativePath,
                    optimized: path.relative(publicDir, outputPath),
                    originalSize,
                    optimizedSize,
                    savings: `${savings}%`,
                })
            }
        }

        return {
            path: relativePath,
            results,
        }
    } catch (error) {
        console.error(`优化图片 ${imagePath} 失败:`, error)
        return {
            path: imagePath,
            error: error.message,
        }
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('开始查找图片...')
    const images = findImages(publicDir)
    console.log(`找到 ${images.length} 张图片`)

    if (images.length === 0) {
        console.log('没有找到需要优化的图片')
        return
    }

    console.log('开始优化图片...')
    const results = []

    for (let i = 0; i < images.length; i++) {
        const imagePath = images[i]
        console.log(
            `[${i + 1}/${images.length}] 正在优化: ${path.relative(publicDir, imagePath)}`
        )
        const result = await optimizeImage(imagePath)
        results.push(result)
    }

    // 保存优化报告
    const reportPath = path.join(rootDir, 'image-optimization-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))

    console.log('图片优化完成!')
    console.log(`优化报告已保存到: ${reportPath}`)

    // 计算总体优化情况
    const successfulOptimizations = results.filter((r) => !r.error)
    if (successfulOptimizations.length > 0) {
        const totalOriginalSize = successfulOptimizations.reduce(
            (sum, item) => {
                return sum + (item.results ? item.results[0].originalSize : 0)
            },
            0
        )

        const totalOptimizedSize = successfulOptimizations.reduce(
            (sum, item) => {
                return sum + (item.results ? item.results[0].optimizedSize : 0)
            },
            0
        )

        const totalSavings = (
            ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) *
            100
        ).toFixed(2)

        console.log(`总体优化情况:`)
        console.log(
            `- 原始大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`
        )
        console.log(
            `- 优化后大小: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`
        )
        console.log(`- 节省空间: ${totalSavings}%`)
    }
}

// 执行主函数
main().catch((error) => {
    console.error('图片优化过程中发生错误:', error)
    process.exit(1)
})
