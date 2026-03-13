#!/usr/bin/env node

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

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg'; // Use env variable or fallback to 'ffmpeg'
const TARGET_LOUDNESS = '-23'; // Standard broadcast loudness in LUFS
const MAX_TRUE_PEAK = '-1.0'; // Prevent clipping in dB

/**
 * Normalize audio file using FFmpeg with EBU R128 loudness normalization
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 */
async function normalizeAudio(inputPath, outputPath) {
  try {
    console.log(`Normalizing ${path.basename(inputPath)}...`);

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

    // Use loudnorm filter for EBU R128 compliance
    const command = `${FFMPEG_PATH} -i "${inputPath}" -af "loudnorm=I=${TARGET_LOUDNESS}:TP=${MAX_TRUE_PEAK}:print_format=summary" ${formatFlag} -y "${outputPath}"`;

    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Normalized ${path.basename(inputPath)}`);

    return true;
  } catch (error) {
    console.error(`✗ Failed to normalize ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

/**
 * Process all audio files in a directory
 */
async function processDirectory(directory) {
  try {
    const files = await readdir(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const fileStat = await stat(filePath);

      if (fileStat.isDirectory()) {
        await processDirectory(filePath); // Recursive
      } else if (isAudioFile(file)) {
        const backupPath = filePath + '.backup';
        const tempPath = filePath + '.normalized';

        // Create backup
        fs.copyFileSync(filePath, backupPath);

        try {
          // Normalize to temp file
          const success = await normalizeAudio(filePath, tempPath);

          if (success && fs.existsSync(tempPath)) {
            // Replace original with normalized version
            fs.unlinkSync(filePath);
            fs.renameSync(tempPath, filePath);
            fs.unlinkSync(backupPath); // Remove backup if successful
            console.log(`✅ Successfully normalized and replaced: ${path.basename(filePath)}`);
          } else {
            console.log(
              `⚠️  Normalization completed but output file not found for: ${path.basename(filePath)}`
            );
            // Restore backup if failed
            if (fs.existsSync(backupPath)) {
              fs.renameSync(backupPath, filePath);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
          // Restore backup on any error
          if (fs.existsSync(backupPath)) {
            fs.renameSync(backupPath, filePath);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error.message);
  }
}

/**
 * Check if file is an audio file
 */
function isAudioFile(filename) {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
  return audioExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

/**
 * Main function
 */
async function main() {
  console.log('🎵 Starting sound normalization process...');

  // Check if ffmpeg is available
  try {
    execSync(`${FFMPEG_PATH} -version`, { stdio: 'pipe' });
  } catch (error) {
    console.error("❌ FFmpeg not found. Please install FFmpeg and ensure it's in your PATH.");
    console.error('Download from: https://ffmpeg.org/download.html');
    process.exit(1);
  }

  // Process sound directories
  const soundDirectories = [
    path.join(__dirname, '../srv_sound_data/soundboard'),
    path.join(__dirname, '../srv_sound_data/ambiance'),
    path.join(__dirname, '../srv_sound_data/background'),
  ];

  for (const dir of soundDirectories) {
    if (fs.existsSync(dir)) {
      console.log(`\n📁 Processing directory: ${dir}`);
      await processDirectory(dir);
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
    }
  }

  console.log('\n✅ Sound normalization complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  normalizeAudio,
  processDirectory,
  isAudioFile,
};
