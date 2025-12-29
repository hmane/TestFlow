/**
 * Debug Logger Utility
 *
 * Provides conditional debug logging that respects the LRS_DEBUG flag.
 * Use this wrapper around SPContext.logger to enable/disable verbose
 * logging at runtime without code changes.
 *
 * Features:
 * - Runtime toggle via localStorage.setItem('LRS_DEBUG', 'true')
 * - Wraps SPContext.logger methods
 * - Preserves full context information for debugging
 *
 * Usage:
 * ```typescript
 * import { debugLogger } from '../utils/debugLogger';
 *
 * // Only logs if LRS_DEBUG=true
 * debugLogger.info('Cache hit', { key: 'loadRequest-123' });
 *
 * // Always logs (errors should always be visible)
 * debugLogger.error('Request failed', error, { itemId: 123 });
 * ```
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';

/**
 * Debug flag - controlled via localStorage for runtime toggling
 * Set localStorage.setItem('LRS_DEBUG', 'true') to enable verbose logging
 */
export function isDebugEnabled(): boolean {
  try {
    return localStorage.getItem('LRS_DEBUG') === 'true';
  } catch {
    return false;
  }
}

/**
 * Debug logger that respects the debug flag
 *
 * - info, warn: Only log if debug mode is enabled
 * - error, success: Always log regardless of debug flag
 */
export const debugLogger = {
  /**
   * Log info message (only if debug enabled)
   */
  info: (message: string, context?: Record<string, unknown>): void => {
    if (isDebugEnabled()) {
      SPContext.logger.info(message, context);
    }
  },

  /**
   * Log warning message (only if debug enabled)
   */
  warn: (message: string, context?: Record<string, unknown>): void => {
    if (isDebugEnabled()) {
      SPContext.logger.warn(message, context);
    }
  },

  /**
   * Log error message (always logs - errors should be visible)
   */
  error: (message: string, error?: unknown, context?: Record<string, unknown>): void => {
    SPContext.logger.error(message, error, context);
  },

  /**
   * Log success message (always logs - success confirmations are important)
   */
  success: (message: string, context?: Record<string, unknown>): void => {
    SPContext.logger.success(message, context);
  },
};

/**
 * Debug flag utilities for runtime control
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
      SPContext.logger.info('[DebugLogger] Debug mode enabled. Refresh to see verbose logging.');
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
      SPContext.logger.info('[DebugLogger] Debug mode disabled.');
    } catch {
      // localStorage not available
    }
  },

  /**
   * Toggle debug mode
   */
  toggle: (): boolean => {
    const newState = !isDebugEnabled();
    if (newState) {
      debugFlag.enable();
    } else {
      debugFlag.disable();
    }
    return newState;
  },
};

export default debugLogger;
