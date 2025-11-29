/**
 * IndexedDB Outbox Implementation
 * Handles offline operations, retry logic, and data synchronization
 */

class IndexedDBOutbox {
    constructor() {
        this.dbName = 'XEarOutbox';
        this.dbVersion = 1;
        this.storeName = 'operations';
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        // Initialize database
        this.initDB();
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingOperations();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
        
        // Periodic sync attempt
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.syncPendingOperations();
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Initialize IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
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
    async addOperation(operation) {
        if (!this.db) await this.initDB();
        
        const operationData = {
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
            const idempotencyKey = (operationData.headers && (operationData.headers['Idempotency-Key'] || operationData.headers['idempotency-key'] || operationData.headers['Idempotency-key'])) || null;
            if (idempotencyKey) {
                const pendingOps = await this.getPendingOperations();
                const existing = pendingOps.find(op => {
                    if (!op || !op.headers) return false;
                    const existingKey = op.headers['Idempotency-Key'] || op.headers['idempotency-key'] || op.headers['Idempotency-key'];
                    return op.endpoint === operationData.endpoint && (op.method || 'GET') === (operationData.method || 'GET') && existingKey === idempotencyKey;
                });
                if (existing) {
                    // emit a dedup event and return existing operation
                    this.emitOutboxEvent('operation-duplicate', existing);
                    return existing;
                }
            }
        } catch (e) {
            // on any error during dedup, continue and attempt to add the operation normally
            console.warn('Outbox deduplication check failed, proceeding to add operation:', e);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
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
    async getPendingOperations() {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('status');
            const request = index.getAll('pending');
            
            request.onsuccess = () => {
                // Sort by priority and timestamp
                const operations = request.result.sort((a, b) => {
                    const priorityOrder = { high: 3, normal: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 2;
                    const bPriority = priorityOrder[b.priority] || 2;
                    
                    if (aPriority !== bPriority) {
                        return bPriority - aPriority; // Higher priority first
                    }
                    return a.timestamp - b.timestamp; // Older first
                });
                
                resolve(operations);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update operation status
     */
    async updateOperation(id, updates) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
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
    async removeOperation(id) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
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
    async syncPendingOperations() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        this.emitOutboxEvent('sync-started');
        
        try {
            const pendingOps = await this.getPendingOperations();
            let successCount = 0;
            let failureCount = 0;
            
            for (const operation of pendingOps) {
                try {
                    const result = await this.executeOperation(operation);
                    this.emitOutboxEvent('operation-succeeded', {operation, result});
                    await this.removeOperation(operation.id);
                    successCount++;
                } catch (error) {
                    console.error('Operation failed:', error);
                    
                    // Update retry count
                    const retryCount = operation.retryCount + 1;
                    
                    if (retryCount >= operation.maxRetries) {
                        // Mark as failed
                        await this.updateOperation(operation.id, {
                            status: 'failed',
                            retryCount,
                            lastError: error.message,
                            failedAt: new Date().toISOString()
                        });
                    } else {
                        // Schedule retry
                        await this.updateOperation(operation.id, {
                            retryCount,
                            lastError: error.message,
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
    async executeOperation(operation) {
        const { method, endpoint, data, headers = {} } = operation;
        
        // Use OptimisticAPIClient if available for PUT operations
        if (method === 'PUT' && window.OptimisticAPIClient) {
            return await window.OptimisticAPIClient.putWithOptimisticLock(endpoint, data);
        }
        
        // Fallback to regular API call
        const response = await fetch(endpoint, {
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
    }

    /**
     * Get retry delay based on retry count (exponential backoff)
     */
    getRetryDelay(retryCount) {
        const baseDelay = 1000; // 1 second
        const maxDelay = 60000; // 1 minute
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
    }

    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Emit outbox events
     */
    emitOutboxEvent(type, data = {}) {
        window.dispatchEvent(new CustomEvent('outbox-event', {
            detail: { type, data, timestamp: Date.now() }
        }));
    }

    /**
     * Get outbox statistics
     */
    async getStats() {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const operations = request.result;
                const stats = {
                    total: operations.length,
                    pending: operations.filter(op => op.status === 'pending').length,
                    failed: operations.filter(op => op.status === 'failed').length,
                    oldestPending: null,
                    newestPending: null
                };
                
                const pendingOps = operations.filter(op => op.status === 'pending');
                if (pendingOps.length > 0) {
                    stats.oldestPending = Math.min(...pendingOps.map(op => op.timestamp));
                    stats.newestPending = Math.max(...pendingOps.map(op => op.timestamp));
                }
                
                resolve(stats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all failed operations
     */
    async clearFailedOperations() {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('status');
            const request = index.openCursor(IDBKeyRange.only('failed'));
            
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
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
}

// Create global instance
window.IndexedDBOutbox = new IndexedDBOutbox();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBOutbox;
}