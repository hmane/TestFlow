/**
 * Throttle Retry Utility Tests
 */

// Mock SPContext.logger BEFORE importing the module
jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
  },
}));

import { withRetry, createRetryWrapper } from '../throttleRetry';

// Get reference to mocked logger
const getMockLogger = () => {
  const { SPContext } = jest.requireMock('spfx-toolkit/lib/utilities/context');
  return SPContext.logger;
};

describe('Throttle Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should return result on successful first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { context: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately for non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(withRetry(fn, { context: 'test' })).rejects.toThrow('Not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce('success after retry');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on throttling error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Request was throttled'))
        .mockResolvedValueOnce('recovered');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('429 Too Many Requests'));

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10, context: 'test' })
      ).rejects.toThrow('429 Too Many Requests');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use default options when not provided', async () => {
      const fn = jest.fn().mockResolvedValue('default');

      const result = await withRetry(fn);

      expect(result).toBe('default');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should log warning on retry', async () => {
      const mockLogger = getMockLogger();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(mockLogger.warn).toHaveBeenCalled();
      const warnCall = mockLogger.warn.mock.calls[0];
      expect(warnCall[0]).toContain('Throttled');
    });

    it('should log error when max retries exceeded', async () => {
      const mockLogger = getMockLogger();
      const fn = jest.fn().mockRejectedValue(new Error('429'));

      await expect(
        withRetry(fn, { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10, context: 'test' })
      ).rejects.toThrow('429');

      expect(mockLogger.error).toHaveBeenCalled();
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[0]).toContain('Max retries');
    });

    it('should use provided correlation ID', async () => {
      const mockLogger = getMockLogger();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, {
        context: 'test',
        correlationId: 'custom-id-123',
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ correlationId: 'custom-id-123' })
      );
    });
  });

  describe('createRetryWrapper', () => {
    it('should create a reusable retry-enabled function', async () => {
      const fn = jest.fn().mockResolvedValue('wrapped result');
      const wrappedFn = createRetryWrapper(fn, { context: 'wrapper-test' });

      const result = await wrappedFn();

      expect(result).toBe('wrapped result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should apply retry logic on each call', async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('429'));
        }
        return Promise.resolve('success');
      });

      const wrappedFn = createRetryWrapper(fn, { context: 'wrapper-test', baseDelayMs: 1, maxDelayMs: 10 });
      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use default options', async () => {
      const fn = jest.fn().mockResolvedValue('default wrapped');
      const wrappedFn = createRetryWrapper(fn);

      const result = await wrappedFn();

      expect(result).toBe('default wrapped');
    });
  });

  describe('Error detection', () => {
    it('should detect 429 in error message (case insensitive)', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should detect "too many requests" in error message', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error: Too Many Requests'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('success');
    });

    it('should detect "service unavailable" in error message', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { context: 'test', baseDelayMs: 1, maxDelayMs: 10 });

      expect(result).toBe('success');
    });

    it('should not retry on 404 errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('404 Not Found'));

      await expect(withRetry(fn, { context: 'test' })).rejects.toThrow('404 Not Found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 500 errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(withRetry(fn, { context: 'test' })).rejects.toThrow('500 Internal Server Error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on non-Error objects', async () => {
      const fn = jest.fn().mockRejectedValue('string error');

      await expect(withRetry(fn, { context: 'test' })).rejects.toBe('string error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
