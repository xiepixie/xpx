/**
 * 主题管理IndexedDB工具类
 * 用于存储和检索用户主题选择
 */

// 数据库配置
const DB_NAME = 'xpxBlogThemeDB';
const DB_VERSION = 1;
const THEME_STORE = 'themes';
const THEME_KEY = 'currentTheme';

// 默认主题
const DEFAULT_THEME = 'winter';

/**
 * 初始化IndexedDB数据库
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
function initDB() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB打开失败:', event);
        reject(new Error('无法打开主题数据库'));
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建主题存储对象
        if (!db.objectStoreNames.contains(THEME_STORE)) {
          db.createObjectStore(THEME_STORE, { keyPath: 'id' });
          console.log('主题存储对象创建成功');
        }
      };
    } catch (error) {
      console.error('IndexedDB初始化错误:', error);
      reject(error);
    }
  });
}

/**
 * 保存主题到IndexedDB
 * @param {string} theme 主题名称
 * @returns {Promise<void>}
 */
export async function saveThemeToIndexedDB(theme) {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THEME_STORE], 'readwrite');
      const store = transaction.objectStore(THEME_STORE);
      
      const themeData = {
        id: THEME_KEY,
        value: theme,
        timestamp: Date.now()
      };
      
      const request = store.put(themeData);
      
      request.onsuccess = () => {
        console.log('主题已保存到IndexedDB:', theme);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('保存主题到IndexedDB失败:', event);
        reject(new Error('保存主题失败'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('保存主题过程中出错:', error);
    // 出错时回退到localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.error('回退到localStorage也失败:', e);
    }
  }
}

/**
 * 从IndexedDB获取主题
 * @returns {Promise<string>} 主题名称
 */
export async function getThemeFromIndexedDB() {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THEME_STORE], 'readonly');
      const store = transaction.objectStore(THEME_STORE);
      
      const request = store.get(THEME_KEY);
      
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          console.log('从IndexedDB获取主题:', result.value);
          resolve(result.value);
        } else {
          console.log('IndexedDB中未找到主题，使用默认主题');
          resolve(getFallbackTheme());
        }
      };
      
      request.onerror = (event) => {
        console.error('从IndexedDB获取主题失败:', event);
        reject(new Error('获取主题失败'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('获取主题过程中出错:', error);
    return getFallbackTheme();
  }
}

/**
 * 获取备用主题（从localStorage或cookie）
 * @returns {string} 主题名称
 */
function getFallbackTheme() {
  try {
    // 尝试从localStorage获取
    const localTheme = localStorage.getItem('theme');
    if (localTheme) {
      return localTheme;
    }
    
    // 尝试从cookie获取
    const themeCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('theme='));
    
    if (themeCookie) {
      return themeCookie.split('=')[1];
    }
  } catch (e) {
    console.error('获取备用主题失败:', e);
  }
  
  // 默认主题
  return DEFAULT_THEME;
}

/**
 * 全面保存主题到所有存储位置（IndexedDB、localStorage和cookie）
 * 确保在各种环境下都能正常工作
 * @param {string} theme 主题名称
 */
export async function saveThemeEverywhere(theme) {
  // 保存到IndexedDB
  await saveThemeToIndexedDB(theme);
  
  try {
    // 同时保存到localStorage作为备份
    localStorage.setItem('theme', theme);
    
    // 同时保存到cookie (7天过期)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    document.cookie = `theme=${theme}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    
    console.log('主题已保存到所有存储位置:', theme);
  } catch (error) {
    console.error('保存主题到备用存储位置失败:', error);
  }
  
  // 触发主题变化事件
  document.dispatchEvent(
    new CustomEvent('theme-changed', {
      detail: { theme },
      bubbles: true
    })
  );
}
