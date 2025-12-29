/**
 * Throttle Retry Utility
 *
 * Handles SharePoint 429 (Too Many Requests) and 503 (Service Unavailable)
 * errors with exponential backoff and retry logic.
 *
 * SharePoint throttling:
 * - Returns 429 with Retry-After header when limits are hit
 * - May return 503 during high load periods
 *
 * Usage:
 * ```typescript
 * import { withRetry } from '../utils/throttleRetry';
 *
 * const result = await withRetry(
 *   () => SPContext.sp.web.lists.getByTitle('Requests').items(),
 *   { maxRetries: 3, context: 'loadRequests' }
 * );
 * ```
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { generateCorrelationId } from './correlationId';

/**
 * Retry options
 */
export interface IRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Context string for logging */
  context?: string;
  /** Correlation ID (generated if not provided) */
  correlationId?: string;
}

/**
 * Check if an error is a retryable HTTP error (429 or 503)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Check for 429 Too Many Requests
    if (message.indexOf('429') >= 0 || message.indexOf('too many requests') >= 0) {
      return true;
    }
    // Check for 503 Service Unavailable
    if (message.indexOf('503') >= 0 || message.indexOf('service unavailable') >= 0) {
      return true;
    }
    // Check for throttling in error name
    if (message.indexOf('throttl') >= 0) {
      return true;
    }
  }
  return false;
}

/**
 * Extract Retry-After header value from error if available
 * Returns delay in milliseconds, or undefined if not found
 */
function getRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof Error) {
    // Try to find retry-after in the error message or response
    const message = error.message;
    const retryAfterMatch = message.match(/retry-after[:\s]*(\d+)/i);
    if (retryAfterMatch) {
      const seconds = parseInt(retryAfterMatch[1], 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }
  return undefined;
}

/**
 * Calculate delay for next retry using exponential backoff
 *
 * @param attempt - Current retry attempt (0-based)
 * @param baseDelayMs - Base delay in ms
 * @param maxDelayMs - Maximum delay in ms
 * @param retryAfterMs - Optional Retry-After header value
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterMs?: number
): number {
  // If Retry-After header is present, respect it
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, maxDelayMs);
  }

  // Exponential backoff with jitter: base * 2^attempt + random(0-500ms)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  const delay = exponentialDelay + jitter;

  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic for throttling errors
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Promise with function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: IRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    context = 'operation',
    correlationId = generateCorrelationId('retry'),
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Execute the function
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if this is a retryable error
      if (!isRetryableError(error)) {
        // Not a throttling error, throw immediately
        throw error;
      }

      // Check if we have retries left
      if (attempt >= maxRetries) {
        SPContext.logger.error(`[ThrottleRetry] Max retries (${maxRetries}) exceeded`, error, {
          correlationId,
          context,
          attempt,
        });
        throw error;
      }

      // Calculate delay
      const retryAfterMs = getRetryAfterMs(error);
      const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, retryAfterMs);

      SPContext.logger.warn(`[ThrottleRetry] Throttled, retrying in ${Math.round(delay)}ms`, {
        correlationId,
        context,
        attempt: attempt + 1,
        maxRetries,
        delayMs: Math.round(delay),
        hasRetryAfter: retryAfterMs !== undefined,
      });

      // Wait before retrying
      await sleep(delay);
      attempt++;
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry-enabled wrapper for a function
 *
 * Usage:
 * ```typescript
 * const loadItemsWithRetry = createRetryWrapper(
 *   () => SPContext.sp.web.lists.getByTitle('Requests').items(),
 *   { context: 'loadRequests' }
 * );
 * const items = await loadItemsWithRetry();
 * ```
 */
export function createRetryWrapper<T>(
  fn: () => Promise<T>,
  options: IRetryOptions = {}
): () => Promise<T> {
  return () => withRetry(fn, options);
}

export default withRetry;
