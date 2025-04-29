// 主题切换和持久化脚本
document.addEventListener('astro:page-load', () => {
    // 获取存储的主题 - 内联函数减少调用开销
    const currentTheme = (() => {
        try {
            return localStorage.getItem('theme') || 'winter'
        } catch {
            return 'winter'
        }
    })()

    // 应用主题到文档 - 简化操作
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        document.documentElement.classList.toggle(
            'dark',
            ['dracula', 'synthwave', 'dark', 'night', 'coffee'].includes(theme)
        )
    }

    // 初始化主题
    applyTheme(currentTheme)

    // 使用事件委托处理主题控制器变化 - 减少事件监听器数量
    const themeContainer = document.querySelector('body')
    if (themeContainer) {
        // 设置初始选中状态 - 一次性处理所有控制器
        for (const radio of document.querySelectorAll('.theme-controller')) {
            if (radio.value === currentTheme) {
                radio.checked = true
                const themeLabel = radio.closest('label')
                if (themeLabel) {
                    themeLabel.classList.add(
                        'ring-2',
                        'ring-primary',
                        'bg-base-200'
                    )
                }
            }
        }

        // 使用事件委托处理所有主题控制器的变化
        themeContainer.addEventListener('change', (e) => {
            const target = e.target
            if (target.classList.contains('theme-controller')) {
                const newTheme = target.value

                try {
                    // 保存到 localStorage
                    localStorage.setItem('theme', newTheme)

                    // 应用新主题
                    applyTheme(newTheme)

                    // 更新选中样式 - 使用更高效的选择器
                    // biome-ignore lint/complexity/noForEach: <explanation>
                    document.querySelectorAll('label').forEach((label) => {
                        if (
                            label.contains(
                                document.querySelector('.theme-controller')
                            )
                        ) {
                            label.classList.remove(
                                'ring-2',
                                'ring-primary',
                                'bg-base-200'
                            )
                        }
                    })

                    const activeLabel = target.closest('label')
                    if (activeLabel) {
                        activeLabel.classList.add(
                            'ring-2',
                            'ring-primary',
                            'bg-base-200'
                        )
                    }

                    // 触发主题变化事件
                    document.dispatchEvent(
                        new CustomEvent('theme-changed', {
                            detail: { theme: newTheme },
                            bubbles: true,
                        })
                    )
                } catch (error) {
                    console.error('Error saving theme:', error)
                }
            }
        })
    }

    // 使用事件委托处理移动端菜单和下拉菜单
    const mobileMenuButton = document.getElementById('mobile-menu-button')
    const mobileMenu = document.getElementById('mobile-menu')

    // 使用单一事件监听器处理所有点击事件
    document.addEventListener('click', (e) => {
        const target = e.target

        // 处理移动菜单按钮点击
        if (
            mobileMenuButton &&
            mobileMenu &&
            (target === mobileMenuButton || mobileMenuButton.contains(target))
        ) {
            e.preventDefault()
            e.stopPropagation()
            mobileMenu.classList.toggle('hidden')

            // 切换按钮图标
            const icon = mobileMenuButton.querySelector('.menu-icon')
            if (icon) {
                icon.classList.add('animate-pulse')
                setTimeout(() => icon.classList.remove('animate-pulse'), 300)
            }
        }
        // 处理点击外部关闭移动菜单
        else if (
            mobileMenu &&
            !mobileMenu.classList.contains('hidden') &&
            !mobileMenu.contains(target) &&
            (!mobileMenuButton || !mobileMenuButton.contains(target))
        ) {
            mobileMenu.classList.add('hidden')
        }

        // 处理下拉菜单按钮点击
        const clickedDropdownButton = target.closest('.dropdown-button')
        if (clickedDropdownButton) {
            e.preventDefault()
            e.stopPropagation()

            // 找到对应的菜单
            const dropdownButtons = Array.from(
                document.querySelectorAll('.dropdown-button')
            )
            const buttonIndex = dropdownButtons.indexOf(clickedDropdownButton)
            const dropdownMenus = document.querySelectorAll('.dropdown-menu')
            const menu = dropdownMenus[buttonIndex]

            if (menu) {
                const isHidden = menu.classList.contains('hidden')

                // 添加触摸反馈
                clickedDropdownButton.classList.add('bg-base-200')
                setTimeout(
                    () => clickedDropdownButton.classList.remove('bg-base-200'),
                    200
                )

                // 关闭其他菜单
                for (const otherMenu of dropdownMenus) {
                    if (otherMenu !== menu) {
                        otherMenu.classList.add('hidden')
                    }
                }

                // 切换当前菜单
                if (isHidden) {
                    menu.classList.remove('hidden')
                    menu.style.opacity = '0'
                    menu.style.transform = 'translateY(-10px)'

                    // 使用 requestAnimationFrame 确保过渡效果生效
                    requestAnimationFrame(() => {
                        menu.style.transition =
                            'opacity 0.2s ease, transform 0.2s ease'
                        menu.style.opacity = '1'
                        menu.style.transform = 'translateY(0)'
                    })
                } else {
                    menu.style.opacity = '0'
                    menu.style.transform = 'translateY(-10px)'

                    // 等待过渡完成后隐藏
                    setTimeout(() => {
                        menu.classList.add('hidden')
                        menu.style.opacity = ''
                        menu.style.transform = ''
                    }, 200)
                }

                // 旋转下拉图标
                const chevronIcon = clickedDropdownButton.querySelector('svg')
                if (chevronIcon) {
                    chevronIcon.style.transition = 'transform 0.3s ease'
                    chevronIcon.style.transform = isHidden
                        ? 'rotate(180deg)'
                        : 'rotate(0)'
                }
            }
        }

        // 处理点击外部关闭下拉菜单
        const openDropdownMenus = document.querySelectorAll(
            '.dropdown-menu:not(.hidden)'
        )
        for (const menu of openDropdownMenus) {
            const correspondingButton = Array.from(
                document.querySelectorAll('.dropdown-button')
            ).find(
                (btn, idx) =>
                    document.querySelectorAll('.dropdown-menu')[idx] === menu
            )

            if (
                !menu.contains(target) &&
                (!correspondingButton || !correspondingButton.contains(target))
            ) {
                menu.classList.add('hidden')
            }
        }
    })
})

