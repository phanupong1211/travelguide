// Lightweight IndexedDB helper with localStorage fallback
export type StoreName = 'checklist' | 'expenses' | 'itinerary' | 'notes' | 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB() {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('travel-guide-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        ['checklist', 'expenses', 'itinerary', 'notes', 'settings'].forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function idbGet<T = any>(store: StoreName, key: string) {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(`${store}:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }
}

export async function idbSet<T = any>(store: StoreName, key: string, value: T) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value as any, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem(`${store}:${key}`, JSON.stringify(value));
  }
}

