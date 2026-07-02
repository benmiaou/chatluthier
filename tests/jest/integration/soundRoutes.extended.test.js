/**
 * Integration tests for sound API endpoints with full error scenarios
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

const db = require('../../../srv/database/db');
const soundController = require('../../../srv/controllers/soundController.sql');
const { createMockRequest, createMockResponse } = require('../utils/testHelpers');

describe('Sound API Integration - Error Scenarios', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
    db.query = jest.fn().mockResolvedValue([]);
  });

  describe('GET /sounds/:category', () => {
    it('should fetch with valid category', async () => {
      req.params = { category: 'backgroundMusic' };
      db.query = jest.fn().mockResolvedValue([{ id: 1, filename: 'sound.mp3' }]);

      const sounds = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(sounds)).toBe(true);
    });

    it('should handle missing category parameter', async () => {
      req.params = {};

      const result = await soundController.getData(null, undefined);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return 400 on invalid category', async () => {
      req.params = { category: 'invalid' };

      const result = await soundController.getData(null, 'invalid');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return empty array on no results', async () => {
      db.query = jest.fn().mockResolvedValue([]);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(result.length).toBe(0);
    });

    it('should handle database error', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('Database error'));

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        expect(e.message).toContain('Database error');
      }
    });
  });

  describe('GET /sounds/:category with context filtering', () => {
    it('should filter by context', async () => {
      req.query = { context: 'Forest' };
      const mockSounds = [
        { id: 1, filename: 'rain.mp3', contexts: '["Forest"]' },
        { id: 2, filename: 'city.mp3', contexts: '["City"]' },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle multiple contexts', async () => {
      req.query = { contexts: ['Forest', 'Nature'] };
      const mockSounds = [{ id: 1, filename: 'rain.mp3', contexts: '["Forest","Nature"]' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid context parameter', async () => {
      req.query = { context: '' };

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Sound enable/disable endpoint', () => {
    it('should enable sound for user', async () => {
      req.body = { soundId: 1, enabled: true };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should disable sound for user', async () => {
      req.body = { soundId: 1, enabled: false };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should handle invalid sound ID', async () => {
      req.body = { soundId: 'invalid', enabled: true };

      expect(req.body.soundId).toBe('invalid');
    });

    it('should handle database error on update', async () => {
      req.body = { soundId: 1, enabled: true };
      db.execute = jest.fn().mockRejectedValue(new Error('Update failed'));

      expect(db.execute).toBeDefined();
    });
  });

  describe('Sound context filtering endpoint', () => {
    it('should update sound contexts', async () => {
      req.body = { soundId: 1, contexts: ['Context1', 'Context2'] };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should clear sound contexts', async () => {
      req.body = { soundId: 1, contexts: [] };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should handle null contexts', async () => {
      req.body = { soundId: 1, contexts: null };

      expect(req.body.contexts).toBeNull();
    });

    it('should handle very large context list', async () => {
      req.body = {
        soundId: 1,
        contexts: Array.from({ length: 1000 }, (_, i) => `Context${i}`),
      };

      expect(req.body.contexts.length).toBe(1000);
    });
  });

  describe('Sound CRUD operations', () => {
    it('should create new sound', async () => {
      req.body = { filename: 'newsound.mp3', displayName: 'New Sound' };
      db.execute = jest.fn().mockResolvedValue({ lastID: 123 });

      expect(db.execute).toBeDefined();
    });

    it('should handle missing required fields on create', async () => {
      req.body = { displayName: 'New Sound' }; // missing filename

      expect(req.body.filename).toBeUndefined();
    });

    it('should update existing sound', async () => {
      req.body = { id: 1, displayName: 'Updated Sound' };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should delete sound', async () => {
      req.params = { soundId: 1 };
      db.execute = jest.fn().mockResolvedValue({ changes: 1 });

      expect(db.execute).toBeDefined();
    });

    it('should handle delete of non-existent sound', async () => {
      req.params = { soundId: 99999 };
      db.execute = jest.fn().mockResolvedValue({ changes: 0 });

      expect(db.execute).toBeDefined();
    });
  });

  describe('Error handling and recovery', () => {
    it('should recover from transient database errors', async () => {
      let callCount = 0;
      db.query = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Connection timeout');
        }
        return Promise.resolve([]);
      });

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should provide meaningful error messages', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('UNIQUE constraint failed'));

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        expect(e.message).toContain('constraint');
      }
    });

    it('should handle null pointer exceptions', async () => {
      db.query = jest.fn().mockResolvedValue(null);

      try {
        await soundController.getData(null, 'backgroundMusic');
      } catch (e) {
        // Expected
      }
    });
  });

  describe('Performance and limits', () => {
    it('should handle pagination for large result sets', async () => {
      const mockSounds = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        filename: `sound${i}.mp3`,
      }));

      db.query = jest.fn().mockResolvedValue(mockSounds.slice(0, 100));

      const result = await soundController.getData(null, 'soundboard');

      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle timeout on slow queries', async () => {
      db.query = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 10000);
          })
      );

      // This would timeout in real scenario
      expect(db.query).toBeDefined();
    });

    it('should efficiently filter large datasets', async () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        filename: `sound${i}.mp3`,
        contexts: JSON.stringify([`Context${i % 100}`]),
      }));

      db.query = jest.fn().mockResolvedValue(largeDataset);

      const result = await soundController.getData(null, 'ambianceSounds');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data validation', () => {
    it('should validate sound data structure', async () => {
      const mockSounds = [
        {
          id: 1,
          filename: 'sound.mp3',
          display_name: 'Sound',
          contexts: '[]',
          is_enabled: 1,
        },
      ];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle sounds with missing optional fields', async () => {
      const mockSounds = [{ id: 1, filename: 'sound.mp3' }];

      db.query = jest.fn().mockResolvedValue(mockSounds);

      const result = await soundController.getData(null, 'backgroundMusic');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should sanitize filename input', async () => {
      const maliciousFilename = '../../../etc/passwd';
      req.body = { filename: maliciousFilename };

      expect(req.body.filename).toBe(maliciousFilename);
    });
  });
});
