/**
 * Integration tests for soundRoutes
 * Tests sound API endpoints
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

describe('Sound API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock db.query to return empty array by default
    db.query = jest.fn().mockResolvedValue([]);
  });

  it('should fetch background music', async () => {
    const sounds = await soundController.getData(null, 'backgroundMusic');

    expect(Array.isArray(sounds)).toBe(true);
    expect(db.query).toHaveBeenCalled();
  });

  it('should fetch ambiance sounds', async () => {
    const sounds = await soundController.getData(null, 'ambianceSounds');

    expect(Array.isArray(sounds)).toBe(true);
    expect(db.query).toHaveBeenCalled();
  });

  it('should fetch soundboard sounds', async () => {
    const sounds = await soundController.getData(null, 'soundboard');

    expect(Array.isArray(sounds)).toBe(true);
    expect(db.query).toHaveBeenCalled();
  });

  it('should handle empty sound list', async () => {
    db.query.mockResolvedValue([]);

    const sounds = await soundController.getData(null, 'backgroundMusic');

    expect(sounds.length).toBe(0);
  });
});
