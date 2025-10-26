import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Outbox item interface
export interface OutboxItem {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: any;
  idempotencyKey: string;
  retryCount: number;
  maxRetries?: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

// IndexedDB configuration
const DB_NAME = 'x-ear-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'outbox_items';

class OutboxDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async addItem(item: OutboxItem): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getItems(): Promise<OutboxItem[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updateItem(item: OutboxItem): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async removeItem(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearItems(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const outboxDB = new OutboxDB();

// Online status detection
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Main outbox hook
export const useOutbox = () => {
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const isOnline = useOnlineStatus();

  // Load outbox items from IndexedDB
  const loadOutboxItems = useCallback(async () => {
    try {
      const items = await outboxDB.getItems();
      setOutboxItems(items);
    } catch (error) {
      console.error('Failed to load outbox items:', error);
    }
  }, []);

  // Add item to outbox
  const addToOutbox = useCallback(async (item: Omit<OutboxItem, 'id'>) => {
    const outboxItem: OutboxItem = {
      ...item,
      id: uuidv4(),
      maxRetries: item.maxRetries || 3,
    };

    try {
      await outboxDB.addItem(outboxItem);
      setOutboxItems(prev => [...prev, outboxItem]);
    } catch (error) {
      console.error('Failed to add item to outbox:', error);
      throw error;
    }
  }, []);

  // Remove item from outbox
  const removeFromOutbox = useCallback(async (id: string) => {
    try {
      await outboxDB.removeItem(id);
      setOutboxItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to remove item from outbox:', error);
    }
  }, []);

  // Process outbox items (sync with server)
  const processOutbox = useCallback(async () => {
    if (!isOnline || isProcessing || outboxItems.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const itemsToProcess = outboxItems
        .filter(item => item.retryCount < (item.maxRetries || 3))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const item of itemsToProcess) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5003/api'}${item.endpoint}`, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': item.idempotencyKey,
            },
            body: item.method !== 'GET' ? JSON.stringify(item.data) : undefined,
          });

          if (response.ok) {
            // Success - remove from outbox
            await removeFromOutbox(item.id);
          } else {
            // Failed - increment retry count
            const updatedItem: OutboxItem = {
              ...item,
              retryCount: item.retryCount + 1,
              lastAttemptAt: new Date().toISOString(),
              error: `HTTP ${response.status}: ${response.statusText}`,
            };

            await outboxDB.updateItem(updatedItem);
            setOutboxItems(prev => 
              prev.map(i => i.id === item.id ? updatedItem : i)
            );
          }
        } catch (error) {
          // Network error - increment retry count
          const updatedItem: OutboxItem = {
            ...item,
            retryCount: item.retryCount + 1,
            lastAttemptAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Network error',
          };

          await outboxDB.updateItem(updatedItem);
          setOutboxItems(prev => 
            prev.map(i => i.id === item.id ? updatedItem : i)
          );
        }

        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Failed to process outbox:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing, outboxItems, removeFromOutbox]);

  // Clear all outbox items
  const clearOutbox = useCallback(async () => {
    try {
      await outboxDB.clearItems();
      setOutboxItems([]);
    } catch (error) {
      console.error('Failed to clear outbox:', error);
    }
  }, []);

  // Load items on mount
  useEffect(() => {
    loadOutboxItems();
  }, [loadOutboxItems]);

  // Process outbox when coming online
  useEffect(() => {
    if (isOnline) {
      processOutbox();
    }
  }, [isOnline, processOutbox]);

  // Auto-process outbox every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      processOutbox();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, processOutbox]);

  return {
    outboxItems,
    isOnline,
    isProcessing,
    addToOutbox,
    removeFromOutbox,
    processOutbox,
    clearOutbox,
    loadOutboxItems,
  };
};