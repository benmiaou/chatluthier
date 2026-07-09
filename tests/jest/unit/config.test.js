/**
 * Unit tests for configuration modules
 */

describe('Configuration modules', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('database config', () => {
    it('should export soundCategories', () => {
      const config = require('../../../srv/database/config');

      expect(config.soundCategories).toBeDefined();
      expect(typeof config.soundCategories).toBe('object');
    });

    it('should have required category mappings', () => {
      const config = require('../../../srv/database/config');

      expect(config.soundCategories.ambianceSounds).toBeDefined();
      expect(config.soundCategories.backgroundMusic).toBeDefined();
      expect(config.soundCategories.soundboard).toBeDefined();
    });

    it('should have numeric category IDs', () => {
      const config = require('../../../srv/database/config');
      const { soundCategories } = config;

      Object.values(soundCategories).forEach((id) => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    });
  });

  describe('secret config', () => {
    it('should export secret configuration function', () => {
      const secretConfig = require('../../../srv/config/secret');

      expect(typeof secretConfig).toBe('function');
    });

    it('should provide access token secret', () => {
      const getSecrets = require('../../../srv/config/secret');

      // Set required environment variables
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-refresh';

      const secrets = getSecrets();

      expect(secrets.accessTokenSecret).toBeDefined();
      expect(typeof secrets.accessTokenSecret).toBe('string');
    });
  });
});
