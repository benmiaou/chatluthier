#!/usr/bin/env node

/**
 * Dev Server Configuration Script
 * This script helps configure the dev server without requiring environment variables to be exported
 * Usage: node scripts/configureDevServer.js [options]
 *
 * Options:
 *   --help, -h          Show this help message
 *   --show-config       Show current configuration
 *   --set-port <port>  Set the server port
 *   --add-origin <url> Add an allowed origin URL
 */

const fs = require('node:fs');
const path = require('node:path');

function showHelp() {
  console.log(`
Dev Server Configuration Script
Usage: node scripts/configureDevServer.js [options]

Options:
  --help, -h          Show this help message
  --show-config       Show current configuration
  --set-port <port>  Set the server port
  --add-origin <url> Add an allowed origin URL
  --list-origins     List current allowed origins

Examples:
  node scripts/configureDevServer.js --show-config
  node scripts/configureDevServer.js --set-port 3001
  node scripts/configureDevServer.js --add-origin https://mydevserver:4000
`);
}

function showCurrentConfig() {
  try {
    const config = require('../srv/config/appConfig');
    console.log('Current Dev Server Configuration:');
    console.log('================================');
    console.log('Environment:', config.backend.nodeEnv);
    console.log('Port:', config.backend.port);
    console.log('API Base URL:', config.frontend.apiBaseUrl || '(relative paths)');
    console.log('WS Host:', config.frontend.wsHost || '(defaults to window.location.hostname)');
    console.log('');
    console.log('Allowed Origins:');
    config.backend.allowedOrigins.forEach((origin, index) => {
      console.log(`  ${index + 1}. ${origin}`);
    });
    console.log('');
    console.log('Note: In development mode, all origins are allowed.');
    console.log('In production mode, only the listed origins are allowed.');
  } catch (error) {
    console.error('Error reading configuration:', error.message);
  }
}

function setPort(port) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing PORT setting
    envContent = envContent.replace(/^PORT=.*$/gm, '');

    // Add new PORT setting
    envContent += `\nPORT=${port}\n`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Port set to ${port} in .env file`);
    console.log('Note: You may need to restart your server for changes to take effect.');
  } catch (error) {
    console.error('Error setting port:', error.message);
  }
}

function addOrigin(url) {
  try {
    const configPath = path.join(__dirname, '..', 'srv', 'config', 'appConfig.js');
    let configContent = fs.readFileSync(configPath, 'utf8');

    // Find the allowedOrigins array and add the new URL
    const originPattern = /allowedOrigins:\s*\[([\s\S]*?)\]/;
    const match = configContent.match(originPattern);

    if (match) {
      const originsArray = match[1];
      // Add the new origin if it's not already there
      if (!originsArray.includes(url)) {
        const newOrigins = originsArray.replace(/(\s*)\]/, `\n      '${url}',\n    ]`);
        configContent = configContent.replace(originsArray, newOrigins);
        fs.writeFileSync(configPath, configContent);
        console.log(`✅ Added origin: ${url}`);
        console.log('Note: You may need to restart your server for changes to take effect.');
      } else {
        console.log(`⚠️  Origin ${url} is already in the allowed origins list.`);
      }
    } else {
      console.error('Could not find allowedOrigins array in configuration.');
    }
  } catch (error) {
    console.error('Error adding origin:', error.message);
  }
}

function listOrigins() {
  try {
    const config = require('../srv/config/appConfig');
    console.log('Allowed Origins:');
    console.log('================');
    config.backend.allowedOrigins.forEach((origin, index) => {
      console.log(`${index + 1}. ${origin}`);
    });
  } catch (error) {
    console.error('Error reading origins:', error.message);
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--show-config')) {
    showCurrentConfig();
    return;
  }

  if (args.includes('--list-origins')) {
    listOrigins();
    return;
  }

  // Handle --set-port
  const setPortIndex = args.indexOf('--set-port');
  if (setPortIndex !== -1 && args.length > setPortIndex + 1) {
    const port = args[setPortIndex + 1];
    if (/^\d+$/.test(port)) {
      setPort(port);
      return;
    } else {
      console.error('❌ Invalid port number. Please provide a valid port.');
      process.exit(1);
    }
  }

  // Handle --add-origin
  const addOriginIndex = args.indexOf('--add-origin');
  if (addOriginIndex !== -1 && args.length > addOriginIndex + 1) {
    const url = args[addOriginIndex + 1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      addOrigin(url);
      return;
    } else {
      console.error('❌ Invalid URL. Please provide a URL starting with http:// or https://');
      process.exit(1);
    }
  }

  console.log('❌ Unknown command. Use --help to see available options.');
}

if (require.main === module) {
  main();
}

module.exports = {
  showHelp,
  showCurrentConfig,
  setPort,
  addOrigin,
  listOrigins,
};
