/**
 * Unit tests for logger.js
 * Tests logging functionality and configuration
 */

describe('logger', () => {
  let logger;

  beforeEach(() => {
    jest.resetModules();
    logger = require('../../../srv/utils/logger');
  });

  it('should export logger object', () => {
    expect(logger).toBeDefined();
    expect(typeof logger).toBe('object');
  });

  it('should have standard logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should be able to log messages', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  it('should have wrapDatabaseMethods function', () => {
    expect(typeof logger.wrapDatabaseMethods).toBe('function');
  });

  it('should have configuration properties', () => {
    expect(logger.level).toBeDefined();
    expect(logger.format).toBeDefined();
  });
});
