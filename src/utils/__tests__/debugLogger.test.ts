/**
 * Debug Logger Utility Tests
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

import { isDebugEnabled, debugLogger, debugFlag } from '../debugLogger';

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

describe('Debug Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('isDebugEnabled', () => {
    it('should return false when LRS_DEBUG is not set', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(isDebugEnabled()).toBe(false);
    });

    it('should return true when LRS_DEBUG is "true"', () => {
      localStorageMock.getItem.mockReturnValue('true');

      expect(isDebugEnabled()).toBe(true);
    });

    it('should return false when LRS_DEBUG is "false"', () => {
      localStorageMock.getItem.mockReturnValue('false');

      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when LRS_DEBUG is any other value', () => {
      localStorageMock.getItem.mockReturnValue('yes');

      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when localStorage throws an error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('debugLogger.info', () => {
    it('should log when debug is enabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('true');

      debugLogger.info('Test message', { key: 'value' });

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
    });

    it('should not log when debug is disabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue(null);

      debugLogger.info('Test message', { key: 'value' });

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should work without context parameter', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('true');

      debugLogger.info('Simple message');

      expect(mockLogger.info).toHaveBeenCalledWith('Simple message', undefined);
    });
  });

  describe('debugLogger.warn', () => {
    it('should log when debug is enabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('true');

      debugLogger.warn('Warning message', { issue: 'something' });

      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', { issue: 'something' });
    });

    it('should not log when debug is disabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue(null);

      debugLogger.warn('Warning message');

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('debugLogger.error', () => {
    it('should always log regardless of debug flag', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue(null);

      const error = new Error('Test error');
      debugLogger.error('Error occurred', error, { context: 'test' });

      expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', error, { context: 'test' });
    });

    it('should log even when debug is enabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('true');

      const error = new Error('Test error');
      debugLogger.error('Error occurred', error);

      expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', error, undefined);
    });

    it('should work without error or context', () => {
      const mockLogger = getMockLogger();
      debugLogger.error('Simple error');

      expect(mockLogger.error).toHaveBeenCalledWith('Simple error', undefined, undefined);
    });
  });

  describe('debugLogger.success', () => {
    it('should always log regardless of debug flag', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue(null);

      debugLogger.success('Operation completed', { itemId: 123 });

      expect(mockLogger.success).toHaveBeenCalledWith('Operation completed', { itemId: 123 });
    });

    it('should log even when debug is disabled', () => {
      const mockLogger = getMockLogger();
      localStorageMock.getItem.mockReturnValue('false');

      debugLogger.success('Success!');

      expect(mockLogger.success).toHaveBeenCalledWith('Success!', undefined);
    });
  });

  describe('debugFlag', () => {
    describe('isEnabled', () => {
      it('should return same value as isDebugEnabled', () => {
        localStorageMock.getItem.mockReturnValue('true');
        expect(debugFlag.isEnabled()).toBe(true);

        localStorageMock.getItem.mockReturnValue(null);
        expect(debugFlag.isEnabled()).toBe(false);
      });
    });

    describe('enable', () => {
      it('should set LRS_DEBUG to true', () => {
        const mockLogger = getMockLogger();
        debugFlag.enable();

        expect(localStorageMock.setItem).toHaveBeenCalledWith('LRS_DEBUG', 'true');
        expect(mockLogger.info).toHaveBeenCalledWith(
          '[DebugLogger] Debug mode enabled. Refresh to see verbose logging.'
        );
      });

      it('should handle localStorage errors gracefully', () => {
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error('Storage full');
        });

        // Should not throw
        expect(() => debugFlag.enable()).not.toThrow();
      });
    });

    describe('disable', () => {
      it('should remove LRS_DEBUG from localStorage', () => {
        const mockLogger = getMockLogger();
        debugFlag.disable();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('LRS_DEBUG');
        expect(mockLogger.info).toHaveBeenCalledWith('[DebugLogger] Debug mode disabled.');
      });

      it('should handle localStorage errors gracefully', () => {
        localStorageMock.removeItem.mockImplementation(() => {
          throw new Error('Storage error');
        });

        // Should not throw
        expect(() => debugFlag.disable()).not.toThrow();
      });
    });

    describe('toggle', () => {
      it('should enable when currently disabled', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = debugFlag.toggle();

        expect(result).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('LRS_DEBUG', 'true');
      });

      it('should disable when currently enabled', () => {
        localStorageMock.getItem.mockReturnValue('true');

        const result = debugFlag.toggle();

        expect(result).toBe(false);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('LRS_DEBUG');
      });

      it('should return the new state', () => {
        localStorageMock.getItem.mockReturnValue(null);
        expect(debugFlag.toggle()).toBe(true);

        localStorageMock.getItem.mockReturnValue('true');
        expect(debugFlag.toggle()).toBe(false);
      });
    });
  });
});
