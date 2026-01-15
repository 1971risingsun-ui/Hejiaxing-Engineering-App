
/**
 * 使用 File System Access API 進行本機資料夾存取
 * 並透過 IndexedDB 持久化 Handle 與 App 狀態
 */

const DB_NAME = 'hjx_handle_db';
const STORE_NAME = 'handles';
const APP_STATE_KEY = 'app_full_state';
const HANDLE_KEY = 'current_dir';
// Fix: Added STORAGE_HANDLE_KEY to support separate storage directory persistence
const STORAGE_HANDLE_KEY = 'storage_dir';
const DB_FILENAME = 'db.json';

// 初始化 IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 升級版本以確保 Store 存在
    request.onupgradeneeded = (e: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 儲存整個 App 狀態到 IndexedDB (用於手機端大量資料儲存)
export const saveAppStateToIdb = async (state: any) => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // 直接存入物件，IndexedDB 會處理序列化，比 localStorage 效能更好且容量極大
    store.put(state, APP_STATE_KEY);
    return new Promise((resolve) => (tx.oncomplete = resolve));
  } catch (e) {
    console.error('IndexedDB 儲存失敗', e);
  }
};

// 從 IndexedDB 讀取 App 狀態
export const loadAppStateFromIdb = async (): Promise<any | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(APP_STATE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

export const saveHandleToIdb = async (handle: FileSystemDirectoryHandle) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getHandleFromIdb = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

// Fix: Exported saveStorageHandleToIdb to resolve import error in App.tsx
export const saveStorageHandleToIdb = async (handle: FileSystemDirectoryHandle) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, STORAGE_HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

// Fix: Exported getStorageHandleFromIdb to resolve import error in App.tsx
export const getStorageHandleFromIdb = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(STORAGE_HANDLE_KEY);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    return null;
  }
};

export const clearHandleFromIdb = async () => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
  return new Promise((resolve) => (tx.oncomplete = resolve));
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle> => {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的瀏覽器不支援本機同步，資料將僅保存在手機瀏覽器快取中。');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    await saveHandleToIdb(handle);
    return handle;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('已取消選擇');
    throw new Error('無法取得權限：' + e.message);
  }
};

// Fix: Updated saveDbToLocal to accept an optional fileName argument, resolving the "Expected 2 arguments, but got 3" error in App.tsx
export const saveDbToLocal = async (handle: FileSystemDirectoryHandle, data: any, fileName: string = DB_FILENAME) => {
  try {
    if ((await (handle as any).queryPermission({ mode: 'readwrite' })) !== 'granted') return;
    
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (e) {
    console.error(`儲存本機 ${fileName} 失敗`, e);
  }
};

export const loadDbFromLocal = async (handle: FileSystemDirectoryHandle): Promise<any | null> => {
  try {
    if ((await (handle as any).queryPermission({ mode: 'read' })) !== 'granted') return null;
    
    const fileHandle = await handle.getFileHandle(DB_FILENAME);
    const file = await fileHandle.getFile();
    const content = await file.text();
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
};
