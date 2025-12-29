/**
 * Request Cache Utility Tests
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

import { requestCache, createRequestKey, debugFlag } from '../requestCache';

// Get reference to mocked logger
const getMockLogger = () => {
  const { SPContext } = jest.requireMock('spfx-toolkit/lib/utilities/context');
  return SPContext.logger;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Request Cache Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    requestCache.clear();
  });

  describe('requestCache.execute', () => {
    it('should execute request function and return result', async () => {
      const requestFn = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await requestCache.execute('test-key', requestFn);

      expect(result).toEqual({ data: 'test' });
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached promise for duplicate in-flight requests', async () => {
      let resolveRequest: (value: string) => void = () => {};
      const requestFn = jest.fn().mockReturnValue(
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        })
      );

      // Start first request
      const promise1 = requestCache.execute('duplicate-key', requestFn);

      // Start second request with same key
      const promise2 = requestCache.execute('duplicate-key', requestFn);

      // Resolve the promise
      resolveRequest('result');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(requestFn).toHaveBeenCalledTimes(1); // Only called once!
    });

    it('should remove cache entry on error', async () => {
      const error = new Error('Request failed');
      const requestFn = jest.fn().mockRejectedValue(error);

      await expect(requestCache.execute('error-key', requestFn)).rejects.toThrow('Request failed');

      // Second request should create new promise (not return cached error)
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await requestCache.execute('error-key', successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should pass caller context for debugging', async () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('true'); // Enable debug
      const requestFn = jest.fn().mockResolvedValue('result');

      await requestCache.execute('caller-test', requestFn, 'TestComponent');

      // Debug logging should have been called with caller info
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle different keys independently', async () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        requestCache.execute('key-1', fn1),
        requestCache.execute('key-2', fn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestCache.cancel', () => {
    it('should mark request as cancelled', async () => {
      let resolveRequest: (value: string) => void = () => {};
      const requestFn = jest.fn().mockReturnValue(
        new Promise<string>((resolve) => {
          resolveRequest = resolve;
        })
      );

      // Start request
      const promise = requestCache.execute('cancel-test', requestFn);

      // Cancel it
      requestCache.cancel('cancel-test');

      // Check it's cancelled
      expect(requestCache.isCancelled('cancel-test')).toBe(true);

      // Resolve to complete the test
      resolveRequest('result');
      await promise;
    });

    it('should do nothing for non-existent key', () => {
      // Should not throw
      expect(() => requestCache.cancel('non-existent')).not.toThrow();
    });
  });

  describe('requestCache.cancelByPrefix', () => {
    it('should cancel all requests with matching prefix', async () => {
      // Create multiple pending requests
      const createPendingRequest = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('result'), 1000);
        });

      requestCache.execute('load-1', createPendingRequest);
      requestCache.execute('load-2', createPendingRequest);
      requestCache.execute('load-3', createPendingRequest);
      requestCache.execute('other-1', createPendingRequest);

      // Cancel all 'load-' requests
      requestCache.cancelByPrefix('load-');

      expect(requestCache.isCancelled('load-1')).toBe(true);
      expect(requestCache.isCancelled('load-2')).toBe(true);
      expect(requestCache.isCancelled('load-3')).toBe(true);
      expect(requestCache.isCancelled('other-1')).toBe(false);
    });

    it('should do nothing if no keys match prefix', () => {
      // Should not throw
      expect(() => requestCache.cancelByPrefix('no-match-')).not.toThrow();
    });
  });

  describe('requestCache.isCancelled', () => {
    it('should return false for non-existent key', () => {
      expect(requestCache.isCancelled('does-not-exist')).toBe(false);
    });

    it('should return false for active request', async () => {
      const requestFn = jest.fn().mockResolvedValue('result');
      requestCache.execute('active-test', requestFn);

      expect(requestCache.isCancelled('active-test')).toBe(false);
    });

    it('should return true after cancellation', async () => {
      const requestFn = jest.fn().mockReturnValue(
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('result'), 1000);
        })
      );

      requestCache.execute('cancel-check', requestFn);
      requestCache.cancel('cancel-check');

      expect(requestCache.isCancelled('cancel-check')).toBe(true);
    });
  });

  describe('requestCache.clear', () => {
    it('should remove all cached entries', async () => {
      const requestFn = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('result'), 1000);
        });

      requestCache.execute('clear-1', requestFn);
      requestCache.execute('clear-2', requestFn);

      expect(requestCache.getStats().size).toBe(2);

      requestCache.clear();

      expect(requestCache.getStats().size).toBe(0);
    });
  });

  describe('requestCache.getStats', () => {
    it('should return cache size and keys', async () => {
      const requestFn = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('result'), 1000);
        });

      requestCache.execute('stats-1', requestFn);
      requestCache.execute('stats-2', requestFn);

      const stats = requestCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('stats-1');
      expect(stats.keys).toContain('stats-2');
    });

    it('should return empty stats when cache is empty', () => {
      requestCache.clear();
      const stats = requestCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('createRequestKey', () => {
    it('should create key with operation only', () => {
      const key = createRequestKey('loadRequest');

      expect(key).toBe('loadRequest');
    });

    it('should create key with operation and numeric itemId', () => {
      const key = createRequestKey('loadRequest', 123);

      expect(key).toBe('loadRequest-123');
    });

    it('should create key with operation and string itemId', () => {
      const key = createRequestKey('loadDocument', 'doc-abc');

      expect(key).toBe('loadDocument-doc-abc');
    });
  });

  describe('debugFlag', () => {
    describe('isEnabled', () => {
      it('should return false when LRS_DEBUG is not set', () => {
        localStorageMock.getItem.mockReturnValue(null);

        expect(debugFlag.isEnabled()).toBe(false);
      });

      it('should return true when LRS_DEBUG is "true"', () => {
        localStorageMock.getItem.mockReturnValue('true');

        expect(debugFlag.isEnabled()).toBe(true);
      });
    });

    describe('enable', () => {
      it('should set LRS_DEBUG to true', () => {
        debugFlag.enable();

        expect(localStorageMock.setItem).toHaveBeenCalledWith('LRS_DEBUG', 'true');
      });
    });

    describe('disable', () => {
      it('should remove LRS_DEBUG from localStorage', () => {
        debugFlag.disable();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('LRS_DEBUG');
      });
    });
  });
});
