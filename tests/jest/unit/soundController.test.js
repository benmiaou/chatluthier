/**
 * Unit tests for soundController.sql.js
 * Tests sound data retrieval and filtering
 */

jest.mock('../../../srv/database/db');
jest.mock('../../../srv/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  access: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../srv/utils/audioProcessor', () => ({
  processUploadedAudio: jest.fn(),
  ffmpegAvailable: false,
}));

jest.mock('../../../srv/controllers/authController', () => ({
  verifyjwt: jest.fn().mockResolvedValue({ userId: 'test' }),
}));

jest.mock('../../../srv/database/config', () => ({
  soundCategories: {
    ambianceSounds: 1,
    backgroundMusic: 2,
    soundboard: 3,
  },
}));

const soundController = require('../../../srv/controllers/soundController.sql');
const db = require('../../../srv/database/db');

describe('soundController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query = jest.fn().mockResolvedValue([]);
  });

  describe('getData', () => {
    it('should retrieve background music sounds', async () => {
      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve ambiance sounds', async () => {
      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve soundboard sounds', async () => {
      const result = await soundController.getData(null, 'soundboard');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid category gracefully', async () => {
      const result = await soundController.getData(null, 'invalidCategory');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should be exported', () => {
      expect(typeof soundController.getData).toBe('function');
    });
  });

  describe('other exports', () => {
    it('should export all required functions', () => {
      expect(typeof soundController.updateMainPlaylist).toBe('function');
      expect(typeof soundController.updateUserSound).toBe('function');
      expect(typeof soundController.savePreset).toBe('function');
      expect(typeof soundController.loadPresets).toBe('function');
    });
  });
});
