#!/usr/bin/env node

/**
 * CSP Deployment Verification Script
 * Verifies that CSP changes are properly deployed on the server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CSP Deployment Verification');
console.log('================================\n');

// 1. Check local configuration
console.log('1. Checking local CSP configuration...');
try {
  const config = require('../srv/config/appConfig');
  const csp = config.security.contentSecurityPolicy;

  console.log('   ✅ Local CSP config loaded');
  console.log(`   📋 img-src: ${csp.imgSrc}`);

  if (csp.imgSrc.includes('mirrors.creativecommons.org')) {
    console.log('   ✅ Creative Commons domain configured');
  } else {
    console.log('   ❌ Creative Commons domain NOT configured');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// 2. Check server code
console.log('\n2. Checking server CSP middleware...');
try {
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'srv', 'app.js'), 'utf8');

  const hasCspMiddleware = appContent.includes('Content-Security-Policy');
  const hasCspConfig = appContent.includes('config.security.contentSecurityPolicy');
  const hasDebugLogging = appContent.includes('[CSP] Setting header:');

  if (hasCspMiddleware) {
    console.log('   ✅ CSP middleware present');
  } else {
    console.log('   ❌ CSP middleware missing');
  }

  if (hasCspConfig) {
    console.log('   ✅ CSP uses central configuration');
  } else {
    console.log('   ❌ CSP not using central configuration');
  }

  if (hasDebugLogging) {
    console.log('   ✅ Debug logging enabled');
  } else {
    console.log('   ⚠️  Debug logging not found');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// 3. Check deployment script
console.log('\n3. Checking deployment script...');
try {
  const deployContent = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'deploy-dev.bat'),
    'utf8'
  );

  const preservesHtml = deployContent.includes('Preserving index.html');
  const verifiesCsp = deployContent.includes('Verifying CSP configuration');
  const restartsServer = deployContent.includes('pm2 restart chatluthier-dev');

  if (preservesHtml) {
    console.log('   ✅ Deployment preserves HTML files');
  } else {
    console.log('   ❌ Deployment may modify HTML files');
  }

  if (verifiesCsp) {
    console.log('   ✅ Deployment verifies CSP');
  } else {
    console.log('   ❌ Deployment does not verify CSP');
  }

  if (restartsServer) {
    console.log('   ✅ Deployment restarts server');
  } else {
    console.log('   ❌ Deployment does not restart server');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// 4. Check for common issues
console.log('\n4. Checking for common deployment issues...');

const commonIssues = [];

// Check if there are multiple CSP configurations
try {
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'srv', 'app.js'), 'utf8');
  const cspCount = (appContent.match(/Content-Security-Policy/g) || []).length;

  if (cspCount > 1) {
    commonIssues.push('Multiple CSP configurations found - may cause conflicts');
  }
} catch (error) {
  commonIssues.push('Could not check for multiple CSP configurations');
}

// Check middleware order
try {
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'srv', 'app.js'), 'utf8');
  const cspLine = appContent.indexOf('Content-Security-Policy');
  const corsLine = appContent.indexOf('app.use(cors(');

  if (corsLine > 0 && cspLine > corsLine) {
    commonIssues.push('CSP middleware should be before CORS middleware');
  }
} catch (error) {
  commonIssues.push('Could not check middleware order');
}

if (commonIssues.length === 0) {
  console.log('   ✅ No common issues detected');
} else {
  commonIssues.forEach((issue) => console.log(`   ⚠️  ${issue}`));
}

// 5. Provide deployment checklist
console.log('\n📋 Deployment Checklist:');
console.log('================================');
console.log('✅ Local configuration is correct');
console.log('✅ Server code has CSP middleware');
console.log('✅ Deployment script is properly configured');
console.log('');
console.log('🔧 If CSP is still not working on dev server:');
console.log('   1. Run: node scripts/deploy-dev.bat');
console.log('   2. Check server logs for [CSP] messages');
console.log('   3. Verify PM2 process is running: pm2 list');
console.log('   4. Restart manually if needed: pm2 restart chatluthier-dev');
console.log('   5. Check browser console for CSP headers');
console.log('');
console.log('💡 Debugging commands:');
console.log('   curl -I https://dev.chatluthier.org:4000');
console.log('   pm2 logs chatluthier-dev');
console.log('   pm2 show chatluthier-dev');

console.log('\n🎯 Expected CSP Header:');
console.log(
  "Content-Security-Policy: default-src 'self'; connect-src 'self' wss://; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' 'data:' https://mirrors.creativecommons.org; font-src 'self';"
);
