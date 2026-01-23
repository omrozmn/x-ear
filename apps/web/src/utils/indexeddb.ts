import { Party } from '../types/party';

const DB_NAME = 'XEarPartyDB';
const DB_VERSION = 1;
const PARTIES_STORE = 'parties';
const CACHE_STORE = 'cache';
const BLOBS_STORE = 'blobs';

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

interface BlobEntry {
  id: string;
  blob: Blob;
  filename: string;
  mime: string;
  createdAt: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create parties store
        if (!db.objectStoreNames.contains(PARTIES_STORE)) {
          const partiesStore = db.createObjectStore(PARTIES_STORE, { keyPath: 'id' });
          partiesStore.createIndex('tcNumber', 'tcNumber', { unique: false });
          partiesStore.createIndex('status', 'status', { unique: false });
          partiesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create cache store for general caching
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
        // Create blobs store for binary attachments
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          const blobs = db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
          blobs.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  // Party-specific methods
  async saveParties(parties: Party[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE], 'readwrite');
    const store = transaction.objectStore(PARTIES_STORE);

    // Clear existing parties
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new parties
    for (const party of parties) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add(party);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getParties(): Promise<Party[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE], 'readonly');
    const store = transaction.objectStore(PARTIES_STORE);

    return new Promise<Party[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getParty(id: string): Promise<Party | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE], 'readonly');
    const store = transaction.objectStore(PARTIES_STORE);

    return new Promise<Party | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateParty(party: Party): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE], 'readwrite');
    const store = transaction.objectStore(PARTIES_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.put(party);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteParty(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE], 'readwrite');
    const store = transaction.objectStore(PARTIES_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // General cache methods
  async setCache(key: string, data: unknown, ttl?: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key: string): Promise<unknown | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readonly');
    const store = transaction.objectStore(CACHE_STORE);

    return new Promise<unknown | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          // Expired, delete and return null
          this.deleteCache(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save a file blob and return a generated id reference
  async saveFileBlob(blob: Blob, meta: { filename?: string; mime?: string } = {}): Promise<string> {
    const db = await this.ensureDB();
    const transaction = db.transaction([BLOBS_STORE], 'readwrite');
    const store = transaction.objectStore(BLOBS_STORE);

    const id = `blob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry: BlobEntry = {
      id,
      blob,
      filename: meta.filename || 'file',
      mime: meta.mime || blob.type || 'application/octet-stream',
      createdAt: Date.now(),
    };

    return new Promise<string>((resolve, reject) => {
      const req = store.add(entry);
      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  }

  // Retrieve a previously stored file blob by id
  async getFileBlob(id: string): Promise<{ blob: Blob; filename: string; mime: string } | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([BLOBS_STORE], 'readonly');
    const store = transaction.objectStore(BLOBS_STORE);

    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result as BlobEntry;
        if (!result) return resolve(null);
        resolve({ blob: result.blob, filename: result.filename, mime: result.mime });
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Clear all data from all stores (for tenant change or logout)
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PARTIES_STORE, CACHE_STORE, BLOBS_STORE], 'readwrite');

    const promises = [
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(PARTIES_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(CACHE_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(BLOBS_STORE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ];

    await Promise.all(promises);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Fallback to localStorage for critical UI state only
  async fallbackToLocalStorage(key: string): Promise<unknown | null> {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to read from localStorage fallback:', error);
      return null;
    }
  }

  async saveFallbackToLocalStorage(key: string, data: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage fallback:', error);
    }
  }
}

export const indexedDBManager = new IndexedDBManager();