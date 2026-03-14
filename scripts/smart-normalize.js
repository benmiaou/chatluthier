// Smart LUFS Normalization Script
// Analyzes LUFS and normalizes only files that need it
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the srv_sound_data directory
const soundDataDir = path.join(__dirname, '..', 'srv_sound_data');

// Target LUFS level and tolerance
const targetLUFS = -23;
const tolerance = 0.5; // ±0.5 LUFS tolerance

// Function to get LUFS level using FFmpeg
function getLUFS(filePath) {
  try {
    const command = `ffmpeg -i "${filePath}" -af loudnorm=print_format=summary -f null - 2>&1`;
    const output = execSync(command, { encoding: 'utf8', timeout: 30000 });

    // Extract input integrated LUFS from FFmpeg output
    const lufsMatch = output.match(/Input Integrated:\s+([-\d.]+)/);
    if (lufsMatch) {
      return parseFloat(lufsMatch[1]);
    }
    return null;
  } catch (error) {
    console.error(`Error getting LUFS for ${filePath}:`, error.message);
    return null;
  }
}

// Function to normalize audio to target LUFS inplace
function normalizeFile(filePath, currentLUFS) {
  try {
    const relativePath = path.relative(soundDataDir, filePath);
    console.log(`🔧 Normalizing: ${relativePath} (${currentLUFS.toFixed(2)} → ${targetLUFS} LUFS)`);

    // Create a temporary file path with proper extension
    const ext = path.extname(filePath);
    const tempFilePath = filePath + '.normalizing' + ext;

    // Normalize to target LUFS using loudnorm filter
    const command = `ffmpeg -i "${filePath}" -af loudnorm=I=${targetLUFS}:TP=-1.5:LRA=11 -y "${tempFilePath}"`;
    execSync(command, { stdio: 'pipe', timeout: 60000 });

    // Replace original file with normalized version
    fs.unlinkSync(filePath);
    fs.renameSync(tempFilePath, filePath);

    console.log(`✅ Normalized: ${relativePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error normalizing ${filePath}:`, error.message);
    // Clean up temp file if it exists
    const ext = path.extname(filePath);
    const tempFilePath = filePath + '.normalizing' + ext;
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    return false;
  }
}

// Function to scan directories recursively
function scanAndNormalize(directory) {
  let totalFiles = 0;
  let normalizedFiles = 0;
  let optimalFiles = 0;
  let errorFiles = 0;

  const items = fs.readdirSync(directory);
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      const result = scanAndNormalize(fullPath);
      totalFiles += result.totalFiles;
      normalizedFiles += result.normalizedFiles;
      optimalFiles += result.optimalFiles;
      errorFiles += result.errorFiles;
    } else if (stat.isFile() && isAudioFile(item)) {
      // Process audio files
      totalFiles++;
      const relativePath = path.relative(soundDataDir, fullPath);
      const lufs = getLUFS(fullPath);

      if (lufs !== null) {
        const lufsDiff = Math.abs(lufs - targetLUFS);

        if (lufsDiff > tolerance) {
          // File needs normalization
          if (normalizeFile(fullPath, lufs)) {
            normalizedFiles++;
          } else {
            errorFiles++;
          }
        } else {
          // File is already at optimal level
          console.log(`🟢 Optimal: ${relativePath} (${lufs.toFixed(2)} LUFS)`);
          optimalFiles++;
        }
      } else {
        console.log(`❌ Error reading: ${relativePath}`);
        errorFiles++;
      }
    }
  }

  return { totalFiles, normalizedFiles, optimalFiles, errorFiles };
}

// Check if file is an audio file
function isAudioFile(filename) {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
  return audioExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

// Main function
function main() {
  console.log('🎵 Smart LUFS Normalization');
  console.log('='.repeat(50));
  console.log(`Target: ${targetLUFS} LUFS ±${tolerance} LUFS`);
  console.log('Only normalizing files that need it...');
  console.log('Press Ctrl+C to abort.\n');

  // Check if FFmpeg is available
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Error: FFmpeg is not installed or not available in PATH.');
    console.error('Please install FFmpeg and ensure it is in your system PATH.');
    console.error('Download: https://ffmpeg.org/download.html');
    return;
  }

  if (!fs.existsSync(soundDataDir)) {
    console.error(`❌ Directory not found: ${soundDataDir}`);
    return;
  }

  // Give user a chance to abort
  console.log('Starting analysis in 3 seconds...');
  console.log('Press Ctrl+C to abort now.\n');

  // Simple 3-second delay
  const start = Date.now();
  while (Date.now() - start < 3000) {
    // Busy wait for 3 seconds
  }

  const result = scanAndNormalize(soundDataDir);

  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 NORMALIZATION COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`Total files analyzed: ${result.totalFiles}`);
  console.log(`🟢 Already optimal: ${result.optimalFiles}`);
  console.log(`🔧 Successfully normalized: ${result.normalizedFiles}`);
  console.log(`❌ Files with errors: ${result.errorFiles}`);
  console.log(
    `📈 Compliance rate: ${((result.optimalFiles / result.totalFiles) * 100).toFixed(1)}%`
  );
  console.log(`${'='.repeat(50)}`);
}

main();