// 在页面切换后重新应用主题 - 简化版本
document.addEventListener('astro:after-swap', () => {
    try {
        const theme = localStorage.getItem('theme') || 'winter'

        // 快速应用主题
        document.documentElement.setAttribute('data-theme', theme)
        document.documentElement.classList.toggle(
            'dark',
            ['dracula', 'synthwave', 'dark', 'night', 'coffee'].includes(theme)
        )

        // 使用 requestIdleCallback 延迟非关键操作，提高页面加载性能
        ;(window.requestIdleCallback || window.setTimeout)(
            () => {
                // 同步主题控制器
                // biome-ignore lint/complexity/noForEach: <explanation>
                document
                    .querySelectorAll('.theme-controller')
                    .forEach((radio) => {
                        radio.checked = radio.value === theme

                        // 更新标签样式
                        const label = radio.closest('label')
                        if (label) {
                            if (radio.value === theme) {
                                label.classList.add(
                                    'ring-2',
                                    'ring-primary',
                                    'bg-base-200'
                                )
                            } else {
                                label.classList.remove(
                                    'ring-2',
                                    'ring-primary',
                                    'bg-base-200'
                                )
                            }
                        }
                    })

                // 同步浮动菜单按钮
                // biome-ignore lint/complexity/noForEach: <explanation>
                document.querySelectorAll('.theme-btn').forEach((btn) => {
                    const isActive = btn.dataset.themeValue === theme
                    btn.classList.toggle('btn-active', isActive)
                    btn.classList.toggle('btn-primary', isActive)
                })
            },
            { timeout: 200 }
        )
    } catch (e) {
        console.error('Theme reapply error:', e)
    }
})
