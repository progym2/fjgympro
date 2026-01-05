const DB_NAME = 'francgympro_offline';
const DB_VERSION = 1;

export interface CachedData<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for cached API responses
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Store for pending offline operations
      if (!db.objectStoreNames.contains('pendingOps')) {
        const opsStore = db.createObjectStore('pendingOps', { keyPath: 'id', autoIncrement: true });
        opsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function setCacheItem<T>(key: string, data: T, ttlMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');

    const item: CachedData<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    store.put(item);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('IndexedDB setCacheItem failed:', error);
  }
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        // Check expiration
        if (Date.now() > result.expiresAt) {
          deleteCacheItem(key);
          resolve(null);
          return;
        }
        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB getCacheItem failed:', error);
    return null;
  }
}

export async function deleteCacheItem(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    store.delete(key);
  } catch (error) {
    console.warn('IndexedDB deleteCacheItem failed:', error);
  }
}

export async function clearExpiredCache(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('expiresAt');
    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(now));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB clearExpiredCache failed:', error);
    return 0;
  }
}

export async function getCacheStats(): Promise<{ count: number; oldestTimestamp: number | null }> {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');

    return new Promise((resolve, reject) => {
      const countReq = store.count();
      let count = 0;
      let oldestTimestamp: number | null = null;

      countReq.onsuccess = () => {
        count = countReq.result;
      };

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as CachedData<unknown>;
          if (oldestTimestamp === null || item.timestamp < oldestTimestamp) {
            oldestTimestamp = item.timestamp;
          }
          cursor.continue();
        } else {
          resolve({ count, oldestTimestamp });
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch (error) {
    console.warn('IndexedDB getCacheStats failed:', error);
    return { count: 0, oldestTimestamp: null };
  }
}

// Pending operations for offline sync
export interface PendingOperation {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export async function addPendingOperation(op: Omit<PendingOperation, 'id'>): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');

    return new Promise((resolve, reject) => {
      const request = store.add(op);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB addPendingOperation failed:', error);
    return -1;
  }
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingOps', 'readonly');
    const store = tx.objectStore('pendingOps');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB getPendingOperations failed:', error);
    return [];
  }
}

export async function deletePendingOperation(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');
    store.delete(id);
  } catch (error) {
    console.warn('IndexedDB deletePendingOperation failed:', error);
  }
}

export async function clearAllPendingOperations(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');
    store.clear();
  } catch (error) {
    console.warn('IndexedDB clearAllPendingOperations failed:', error);
  }
}
