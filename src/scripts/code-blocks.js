/**
 * 代码块增强脚本
 *
 * 功能：
 * 1. 为代码块添加复制按钮
 * 2. 处理代码块的文件名显示
 * 3. 处理代码行高亮
 */

// 在 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    enhanceCodeBlocks()
})

/**
 * 增强所有代码块
 */
function enhanceCodeBlocks() {
    // 获取所有代码块
    const codeBlocks = document.querySelectorAll('.astro-code')

    // 使用 for...of 替代 forEach
    for (const codeBlock of codeBlocks) {
        // 处理文件名
        processCodeBlockTitle(codeBlock)

        // 处理行高亮
        processLineHighlighting(codeBlock)

        // 添加复制按钮
        addCopyButton(codeBlock)
    }
}

/**
 * 处理代码块的文件名
 * @param {HTMLElement} codeBlock - 代码块元素
 */
function processCodeBlockTitle(codeBlock) {
    // 查找代码块的父元素中是否有包含 title= 的 pre 标签
    const preElement = codeBlock.closest('pre')
    if (!preElement) return

    // 获取 pre 标签的 class 属性
    const classAttr = preElement.className || ''

    // 查找 title="文件名" 模式
    const titleMatch = classAttr.match(/title="([^"]+)"/)
    if (titleMatch?.[1]) {
        // 设置 data-title 属性，用于 CSS ::before 伪元素显示
        codeBlock.setAttribute('data-title', titleMatch[1])
    }
}

/**
 * 处理代码行高亮
 * @param {HTMLElement} codeBlock - 代码块元素
 */
function processLineHighlighting(codeBlock) {
    // 查找代码块的父元素中是否有包含行高亮信息的 pre 标签
    const preElement = codeBlock.closest('pre')
    if (!preElement) return

    // 获取 pre 标签的 class 属性
    const classAttr = preElement.className || ''

    // 查找 {行号} 模式，如 {1,3-5,8}
    const highlightMatch = classAttr.match(/{([^}]+)}/)
    if (!highlightMatch || !highlightMatch[1]) return

    // 解析高亮行信息
    const highlightInfo = highlightMatch[1]
    const linesToHighlight = parseHighlightLines(highlightInfo)

    // 获取代码块中的所有行
    const codeLines = codeBlock.querySelectorAll('code > span')

    // 高亮指定的行
    codeLines.forEach((line, index) => {
        // 行号从 1 开始
        const lineNumber = index + 1
        if (linesToHighlight.includes(lineNumber)) {
            line.classList.add('highlighted')
        }
    })
}

/**
 * 解析高亮行信息
 * @param {string} highlightInfo - 高亮行信息，如 "1,3-5,8"
 * @returns {number[]} - 需要高亮的行号数组
 */
function parseHighlightLines(highlightInfo) {
    const lines = []

    // 分割逗号分隔的部分
    const parts = highlightInfo.split(',')

    // 使用 for...of 替代 forEach
    for (let part of parts) {
        part = part.trim()

        // 处理范围，如 "3-5"
        if (part.includes('-')) {
            const [start, end] = part
                .split('-')
                .map((num) => Number.parseInt(num.trim(), 10))
            for (let i = start; i <= end; i++) {
                lines.push(i)
            }
        }
        // 处理单个行号
        else {
            lines.push(Number.parseInt(part, 10))
        }
    }

    return lines
}

/**
 * 为代码块添加复制按钮
 * @param {HTMLElement} codeBlock - 代码块元素
 */
function addCopyButton(codeBlock) {
    // 创建复制按钮
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-button'
    copyButton.textContent = '复制'

    // 添加点击事件
    copyButton.addEventListener('click', () => {
        // 获取代码内容
        const code = codeBlock.querySelector('code')
        let codeText = ''

        // 获取所有代码行的文本内容
        const codeLines = code.querySelectorAll('span')
        // 使用 for...of 替代 forEach，使用模板字符串替代字符串拼接
        for (const line of codeLines) {
            codeText += `${line.textContent}\n`
        }

        // 复制到剪贴板
        navigator.clipboard
            .writeText(codeText.trim())
            .then(() => {
                // 复制成功，更新按钮文本
                copyButton.textContent = '已复制!'
                copyButton.classList.add('copied')

                // 2秒后恢复按钮文本
                setTimeout(() => {
                    copyButton.textContent = '复制'
                    copyButton.classList.remove('copied')
                }, 2000)
            })
            .catch((err) => {
                console.error('复制失败:', err)
                copyButton.textContent = '复制失败'

                // 2秒后恢复按钮文本
                setTimeout(() => {
                    copyButton.textContent = '复制'
                }, 2000)
            })
    })

    // 将按钮添加到代码块
    codeBlock.appendChild(copyButton)
}
