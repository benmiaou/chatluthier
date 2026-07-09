const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const TARGET_LOUDNESS = '-23'; // Standard broadcast loudness in LUFS
const MAX_TRUE_PEAK = '-1.0'; // Prevent clipping in dB
const UPLOADS_DIR = path.join(__dirname, '../uploads');

/**
 * Normalize audio file using FFmpeg with EBU R128 loudness normalization
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @returns {Promise<boolean>} - Success status
 */
async function normalizeAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Normalizing audio: ${path.basename(inputPath)}`);

      // Determine output format based on input file extension
      const ext = path.extname(inputPath).toLowerCase();
      let formatFlag = '';
      if (ext === '.wav') {
        formatFlag = '-f wav';
      } else if (ext === '.mp3') {
        formatFlag = '-f mp3';
      } else if (ext === '.ogg') {
        formatFlag = '-f ogg';
      } else if (ext === '.m4a' || ext === '.aac') {
        formatFlag = '-f ipod';
      } else if (ext === '.flac') {
        formatFlag = '-f flac';
      } else if (ext === '.wma') {
        formatFlag = '-f asf';
      }

      const command = `${FFMPEG_PATH} -i "${inputPath}" -af "loudnorm=I=${TARGET_LOUDNESS}:TP=${MAX_TRUE_PEAK}:print_format=summary" ${formatFlag} -y "${outputPath}"`;

      execSync(command, { stdio: 'inherit' });
      console.log(`✓ Audio normalized: ${path.basename(inputPath)}`);
      resolve(true);
    } catch (error) {
      console.error(`✗ Failed to normalize audio ${path.basename(inputPath)}:`, error.message);
      reject(error);
    }
  });
}

/**
 * Process uploaded audio file
 * @param {Express.Multer.File} file - Uploaded file
 * @returns {Promise<{normalizedPath: string, originalPath: string}>}
 */
async function processUploadedAudio(file) {
  if (!file || !file.path) {
    throw new Error('No file provided for processing');
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const originalPath = file.path;
  const normalizedPath = path.join(
    path.dirname(originalPath),
    `normalized_${path.basename(originalPath)}`
  );

  // Normalize the audio
  await normalizeAudio(originalPath, normalizedPath);

  return {
    normalizedPath,
    originalPath,
  };
}

/**
 * Clean up temporary files
 */
function cleanupFiles(filePaths) {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }

  filePaths.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to cleanup file ${filePath}:`, error.message);
    }
  });
}

/**
 * Check if FFmpeg is available
 */
function checkFFmpegAvailable() {
  try {
    execSync(`${FFMPEG_PATH} -version`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error('❌ FFmpeg not found. Audio normalization will be skipped.');
    console.error('Install FFmpeg for automatic audio normalization:');
    console.error('Windows: https://www.gyan.dev/ffmpeg/builds/');
    console.error('Mac: brew install ffmpeg');
    console.error('Linux: sudo apt install ffmpeg');
    return false;
  }
}

// Check FFmpeg availability on module load
const ffmpegAvailable = checkFFmpegAvailable();

module.exports = {
  normalizeAudio,
  processUploadedAudio,
  cleanupFiles,
  ffmpegAvailable,
};
