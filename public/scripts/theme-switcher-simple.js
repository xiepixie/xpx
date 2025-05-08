/**
 * 主题切换器脚本 - 简化版
 * 
 * 功能：
 * 1. 使用 IndexedDB 存储主题设置
 * 2. 支持浅色/深色主题切换
 * 3. 支持多种主题选择
 */

;(function() {
    // IndexedDB配置
    const DB_NAME = 'xpxBlogThemeDB';
    const DB_VERSION = 1;
    const THEME_STORE = 'themes';
    const THEME_KEY = 'currentTheme';
    const DEFAULT_THEME = 'winter';

    // 深色主题列表
    const DARK_THEMES = ['dracula', 'synthwave', 'dark', 'night', 'coffee'];

    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', initThemeSwitcher);
    document.addEventListener('astro:page-load', initThemeSwitcher);

    /**
     * 初始化主题切换器
     */
    function initThemeSwitcher() {
        // 获取主题控制器
        const themeControllers = document.querySelectorAll('.theme-controller');
        
        // 如果没有主题控制器，直接返回
        if (themeControllers.length === 0) return;

        // 从存储中获取当前主题
        getTheme().then(currentTheme => {
            // 应用主题
            applyTheme(currentTheme);
            
            // 更新主题控制器状态
            updateThemeControllers(currentTheme);
            
            // 设置主题切换事件
            setupThemeChangeEvents();
        });
    }

    /**
     * 从存储中获取主题
     * @returns {Promise<string>} 主题名称
     */
    function getTheme() {
        return new Promise(resolve => {
            // 首先尝试从localStorage获取（快速路径）
            const localTheme = localStorage.getItem('theme');
            if (localTheme) {
                resolve(localTheme);
                return;
            }
            
            try {
                // 尝试从IndexedDB获取
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = function() {
                    // 如果打开失败，使用默认主题
                    resolve(DEFAULT_THEME);
                };
                
                request.onsuccess = function(event) {
                    try {
                        const db = event.target.result;
                        const transaction = db.transaction([THEME_STORE], 'readonly');
                        const store = transaction.objectStore(THEME_STORE);
                        const getRequest = store.get(THEME_KEY);
                        
                        getRequest.onsuccess = function(event) {
                            const result = event.target.result;
                            if (result && result.value) {
                                resolve(result.value);
                            } else {
                                resolve(DEFAULT_THEME);
                            }
                        };
                        
                        getRequest.onerror = function() {
                            resolve(DEFAULT_THEME);
                        };
                        
                        transaction.oncomplete = function() {
                            db.close();
                        };
                    } catch (error) {
                        console.error('IndexedDB事务错误:', error);
                        resolve(DEFAULT_THEME);
                    }
                };
                
                request.onupgradeneeded = function(event) {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(THEME_STORE)) {
                        db.createObjectStore(THEME_STORE, { keyPath: 'id' });
                    }
                };
            } catch (error) {
                console.error('IndexedDB操作失败:', error);
                resolve(DEFAULT_THEME);
            }
        });
    }

    /**
     * 保存主题到存储
     * @param {string} theme - 主题名称
     */
    function saveTheme(theme) {
        // 保存到localStorage（快速路径）
        localStorage.setItem('theme', theme);
        
        try {
            // 保存到IndexedDB
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = function() {
                console.log('IndexedDB打开失败，主题仅保存到localStorage');
            };
            
            request.onsuccess = function(event) {
                try {
                    const db = event.target.result;
                    const transaction = db.transaction([THEME_STORE], 'readwrite');
                    const store = transaction.objectStore(THEME_STORE);
                    
                    // 保存主题
                    store.put({ id: THEME_KEY, value: theme });
                    
                    transaction.oncomplete = function() {
                        db.close();
                    };
                } catch (error) {
                    console.error('IndexedDB事务错误:', error);
                }
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(THEME_STORE)) {
                    db.createObjectStore(THEME_STORE, { keyPath: 'id' });
                }
            };
        } catch (error) {
            console.error('IndexedDB操作失败:', error);
        }
    }

    /**
     * 应用主题
     * @param {string} theme - 主题名称
     */
    function applyTheme(theme) {
        // 设置主题
        document.documentElement.setAttribute('data-theme', theme);
        
        // 设置深色模式
        const isDarkTheme = DARK_THEMES.includes(theme);
        document.documentElement.classList.toggle('dark', isDarkTheme);
        
        // 触发主题变更事件
        document.dispatchEvent(
            new CustomEvent('theme-changed', { detail: { theme } })
        );
    }

    /**
     * 更新主题控制器状态
     * @param {string} theme - 当前主题
     */
    function updateThemeControllers(theme) {
        // 更新单选按钮
        document.querySelectorAll('.theme-controller').forEach(function(radio) {
            if (radio.value === theme) {
                radio.checked = true;
                
                // 更新标签样式
                const themeLabel = radio.closest('label');
                if (themeLabel) {
                    themeLabel.classList.add('ring-2', 'ring-primary', 'bg-base-200');
                }
            } else {
                radio.checked = false;
                
                // 更新标签样式
                const themeLabel = radio.closest('label');
                if (themeLabel) {
                    themeLabel.classList.remove('ring-2', 'ring-primary', 'bg-base-200');
                }
            }
        });
        
        // 更新主题按钮
        document.querySelectorAll('.theme-btn').forEach(function(btn) {
            const isActive = btn.dataset.themeValue === theme;
            btn.classList.toggle('btn-active', isActive);
            btn.classList.toggle('btn-primary', isActive);
        });
    }

    /**
     * 设置主题切换事件
     */
    function setupThemeChangeEvents() {
        // 监听主题控制器变化
        document.querySelectorAll('.theme-controller').forEach(function(radio) {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    const newTheme = this.value;
                    
                    // 保存并应用主题
                    saveTheme(newTheme);
                    applyTheme(newTheme);
                    
                    // 更新控制器状态
                    updateThemeControllers(newTheme);
                }
            });
        });
        
        // 监听主题按钮点击
        document.querySelectorAll('.theme-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const newTheme = this.dataset.themeValue;
                if (newTheme) {
                    // 保存并应用主题
                    saveTheme(newTheme);
                    applyTheme(newTheme);
                    
                    // 更新控制器状态
                    updateThemeControllers(newTheme);
                }
            });
        });
    }
})();
