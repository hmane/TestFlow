/**
 * Request Cache and Deduplication Utility
 *
 * Provides in-flight request tracking and deduplication to prevent
 * duplicate API calls when multiple components request the same data.
 *
 * Features:
 * - In-flight request caching (same request returns same promise)
 * - Request cancellation tracking (for component unmount scenarios)
 * - Configurable TTL for cached promises
 * - Debug logging behind flag
 *
 * Usage:
 * ```typescript
 * const result = await requestCache.execute(
 *   'request-123',
 *   () => loadRequestById(123)
 * );
 * ```
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';

/**
 * Debug flag - controlled via localStorage for runtime toggling
 * Set localStorage.setItem('LRS_DEBUG', 'true') to enable verbose logging
 */
const isDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem('LRS_DEBUG') === 'true';
  } catch {
    return false;
  }
};

/**
 * Debug logger that respects the debug flag
 */
const debugLog = {
  info: (message: string, context?: Record<string, unknown>): void => {
    if (isDebugEnabled()) {
      SPContext.logger.info(`[RequestCache] ${message}`, context);
    }
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    if (isDebugEnabled()) {
      SPContext.logger.warn(`[RequestCache] ${message}`, context);
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    // Always log errors regardless of debug flag
    SPContext.logger.error(`[RequestCache] ${message}`, error, context);
  },
};

/**
 * Cached request entry
 */
interface ICachedRequest<T> {
  /** The promise for the in-flight request */
  promise: Promise<T>;
  /** Timestamp when the request was started */
  startedAt: number;
  /** Whether the request has been marked as cancelled */
  cancelled: boolean;
  /** Caller context for debugging */
  caller?: string;
}

/**
 * Request cache options
 */
export interface IRequestCacheOptions {
  /** Time-to-live for cached promises in milliseconds (default: 5000ms) */
  ttlMs?: number;
  /** Whether to log request activity (respects debug flag) */
  enableLogging?: boolean;
}

/**
 * Request cache instance
 */
export class RequestCache {
  private cache: Map<string, ICachedRequest<unknown>> = new Map();
  private cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private options: Required<IRequestCacheOptions>;
  private cleanupInterval: number | null = null;
  private static instance: RequestCache | null = null;

  constructor(options: IRequestCacheOptions = {}) {
    this.options = {
      ttlMs: options.ttlMs ?? 5000,
      enableLogging: options.enableLogging ?? true,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get singleton instance to prevent multiple instances during hot-reload
   */
  static getInstance(options: IRequestCacheOptions = {}): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache(options);
    }
    return RequestCache.instance;
  }

  /**
   * Reset singleton instance (for testing purposes)
   */
  static resetInstance(): void {
    if (RequestCache.instance) {
      RequestCache.instance.dispose();
      RequestCache.instance = null;
    }
  }

  /**
   * Execute a request with deduplication
   *
   * If a request with the same key is already in-flight, returns the existing promise.
   * Otherwise, executes the request function and caches the promise.
   *
   * @param key - Unique key for the request (e.g., 'loadRequest-123')
   * @param requestFn - Function that returns a promise for the request
   * @param caller - Optional caller context for debugging
   * @returns Promise that resolves to the request result
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    caller?: string
  ): Promise<T> {
    // Check for existing in-flight request
    const existing = this.cache.get(key) as ICachedRequest<T> | undefined;

    if (existing && !existing.cancelled) {
      const age = Date.now() - existing.startedAt;

      // If existing request is still valid (within TTL), return it
      if (age < this.options.ttlMs) {
        if (this.options.enableLogging) {
          debugLog.info('Returning cached in-flight request', {
            key,
            ageMs: age,
            caller,
            originalCaller: existing.caller,
          });
        }
        return existing.promise;
      }

      // Request is stale, remove it
      this.cache.delete(key);
    }

    // Create new request
    if (this.options.enableLogging) {
      debugLog.info('Starting new request', { key, caller });
    }

    const startedAt = Date.now();

    // Helper to schedule cleanup after TTL, tracked for disposal
    const scheduleCleanup = (): void => {
      // Clear any existing cleanup timer for this key
      const existing = this.cleanupTimers.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        this.cleanupTimers.delete(key);
        const cached = this.cache.get(key);
        if (cached && cached.startedAt === startedAt) {
          this.cache.delete(key);
        }
      }, this.options.ttlMs);
      this.cleanupTimers.set(key, timer);
    };

    const promise = requestFn()
      .then((result) => {
        if (this.options.enableLogging) {
          debugLog.info('Request completed', {
            key,
            durationMs: Date.now() - startedAt,
            caller,
          });
        }
        scheduleCleanup();
        return result;
      })
      .catch((error) => {
        debugLog.error('Request failed', error, { key, caller });
        // Remove from cache on error so next attempt can retry
        this.cache.delete(key);
        scheduleCleanup();
        throw error;
      });

    this.cache.set(key, {
      promise,
      startedAt,
      cancelled: false,
      caller,
    });

    return promise;
  }

  /**
   * Cancel a pending request by key
   *
   * Note: This doesn't actually abort the HTTP request (PnP doesn't support that),
   * but it marks the request as cancelled so the result will be ignored.
   *
   * @param key - The request key to cancel
   */
  cancel(key: string): void {
    const cached = this.cache.get(key);
    if (cached) {
      cached.cancelled = true;
      if (this.options.enableLogging) {
        debugLog.info('Request cancelled', { key, caller: cached.caller });
      }
    }
  }

  /**
   * Cancel all requests matching a prefix
   *
   * @param prefix - The key prefix to match (e.g., 'loadRequest-' to cancel all request loads)
   */
  cancelByPrefix(prefix: string): void {
    let cancelledCount = 0;
    this.cache.forEach((cached, key) => {
      // Check if key starts with prefix (compatible with older ES versions)
      if (key.indexOf(prefix) === 0) {
        cached.cancelled = true;
        cancelledCount++;
      }
    });

    if (cancelledCount > 0 && this.options.enableLogging) {
      debugLog.info('Cancelled requests by prefix', { prefix, count: cancelledCount });
    }
  }

  /**
   * Check if a request is cancelled
   *
   * @param key - The request key to check
   * @returns true if the request was cancelled
   */
  isCancelled(key: string): boolean {
    const cached = this.cache.get(key);
    return cached?.cancelled ?? false;
  }

  /**
   * Clear all cached requests and their cleanup timers
   */
  clear(): void {
    if (this.options.enableLogging) {
      debugLog.info('Clearing all cached requests', { count: this.cache.size });
    }
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.clear();
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Start periodic cleanup of stale entries
   */
  private startCleanup(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => {
        const now = Date.now();
        let removedCount = 0;

        this.cache.forEach((cached, key) => {
          if (now - cached.startedAt > this.options.ttlMs * 2) {
            this.cache.delete(key);
            removedCount++;
          }
        });

        if (removedCount > 0 && this.options.enableLogging) {
          debugLog.info('Cleaned up stale cache entries', { removed: removedCount });
        }
      }, this.options.ttlMs * 2);
    }
  }

  /**
   * Stop the cleanup interval
   */
  dispose(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Global request cache instance
 * Use this for all SharePoint/Graph API calls
 * Uses singleton pattern to prevent multiple intervals during hot-reload
 */
export const requestCache = RequestCache.getInstance({
  ttlMs: 5000, // 5 second TTL for in-flight requests
  enableLogging: true,
});

/**
 * Create a request key for request operations
 */
export const createRequestKey = (operation: string, itemId?: number | string): string => {
  return itemId ? `${operation}-${itemId}` : operation;
};

/**
 * Debug flag utilities
 */
export const debugFlag = {
  /**
   * Check if debug mode is enabled
   */
  isEnabled: isDebugEnabled,

  /**
   * Enable debug mode
   */
  enable: (): void => {
    try {
      localStorage.setItem('LRS_DEBUG', 'true');
      SPContext.logger.info('Debug mode enabled. Refresh to see verbose logging.');
    } catch {
      // localStorage not available
    }
  },

  /**
   * Disable debug mode
   */
  disable: (): void => {
    try {
      localStorage.removeItem('LRS_DEBUG');
      SPContext.logger.info('Debug mode disabled.');
    } catch {
      // localStorage not available
    }
  },
};

export default requestCache;
