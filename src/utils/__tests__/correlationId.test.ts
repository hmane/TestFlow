/**
 * Correlation ID Utility Tests
 */

import {
  generateCorrelationId,
  createCorrelationContext,
  getContextDuration,
  createLogContext,
  correlationStack,
  withCorrelation,
  withCorrelationSync,
  type ICorrelationContext,
} from '../correlationId';

describe('Correlation ID Utility', () => {
  describe('generateCorrelationId', () => {
    it('should generate a unique ID without prefix', () => {
      const id = generateCorrelationId();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      // Format: {timestamp}-{random}
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate a unique ID with prefix', () => {
      const id = generateCorrelationId('loadRequest');

      expect(id).toBeDefined();
      // Format: {prefix}-{timestamp}-{random}
      expect(id).toMatch(/^loadRequest-\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs on each call', () => {
      const id1 = generateCorrelationId('test');
      const id2 = generateCorrelationId('test');

      expect(id1).not.toBe(id2);
    });

    it('should handle empty string prefix', () => {
      const id = generateCorrelationId('');

      // Empty prefix is treated as no prefix
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('createCorrelationContext', () => {
    it('should create context with operation name', () => {
      const context = createCorrelationContext('submitRequest');

      expect(context.operation).toBe('submitRequest');
      expect(context.correlationId).toMatch(/^submitRequest-\d+-[a-z0-9]+$/);
      expect(context.startedAt).toBeLessThanOrEqual(Date.now());
      expect(context.metadata).toBeUndefined();
    });

    it('should create context with metadata', () => {
      const metadata = { itemId: 123, userId: 'user@example.com' };
      const context = createCorrelationContext('loadRequest', metadata);

      expect(context.operation).toBe('loadRequest');
      expect(context.metadata).toEqual(metadata);
    });

    it('should set startedAt to current timestamp', () => {
      const before = Date.now();
      const context = createCorrelationContext('test');
      const after = Date.now();

      expect(context.startedAt).toBeGreaterThanOrEqual(before);
      expect(context.startedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('getContextDuration', () => {
    it('should return duration in milliseconds', async () => {
      const context = createCorrelationContext('test');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      const duration = getContextDuration(context);

      // Allow for timing variance in CI environments
      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThan(300);
    });

    it('should return 0 for immediate call', () => {
      const context = createCorrelationContext('test');
      const duration = getContextDuration(context);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(10); // Very small duration
    });
  });

  describe('createLogContext', () => {
    it('should create log context from correlation context', () => {
      const context = createCorrelationContext('test');
      const logContext = createLogContext(context);

      expect(logContext.correlationId).toBe(context.correlationId);
      expect(logContext.operation).toBe('test');
      expect(typeof logContext.durationMs).toBe('number');
    });

    it('should include metadata in log context', () => {
      const context = createCorrelationContext('test', { itemId: 123 });
      const logContext = createLogContext(context);

      expect(logContext.itemId).toBe(123);
    });

    it('should include additional data', () => {
      const context = createCorrelationContext('test');
      const logContext = createLogContext(context, { status: 'success', count: 5 });

      expect(logContext.status).toBe('success');
      expect(logContext.count).toBe(5);
    });

    it('should allow additional data to override metadata', () => {
      const context = createCorrelationContext('test', { value: 'original' });
      const logContext = createLogContext(context, { value: 'override' });

      expect(logContext.value).toBe('override');
    });
  });

  describe('CorrelationStack', () => {
    beforeEach(() => {
      correlationStack.clear();
    });

    it('should push and pop contexts', () => {
      const context1 = createCorrelationContext('op1');
      const context2 = createCorrelationContext('op2');

      correlationStack.push(context1);
      correlationStack.push(context2);

      expect(correlationStack.current()).toBe(context2);

      const popped = correlationStack.pop();
      expect(popped).toBe(context2);
      expect(correlationStack.current()).toBe(context1);
    });

    it('should return undefined for current when stack is empty', () => {
      expect(correlationStack.current()).toBeUndefined();
      expect(correlationStack.currentId()).toBeUndefined();
    });

    it('should return current correlation ID', () => {
      const context = createCorrelationContext('test');
      correlationStack.push(context);

      expect(correlationStack.currentId()).toBe(context.correlationId);
    });

    it('should clear all contexts', () => {
      correlationStack.push(createCorrelationContext('op1'));
      correlationStack.push(createCorrelationContext('op2'));
      correlationStack.push(createCorrelationContext('op3'));

      correlationStack.clear();

      expect(correlationStack.current()).toBeUndefined();
    });

    it('should return undefined when popping empty stack', () => {
      expect(correlationStack.pop()).toBeUndefined();
    });
  });

  describe('withCorrelation', () => {
    beforeEach(() => {
      correlationStack.clear();
    });

    it('should execute function with correlation context', async () => {
      let capturedContext: ICorrelationContext | undefined;

      await withCorrelation('testOp', async (context) => {
        capturedContext = context;
        return 'result';
      });

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.operation).toBe('testOp');
    });

    it('should return function result', async () => {
      const result = await withCorrelation('testOp', async () => {
        return { success: true, value: 42 };
      });

      expect(result).toEqual({ success: true, value: 42 });
    });

    it('should push context during execution', async () => {
      let contextDuringExecution: ICorrelationContext | undefined;

      await withCorrelation('testOp', async () => {
        contextDuringExecution = correlationStack.current();
        return null;
      });

      expect(contextDuringExecution).toBeDefined();
      expect(contextDuringExecution?.operation).toBe('testOp');
    });

    it('should pop context after execution', async () => {
      await withCorrelation('testOp', async () => 'done');

      expect(correlationStack.current()).toBeUndefined();
    });

    it('should pop context even on error', async () => {
      await expect(
        withCorrelation('testOp', async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');

      expect(correlationStack.current()).toBeUndefined();
    });

    it('should include metadata in context', async () => {
      let capturedContext: ICorrelationContext | undefined;

      await withCorrelation(
        'testOp',
        async (context) => {
          capturedContext = context;
          return null;
        },
        { itemId: 456 }
      );

      expect(capturedContext?.metadata).toEqual({ itemId: 456 });
    });

    it('should support nested correlations', async () => {
      const operations: string[] = [];

      await withCorrelation('outer', async () => {
        operations.push(correlationStack.current()?.operation || 'none');

        await withCorrelation('inner', async () => {
          operations.push(correlationStack.current()?.operation || 'none');
          return null;
        });

        operations.push(correlationStack.current()?.operation || 'none');
        return null;
      });

      expect(operations).toEqual(['outer', 'inner', 'outer']);
    });
  });

  describe('withCorrelationSync', () => {
    beforeEach(() => {
      correlationStack.clear();
    });

    it('should execute function synchronously with correlation context', () => {
      let capturedContext: ICorrelationContext | undefined;

      withCorrelationSync('syncOp', (context) => {
        capturedContext = context;
        return 'result';
      });

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.operation).toBe('syncOp');
    });

    it('should return function result', () => {
      const result = withCorrelationSync('syncOp', () => 100);

      expect(result).toBe(100);
    });

    it('should pop context after execution', () => {
      withCorrelationSync('syncOp', () => 'done');

      expect(correlationStack.current()).toBeUndefined();
    });

    it('should pop context even on error', () => {
      expect(() =>
        withCorrelationSync('syncOp', () => {
          throw new Error('sync error');
        })
      ).toThrow('sync error');

      expect(correlationStack.current()).toBeUndefined();
    });
  });
});
