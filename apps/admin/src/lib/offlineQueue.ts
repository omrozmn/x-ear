/**
 * Offline Queue for Admin Panel
 * 
 * Queues failed requests when offline and processes them when back online.
 * Provides UI feedback through custom events.
 */

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private storageKey = 'admin_offline_queue';
  private maxRetries = 3;
  private processing = false;

  constructor() {
    this.loadQueue();
    
    // Process queue when coming back online
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Network back online, processing queue...');
      this.processQueue();
    });

    // Check queue on page load
    if (navigator.onLine && this.queue.length > 0) {
      console.log('[OfflineQueue] Page loaded with queued requests, processing...');
      this.processQueue();
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[OfflineQueue] Loaded ${this.queue.length} queued requests`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Add a request to the queue
   */
  addRequest(config: any) {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: config.url,
      method: config.method?.toUpperCase() || 'GET',
      data: config.data,
      headers: config.headers,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(request);
    this.saveQueue();

    console.log(`[OfflineQueue] Request queued: ${request.method} ${request.url}`);

    // Dispatch event for UI feedback
    window.dispatchEvent(new CustomEvent('admin:request-queued', { 
      detail: { 
        count: this.queue.length,
        request: {
          id: request.id,
          method: request.method,
          url: request.url
        }
      } 
    }));
  }

  /**
   * Process all queued requests
   */
  async processQueue() {
    if (this.processing) {
      console.log('[OfflineQueue] Already processing queue');
      return;
    }

    if (this.queue.length === 0) {
      console.log('[OfflineQueue] Queue is empty');
      return;
    }

    if (!navigator.onLine) {
      console.log('[OfflineQueue] Still offline, cannot process queue');
      return;
    }

    this.processing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests...`);

    const requests = [...this.queue];
    this.queue = [];
    this.saveQueue();

    let successCount = 0;
    let failCount = 0;

    for (const request of requests) {
      try {
        // Dynamically import to avoid circular dependency
        const { adminApiInstance } = await import('./api');
        
        await adminApiInstance({
          url: request.url,
          method: request.method,
          data: request.data,
          headers: request.headers
        });

        successCount++;
        console.log(`[OfflineQueue] ✅ Successfully processed: ${request.method} ${request.url}`);

        // Dispatch success event
        window.dispatchEvent(new CustomEvent('admin:request-processed', {
          detail: {
            success: true,
            request: {
              id: request.id,
              method: request.method,
              url: request.url
            }
          }
        }));

      } catch (error: any) {
        failCount++;
        console.error(`[OfflineQueue] ❌ Failed to process: ${request.method} ${request.url}`, error);

        // Re-queue if still offline or retryable error
        if (!navigator.onLine || (request.retryCount < this.maxRetries && this.isRetryableError(error))) {
          request.retryCount++;
          this.queue.push(request);
          console.log(`[OfflineQueue] Re-queued request (retry ${request.retryCount}/${this.maxRetries})`);
        } else {
          console.error(`[OfflineQueue] Giving up on request after ${request.retryCount} retries`);
          
          // Dispatch failure event
          window.dispatchEvent(new CustomEvent('admin:request-failed', {
            detail: {
              request: {
                id: request.id,
                method: request.method,
                url: request.url
              },
              error: error.message
            }
          }));
        }
      }
    }

    this.saveQueue();
    this.processing = false;

    console.log(`[OfflineQueue] Processing complete: ${successCount} succeeded, ${failCount} failed, ${this.queue.length} re-queued`);

    // Dispatch completion event
    window.dispatchEvent(new CustomEvent('admin:queue-processed', {
      detail: {
        successCount,
        failCount,
        remainingCount: this.queue.length
      }
    }));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatusCodes = [429, 503, 502, 504];
    const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_NETWORK'];

    if (error.code && retryableErrorCodes.includes(error.code)) {
      return true;
    }

    if (error.response?.status && retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    return false;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get all queued requests
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Remove a specific request from queue
   */
  removeRequest(id: string) {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      console.log(`[OfflineQueue] Removed request: ${id}`);
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

// Export types for external use
export type { QueuedRequest };
