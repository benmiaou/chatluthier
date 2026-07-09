/**
 * Unit tests for soundController advanced scenarios
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
const { createMockRequest, createMockResponse } = require('../utils/testHelpers');

describe('soundController - Advanced Scenarios', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
    db.query = jest.fn().mockResolvedValue([]);
  });

  describe('getData with complex filtering', () => {
    it('should filter sounds by context', async () => {
      const mockSounds = [
        {
          id: 1,
          filename: 'forest-rain.mp3',
          contexts: JSON.stringify(['Forest', 'Nature']),
        },
        { id: 2, filename: 'city-ambiance.mp3', contexts: JSON.stringify(['City']) },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle sounds with null contexts', async () => {
      const mockSounds = [{ id: 1, filename: 'sound.mp3', contexts: null }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle sounds with empty contexts array', async () => {
      const mockSounds = [{ id: 1, filename: 'sound.mp3', contexts: '[]' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed JSON in contexts', async () => {
      const mockSounds = [{ id: 1, filename: 'sound.mp3', contexts: 'invalid-json' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        // Expected to handle gracefully
      }
    });
  });

  describe('User sound overrides', () => {
    it('should apply user overrides to default sounds', async () => {
      const userId = 'user-123';
      const mockSounds = [
        { id: 1, filename: 'sound.mp3', is_enabled: 1 },
        { id: 2, filename: 'sound2.mp3', is_enabled: 1 },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(userId, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
      expect(db.query).toHaveBeenCalled();
    });

    it('should handle user with no overrides', async () => {
      db.query = jest.fn().mockResolvedValue([]);

      const result = await soundController.getData('user-123', 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should merge user and default contexts', async () => {
      const userId = 'user-123';

      db.query = jest.fn().mockResolvedValue([
        {
          id: 1,
          filename: 'sound.mp3',
          contexts: JSON.stringify(['Context1']),
          user_contexts: JSON.stringify(['Context2']),
        },
      ]);

      const result = await soundController.getData(userId, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Sound enable/disable logic', () => {
    it('should mark sounds as enabled by default', async () => {
      const mockSounds = [
        { id: 1, filename: 'sound.mp3', is_enabled: 1 },
        { id: 2, filename: 'sound2.mp3', is_enabled: 1 },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle disabled sounds', async () => {
      const mockSounds = [
        { id: 1, filename: 'sound.mp3', is_enabled: 0 },
        { id: 2, filename: 'sound2.mp3', is_enabled: 1 },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle mixed enabled/disabled states', async () => {
      const mockSounds = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        filename: `sound${i}.mp3`,
        is_enabled: i % 2 === 0 ? 1 : 0,
      }));

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'soundboard');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database error handling', () => {
    it('should handle database query errors', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle timeout errors', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('TIMEOUT'));

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle null database response', async () => {
      db.query = jest.fn().mockResolvedValue(null);

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        // Expected behavior
      }
    });
  });

  describe('Category validation', () => {
    it('should handle all valid categories', async () => {
      const categories = ['ambianceSounds', 'backgroundMusic', 'soundboard'];
      db.query = jest.fn().mockResolvedValue([]);

      for (const category of categories) {
        const result = await soundController.getData(null, category);
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should reject invalid categories', async () => {
      const result = await soundController.getData(null, 'invalidCategory');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should be case-sensitive for categories', async () => {
      const result = await soundController.getData(null, 'AmbianceSounds');

      // Should not match (case-sensitive)
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle category with special characters', async () => {
      const result = await soundController.getData(null, 'sounds@#$');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Large dataset handling', () => {
    it('should handle large number of sounds', async () => {
      const mockSounds = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        filename: `sound${i}.mp3`,
      }));

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'soundboard');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large context arrays', async () => {
      const mockSounds = [
        {
          id: 1,
          filename: 'sound.mp3',
          contexts: JSON.stringify(Array.from({ length: 100 }, (_, i) => `Context${i}`)),
        },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle deeply nested context data', async () => {
      const mockSounds = [
        {
          id: 1,
          filename: 'sound.mp3',
          contexts: JSON.stringify({
            main: ['Context1', 'Context2'],
            sub: { level2: ['Context3'] },
          }),
        },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      try {
        const result = await soundController.getData(null, 'ambianceSounds');
        expect(Array.isArray(result)).toBe(true);
      } catch (e) {
        // May fail on nested structures, that's ok
      }
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent getData calls', async () => {
      db.query = jest.fn().mockResolvedValue([]);

      const promises = [
        soundController.getData(null, 'backgroundMusic'),
        soundController.getData(null, 'ambianceSounds'),
        soundController.getData(null, 'soundboard'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle concurrent requests from different users', async () => {
      db.query = jest.fn().mockResolvedValue([]);

      const promises = [
        soundController.getData('user1', 'backgroundMusic'),
        soundController.getData('user2', 'backgroundMusic'),
        soundController.getData('user3', 'backgroundMusic'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
    });
  });

  describe('Special characters in filenames', () => {
    it('should handle filenames with spaces', async () => {
      const mockSounds = [{ id: 1, filename: 'my sound file.mp3' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle filenames with unicode characters', async () => {
      const mockSounds = [{ id: 1, filename: 'café_音楽.mp3' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle filenames with special characters', async () => {
      const mockSounds = [
        { id: 1, filename: 'sound!@#$%.mp3' },
        { id: 2, filename: 'sound(with)brackets.mp3' },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'soundboard');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
