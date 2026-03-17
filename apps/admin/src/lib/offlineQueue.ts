/**
 * Offline Queue for Admin Panel
 *
 * Queues failed requests when offline and processes them when back online.
 * Provides UI feedback through custom events.
 */

import type { AxiosError, AxiosRequestConfig } from 'axios';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

type QueueableRequestConfig = AxiosRequestConfig<unknown>;

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private storageKey = 'admin_offline_queue';
  private maxRetries = 3;
  private processing = false;

  constructor() {
    this.loadQueue();

    // Process queue when coming back online
    window.addEventListener('online', () => {
      this.processQueue();
    });

    // Check queue on page load
    if (navigator.onLine && this.queue.length > 0) {
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
      }
    } catch {
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable - silently fail
    }
  }

  /**
   * Add a request to the queue
   */
  addRequest(config: QueueableRequestConfig) {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: config.url ?? '',
      method: config.method?.toUpperCase() || 'GET',
      data: config.data,
      headers: normalizeHeaders(config.headers),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(request);
    this.saveQueue();

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
    if (this.processing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.processing = true;

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

      } catch (error: unknown) {
        failCount++;

        // Re-queue if still offline or retryable error
        if (!navigator.onLine || (request.retryCount < this.maxRetries && this.isRetryableError(error))) {
          request.retryCount++;
          this.queue.push(request);
        } else {
          // Dispatch failure event
          window.dispatchEvent(new CustomEvent('admin:request-failed', {
            detail: {
              request: {
                id: request.id,
                method: request.method,
                url: request.url
              },
              error: getErrorMessage(error)
            }
          }));
        }
      }
    }

    this.saveQueue();
    this.processing = false;

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
  private isRetryableError(error: unknown): boolean {
    const retryableStatusCodes = [429, 503, 502, 504];
    const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_NETWORK'];

    if (isAxiosError(error) && error.code && retryableErrorCodes.includes(error.code)) {
      return true;
    }

    if (isAxiosError(error) && error.response?.status && retryableStatusCodes.includes(error.response.status)) {
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
  }

  /**
   * Remove a specific request from queue
   */
  removeRequest(id: string) {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

// Export types for external use
export type { QueuedRequest };

function normalizeHeaders(headers: QueueableRequestConfig['headers']): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const normalized = typeof headers.toJSON === 'function'
    ? headers.toJSON()
    : headers;

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(', ');
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function isAxiosError(error: unknown): error is AxiosError<unknown> {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
