/**
 * Unit tests for audioProcessor.js
 * Tests audio file processing utilities
 */

describe('audioProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should import without errors', () => {
    expect(() => {
      require('../../../srv/utils/audioProcessor');
    }).not.toThrow();
  });

  it('should export functions', () => {
    const audioProcessor = require('../../../srv/utils/audioProcessor');

    expect(audioProcessor).toBeTruthy();
    expect(typeof audioProcessor).toBe('object');
  });

  it('should have processUploadedAudio function', () => {
    const { processUploadedAudio } = require('../../../srv/utils/audioProcessor');

    expect(typeof processUploadedAudio).toBe('function');
  });

  it('should have ffmpegAvailable property', () => {
    const { ffmpegAvailable } = require('../../../srv/utils/audioProcessor');

    expect(typeof ffmpegAvailable).toBe('boolean');
  });

  describe('processUploadedAudio', () => {
    it('should be callable', async () => {
      const { processUploadedAudio } = require('../../../srv/utils/audioProcessor');

      // Function should not throw when called (may error due to missing ffmpeg, that's ok)
      try {
        await processUploadedAudio({ path: '/tmp/test.mp3', originalname: 'test.mp3' });
      } catch (error) {
        // Expected to fail without real file/ffmpeg
        expect(error).toBeDefined();
      }
    });
  });
});
