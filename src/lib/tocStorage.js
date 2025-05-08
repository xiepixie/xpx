/**
 * IndexedDB工具函数，用于管理目录折叠状态
 */

// 数据库名称和版本
const DB_NAME = 'xpx-blog-toc';
const DB_VERSION = 1;
const STORE_NAME = 'toc-state';

/**
 * 打开数据库连接
 * @returns {Promise<IDBDatabase>} 数据库连接
 */
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('打开数据库失败:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 创建对象存储空间
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * 保存目录项的折叠状态
 * @param {string} slug - 目录项的唯一标识
 * @param {boolean} isCollapsed - 是否折叠
 * @returns {Promise<void>}
 */
export async function saveTocItemState(slug, isCollapsed) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(isCollapsed, slug);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('保存目录状态失败:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('保存目录状态时出错:', error);
    // 出错时静默失败，不影响用户体验
    return Promise.resolve();
  }
}

/**
 * 获取目录项的折叠状态
 * @param {string} slug - 目录项的唯一标识
 * @returns {Promise<boolean>} 是否折叠
 */
export async function getTocItemState(slug) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(slug);
      
      request.onsuccess = () => {
        // 如果没有找到记录，默认为false（不折叠）
        resolve(request.result === true);
      };
      
      request.onerror = (event) => {
        console.error('获取目录状态失败:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('获取目录状态时出错:', error);
    // 出错时返回默认值
    return Promise.resolve(false);
  }
}

/**
 * 获取所有目录项的折叠状态
 * @returns {Promise<Object>} 所有目录项的折叠状态
 */
export async function getAllTocItemStates() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      const keyRequest = store.getAllKeys();
      
      let values = [];
      let keys = [];
      
      request.onsuccess = () => {
        values = request.result;
      };
      
      keyRequest.onsuccess = () => {
        keys = keyRequest.result;
      };
      
      transaction.oncomplete = () => {
        const result = {};
        keys.forEach((key, index) => {
          result[key] = values[index];
        });
        db.close();
        resolve(result);
      };
      
      transaction.onerror = (event) => {
        console.error('获取所有目录状态失败:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('获取所有目录状态时出错:', error);
    // 出错时返回空对象
    return Promise.resolve({});
  }
}

/**
 * 清除所有目录项的折叠状态
 * @returns {Promise<void>}
 */
export async function clearAllTocItemStates() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('清除目录状态失败:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('清除目录状态时出错:', error);
    // 出错时静默失败
    return Promise.resolve();
  }
}
