/**
 * 阅读进度指示器和增强阅读体验功能
 */
document.addEventListener('astro:page-load', () => {
    // 创建阅读进度指示器
    const createReadingProgressIndicator = () => {
        // 检查是否已存在进度条，避免重复创建
        if (document.getElementById('reading-progress-bar')) return

        // 创建进度条容器
        const progressContainer = document.createElement('div')
        progressContainer.id = 'reading-progress-container'
        progressContainer.className = 'fixed top-0 left-0 w-full h-1 z-50'

        // 创建进度条
        const progressBar = document.createElement('div')
        progressBar.id = 'reading-progress-bar'
        progressBar.className =
            'h-full bg-primary transition-all duration-100 ease-out'
        progressBar.style.width = '0%'

        // 添加到DOM
        progressContainer.appendChild(progressBar)
        document.body.appendChild(progressContainer)

        // 更新进度条
        const updateProgressBar = () => {
            // 计算滚动百分比
            const scrollTop =
                window.scrollY || document.documentElement.scrollTop
            const scrollHeight = document.documentElement.scrollHeight
            const clientHeight = document.documentElement.clientHeight
            const scrollPercentage =
                (scrollTop / (scrollHeight - clientHeight)) * 100

            // 更新进度条宽度
            progressBar.style.width = `${Math.min(scrollPercentage, 100)}%`
        }

        // 监听滚动事件
        window.addEventListener('scroll', updateProgressBar)

        // 初始更新
        updateProgressBar()
    }

    // 增强图片查看体验
    const enhanceImages = () => {
        // 获取文章内容区域中的所有图片
        const contentImages = document.querySelectorAll('.content img')

        for (const img of contentImages) {
            // 添加点击放大功能
            img.addEventListener('click', () => {
                // 创建模态框
                const modal = document.createElement('div')
                modal.className =
                    'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out'

                // 创建图片容器
                const imgContainer = document.createElement('div')
                imgContainer.className =
                    'relative max-w-full max-h-full overflow-auto'

                // 创建放大的图片
                const enlargedImg = document.createElement('img')
                enlargedImg.src = img.src
                enlargedImg.alt = img.alt
                enlargedImg.className = 'max-w-full max-h-[90vh] object-contain'

                // 创建关闭按钮
                const closeBtn = document.createElement('button')
                closeBtn.className =
                    'absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors'
                closeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `

                // 添加关闭功能
                const closeModal = () => {
                    document.body.removeChild(modal)
                    document.body.classList.remove('overflow-hidden')
                }

                closeBtn.addEventListener('click', closeModal)
                modal.addEventListener('click', closeModal)

                // 阻止点击图片时关闭模态框
                imgContainer.addEventListener('click', (e) => {
                    e.stopPropagation()
                })

                // 组装模态框
                imgContainer.appendChild(enlargedImg)
                imgContainer.appendChild(closeBtn)
                modal.appendChild(imgContainer)

                // 添加到DOM并禁止滚动
                document.body.appendChild(modal)
                document.body.classList.add('overflow-hidden')
            })

            // 添加鼠标悬停效果
            img.classList.add(
                'cursor-zoom-in',
                'transition-transform',
                'hover:scale-[1.02]'
            )
        }
    }

    // 增强表格体验
    const enhanceTables = () => {
        const tables = document.querySelectorAll('.content table')

        for (const table of tables) {
            // 创建表格容器使其可滚动
            const tableWrapper = document.createElement('div')
            tableWrapper.className =
                'overflow-x-auto my-6 rounded-lg border border-base-300'

            // 替换表格
            table.parentNode.insertBefore(tableWrapper, table)
            tableWrapper.appendChild(table)

            // 增强表格样式
            table.classList.add('w-full')
        }
    }

    // 执行增强功能
    const enhanceReadingExperience = () => {
        // 检查是否在文章页面
        const contentElement = document.querySelector('.content')
        if (!contentElement) return

        createReadingProgressIndicator()
        enhanceImages()
        enhanceTables()
    }

    // 初始化
    enhanceReadingExperience()
})
