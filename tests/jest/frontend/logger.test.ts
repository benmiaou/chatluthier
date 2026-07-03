/**
 * Logger utility tests
 */

import { handleError, logWarning, logInfo } from '../../../src/utils/logger';

// Mock console methods
const consoleError = jest.spyOn(console, 'error').mockImplementation();
const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const consoleInfo = jest.spyOn(console, 'info').mockImplementation();

// Mock Sentry
const mockSentry = {
  captureException: jest.fn(),
};

declare global {
  let Sentry: typeof mockSentry | undefined;
}

describe('logger utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).Sentry = mockSentry;
  });

  afterAll(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    consoleInfo.mockRestore();
  });

  describe('handleError', () => {
    it('should log error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      handleError(error, 'test-context');

      expect(consoleError).toHaveBeenCalledWith('[test-context]', error, '');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log error in production without Sentry', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      (global as any).Sentry = undefined;

      const error = new Error('Test error');
      handleError(error, 'test-context');

      expect(consoleError).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should capture error in Sentry when available', () => {
      const error = new Error('Test error');
      const metadata = { userId: '123' };

      handleError(error, 'test-context', undefined, metadata);

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        contexts: {
          context: {
            context: 'test-context',
            userId: '123',
          },
        },
      });
    });

    it('should execute fallback function', () => {
      const fallback = jest.fn();
      const error = new Error('Test error');

      handleError(error, 'test-context', fallback);

      expect(fallback).toHaveBeenCalled();
    });

    it('should handle error with metadata', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const metadata = { userId: '123', action: 'upload' };

      handleError(error, 'test-context', undefined, metadata);

      expect(consoleError).toHaveBeenCalledWith('[test-context]', error, { metadata });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-Error objects', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = 'string error';
      handleError(error, 'test-context');

      expect(consoleError).toHaveBeenCalledWith('[test-context]', error, '');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Sentry capture failure gracefully', () => {
      mockSentry.captureException.mockImplementationOnce(() => {
        throw new Error('Sentry error');
      });

      const error = new Error('Test error');
      handleError(error, 'test-context');

      expect(mockSentry.captureException).toHaveBeenCalled();
      // Should not throw - gracefully handle Sentry errors
    });

    it('should call both fallback and Sentry', () => {
      const fallback = jest.fn();
      const error = new Error('Test error');

      handleError(error, 'test-context', fallback);

      expect(mockSentry.captureException).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should handle null metadata gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      handleError(error, 'test-context', undefined, null);

      expect(consoleError).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should preserve error stack', () => {
      (global as any).Sentry = undefined;

      const error = new Error('Test error');
      const stack = error.stack;

      handleError(error, 'test-context');

      expect(error.stack).toBe(stack);
    });
  });

  describe('logWarning', () => {
    it('should log warning in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logWarning('Test warning', 'test-context');

      expect(consoleWarn).toHaveBeenCalledWith('[test-context]', 'Test warning');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log warning in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logWarning('Test warning', 'test-context');

      expect(consoleWarn).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should format message with context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logWarning('Deprecated function used', 'auth-module');

      expect(consoleWarn).toHaveBeenCalledWith('[auth-module]', 'Deprecated function used');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle empty message', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logWarning('', 'test-context');

      expect(consoleWarn).toHaveBeenCalledWith('[test-context]', '');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logInfo', () => {
    it('should log info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logInfo('Test info', 'test-context');

      expect(consoleInfo).toHaveBeenCalledWith('[test-context]', 'Test info');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log info in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logInfo('Test info', 'test-context');

      expect(consoleInfo).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should format message with context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logInfo('Application initialized', 'app-startup');

      expect(consoleInfo).toHaveBeenCalledWith('[app-startup]', 'Application initialized');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle long messages', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const longMessage = 'A'.repeat(1000);
      logInfo(longMessage, 'test-context');

      expect(consoleInfo).toHaveBeenCalledWith('[test-context]', longMessage);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle empty message', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logInfo('', 'test-context');

      expect(consoleInfo).toHaveBeenCalledWith('[test-context]', '');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
