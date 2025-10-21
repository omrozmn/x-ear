/**
 * IndexedDB Outbox Implementation
 * Handles offline operations, retry logic, and data synchronization
 */

export interface OutboxOperation {
  id?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp?: number;
  status?: 'pending' | 'failed' | 'completed';
  retryCount?: number;
  maxRetries?: number;
  priority?: 'high' | 'normal' | 'low';
  createdAt?: string;
  lastError?: string;
  failedAt?: string;
  nextRetryAt?: string;
}

export interface OutboxStats {
  total: number;
  pending: number;
  failed: number;
  oldestPending: number | null;
  newestPending: number | null;
}

export interface OutboxEvent {
  type: 'operation-added' | 'operation-updated' | 'operation-removed' | 'operation-succeeded' | 'operation-duplicate' | 'sync-started' | 'sync-completed' | 'sync-failed' | 'failed-operations-cleared';
  data: unknown;
  timestamp: number;
}

export class IndexedDBOutbox {
  private dbName = 'XEarOutbox';
  private dbVersion = 1;
  private storeName = 'operations';
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncInterval: number | null = null;

  constructor() {
    this.initDB();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startPeriodicSync(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingOperations();
      }
    }, 120000); // Changed from 30000 (30s) to 120000 (2 minutes) to reduce excessive requests
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create operations store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }
      };
    });
  }

  /**
   * Add operation to outbox
   */
  async addOperation(operation: OutboxOperation): Promise<OutboxOperation> {
    if (!this.db) await this.initDB();

    const operationData: OutboxOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
      priority: operation.priority || 'normal',
      createdAt: new Date().toISOString()
    };

    // Deduplication: if Idempotency-Key provided and there is already a pending
    // operation with same endpoint+method+idempotency key, return the existing one
    try {
      const idempotencyKey = operationData.headers?.['Idempotency-Key'] || 
                            operationData.headers?.['idempotency-key'] || 
                            operationData.headers?.['Idempotency-key'];
      
      if (idempotencyKey) {
        const pendingOps = await this.getPendingOperations();
        const existing = pendingOps.find(op => {
          if (!op || !op.headers) return false;
          const existingKey = op.headers['Idempotency-Key'] || 
                             op.headers['idempotency-key'] || 
                             op.headers['Idempotency-key'];
          return op.endpoint === operationData.endpoint && 
                 (op.method || 'GET') === (operationData.method || 'GET') && 
                 existingKey === idempotencyKey;
        });
        
        if (existing) {
          this.emitOutboxEvent('operation-duplicate', existing);
          return existing;
        }
      }
    } catch (e) {
      console.warn('Outbox deduplication check failed, proceeding to add operation:', e);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(operationData);

      request.onsuccess = () => {
        this.emitOutboxEvent('operation-added', operationData);
        resolve(operationData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<OutboxOperation[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        // Sort by priority and timestamp
        const operations = request.result.sort((a: OutboxOperation, b: OutboxOperation) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority || 'normal'];
          const bPriority = priorityOrder[b.priority || 'normal'];

          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          return (a.timestamp || 0) - (b.timestamp || 0); // Older first
        });

        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update operation status
   */
  async updateOperation(id: string, updates: Partial<OutboxOperation>): Promise<OutboxOperation> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (!operation) {
          reject(new Error('Operation not found'));
          return;
        }

        const updatedOperation = { ...operation, ...updates };
        const putRequest = store.put(updatedOperation);

        putRequest.onsuccess = () => {
          this.emitOutboxEvent('operation-updated', updatedOperation);
          resolve(updatedOperation);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove operation from outbox
   */
  async removeOperation(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.emitOutboxEvent('operation-removed', { id });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync pending operations
   */
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    this.emitOutboxEvent('sync-started', {});

    try {
      const pendingOps = await this.getPendingOperations();
      let successCount = 0;
      let failureCount = 0;

      for (const operation of pendingOps) {
        try {
          const result = await this.executeOperation(operation);
          this.emitOutboxEvent('operation-succeeded', { operation, result });
          await this.removeOperation(operation.id!);
          successCount++;
        } catch (error) {
          console.error('Operation failed:', error);

          // Update retry count
          const retryCount = (operation.retryCount || 0) + 1;

          if (retryCount >= (operation.maxRetries || 3)) {
            // Mark as failed
            await this.updateOperation(operation.id!, {
              status: 'failed',
              retryCount,
              lastError: error instanceof Error ? error.message : String(error),
              failedAt: new Date().toISOString()
            });
          } else {
            // Schedule retry
            await this.updateOperation(operation.id!, {
              retryCount,
              lastError: error instanceof Error ? error.message : String(error),
              nextRetryAt: new Date(Date.now() + this.getRetryDelay(retryCount)).toISOString()
            });
          }

          failureCount++;
        }
      }

      this.emitOutboxEvent('sync-completed', {
        total: pendingOps.length,
        success: successCount,
        failures: failureCount
      });

    } catch (error) {
      console.error('Sync failed:', error);
      this.emitOutboxEvent('sync-failed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: OutboxOperation): Promise<unknown> {
    const { method, endpoint, data, headers = {} } = operation;

    // Resolve relative endpoints against the correct API base URL
    const API_BASE_URL = 'http://localhost:5003';
    const resolvedEndpoint = endpoint.startsWith('http') 
      ? endpoint 
      : `${API_BASE_URL}${endpoint}`;

    // If operation references a stored blob, retrieve it and send multipart/form-data
    if (data && (data as any).blobId) {
      const { indexedDBManager } = await import('@/utils/indexeddb');
      const blobRef = await indexedDBManager.getFileBlob((data as any).blobId);
      if (!blobRef) throw new Error('Blob not found for outbox operation');

      const form = new FormData();
      form.append('file', blobRef.blob, blobRef.filename || 'file');
      // append metadata
      if ((data as any).filename) form.append('filename', (data as any).filename);
      if ((data as any).mime) form.append('mime', (data as any).mime);

      try {
        const response = await fetch(resolvedEndpoint, {
          method,
          headers: {
            // Let the browser set Content-Type with boundary for FormData
            ...headers
          },
          body: form
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          throw new Error('Network error: Failed to fetch. Please check your connection and ensure the server is running.');
        }
        throw error;
      }
    }

    try {
      const response = await fetch(resolvedEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Failed to fetch. Please check your connection and ensure the server is running.');
      }
      throw error;
    }
  }

  /**
   * Get retry delay based on retry count (exponential backoff)
   */
  private getRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit outbox events
   */
  private emitOutboxEvent(type: OutboxEvent['type'], data: unknown = {}): void {
    window.dispatchEvent(new CustomEvent('outbox-event', {
      detail: { type, data, timestamp: Date.now() }
    }));
  }

  /**
   * Get outbox statistics
   */
  async getStats(): Promise<OutboxStats> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const operations: OutboxOperation[] = request.result;
        const stats: OutboxStats = {
          total: operations.length,
          pending: operations.filter(op => op.status === 'pending').length,
          failed: operations.filter(op => op.status === 'failed').length,
          oldestPending: null,
          newestPending: null
        };

        const pendingOps = operations.filter(op => op.status === 'pending');
        if (pendingOps.length > 0) {
          stats.oldestPending = Math.min(...pendingOps.map(op => op.timestamp || 0));
          stats.newestPending = Math.max(...pendingOps.map(op => op.timestamp || 0));
        }

        resolve(stats);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all failed operations
   */
  async clearFailedOperations(): Promise<number> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('failed'));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          this.emitOutboxEvent('failed-operations-cleared', { count: deletedCount });
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create and export singleton instance
/**
 * In-memory fallback outbox used in non-browser environments (tests / SSR)
 * Implements the minimal subset of the API used by the app so tests can run
 * without a real IndexedDB / window environment.
 */
class InMemoryOutbox {
  private ops: OutboxOperation[] = [];

  async addOperation(operation: OutboxOperation): Promise<OutboxOperation> {
  const op: OutboxOperation = { ...operation, id: this.generateOperationId(), timestamp: Date.now(), status: 'pending', retryCount: 0, maxRetries: operation.maxRetries || 3 };
    this.ops.push(op);
    return op;
  }

  async getPendingOperations(): Promise<OutboxOperation[]> {
    return this.ops.filter(op => op.status === 'pending');
  }

  async updateOperation(id: string, updates: Partial<OutboxOperation>): Promise<OutboxOperation> {
    const idx = this.ops.findIndex(o => o.id === id);
    if (idx === -1) throw new Error('Operation not found');
    this.ops[idx] = { ...this.ops[idx], ...updates };
    return this.ops[idx];
  }

  async removeOperation(id: string): Promise<void> {
    this.ops = this.ops.filter(o => o.id !== id);
  }

  async syncPendingOperations(): Promise<void> {
    // no-op in tests
  }

  async getStats(): Promise<OutboxStats> {
    const total = this.ops.length;
    const pending = this.ops.filter(op => op.status === 'pending').length;
    const failed = this.ops.filter(op => op.status === 'failed').length;
    return { total, pending, failed, oldestPending: null, newestPending: null };
  }

  async clearFailedOperations(): Promise<number> {
    const before = this.ops.length;
    this.ops = this.ops.filter(o => o.status !== 'failed');
    return before - this.ops.length;
  }

  destroy(): void {
    this.ops = [];
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export a browser IndexedDB-backed outbox when available, otherwise an in-memory noop used for tests/SSR
export const outbox = (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') ? new IndexedDBOutbox() : new InMemoryOutbox();