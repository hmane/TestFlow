/**
 * Correlation ID Utility
 *
 * Provides unique correlation IDs for tracking requests across
 * components and service calls. Useful for debugging and log correlation.
 *
 * Features:
 * - Generate unique IDs with configurable prefix
 * - Context wrapper for passing IDs through async operations
 * - Integration with SPContext.logger for log correlation
 *
 * Usage:
 * ```typescript
 * const correlationId = generateCorrelationId('loadRequest');
 * SPContext.logger.info('Loading request', { correlationId, itemId: 123 });
 * ```
 */

/**
 * Generate a unique correlation ID
 *
 * Format: {prefix}-{timestamp}-{random}
 * Example: loadRequest-1735401234567-a1b2c3
 *
 * @param prefix - Optional prefix for the correlation ID
 * @returns Unique correlation ID string
 */
export function generateCorrelationId(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Context for passing correlation ID through service calls
 */
export interface ICorrelationContext {
  /** The correlation ID for this operation */
  correlationId: string;
  /** Operation name for logging */
  operation: string;
  /** Start timestamp */
  startedAt: number;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Create a correlation context for an operation
 *
 * @param operation - Name of the operation (e.g., 'submitRequest', 'loadRequest')
 * @param metadata - Optional additional context data
 * @returns Correlation context object
 */
export function createCorrelationContext(
  operation: string,
  metadata?: Record<string, unknown>
): ICorrelationContext {
  return {
    correlationId: generateCorrelationId(operation),
    operation,
    startedAt: Date.now(),
    metadata,
  };
}

/**
 * Get duration from correlation context
 *
 * @param context - Correlation context
 * @returns Duration in milliseconds
 */
export function getContextDuration(context: ICorrelationContext): number {
  return Date.now() - context.startedAt;
}

/**
 * Create log context from correlation context
 *
 * Returns an object suitable for passing to SPContext.logger methods.
 *
 * @param context - Correlation context
 * @param additionalData - Additional data to include
 * @returns Log context object
 */
export function createLogContext(
  context: ICorrelationContext,
  additionalData?: Record<string, unknown>
): Record<string, unknown> {
  return {
    correlationId: context.correlationId,
    operation: context.operation,
    durationMs: getContextDuration(context),
    ...context.metadata,
    ...additionalData,
  };
}

/**
 * Correlation ID storage for current operation context
 *
 * Uses a simple stack to allow nested operations to maintain their own correlation IDs
 * while child operations can reference parent IDs.
 */
class CorrelationStack {
  private stack: ICorrelationContext[] = [];

  /**
   * Push a new correlation context onto the stack
   */
  push(context: ICorrelationContext): void {
    this.stack.push(context);
  }

  /**
   * Pop the current correlation context from the stack
   */
  pop(): ICorrelationContext | undefined {
    return this.stack.pop();
  }

  /**
   * Get the current correlation context without removing it
   */
  current(): ICorrelationContext | undefined {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
  }

  /**
   * Get the current correlation ID
   */
  currentId(): string | undefined {
    const current = this.current();
    return current?.correlationId;
  }

  /**
   * Clear all correlation contexts
   */
  clear(): void {
    this.stack = [];
  }
}

/**
 * Global correlation stack instance
 */
export const correlationStack = new CorrelationStack();

/**
 * Execute a function with a correlation context
 *
 * Automatically pushes/pops the context and includes timing information.
 *
 * @param operation - Operation name
 * @param fn - Function to execute
 * @param metadata - Optional metadata
 * @returns Result of the function
 */
export async function withCorrelation<T>(
  operation: string,
  fn: (context: ICorrelationContext) => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const context = createCorrelationContext(operation, metadata);
  correlationStack.push(context);

  try {
    return await fn(context);
  } finally {
    correlationStack.pop();
  }
}

/**
 * Synchronous version of withCorrelation
 */
export function withCorrelationSync<T>(
  operation: string,
  fn: (context: ICorrelationContext) => T,
  metadata?: Record<string, unknown>
): T {
  const context = createCorrelationContext(operation, metadata);
  correlationStack.push(context);

  try {
    return fn(context);
  } finally {
    correlationStack.pop();
  }
}

export default {
  generateCorrelationId,
  createCorrelationContext,
  getContextDuration,
  createLogContext,
  correlationStack,
  withCorrelation,
  withCorrelationSync,
};
