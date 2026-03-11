#!/usr/bin/env node

/**
 * Test CSP Headers Script
 * Tests that the server is serving correct CSP headers
 */

const http = require('http');
const https = require('https');

function testCspHeaders() {
  console.log('🔒 Testing CSP Headers...\n');

  // Test local server first
  console.log('1. Testing local development server (http://localhost:3000)...');

  const localReq = http.request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
    },
    (res) => {
      const cspHeader = res.headers['content-security-policy'];

      if (cspHeader) {
        console.log('   ✅ CSP header found on local server');
        console.log(`   📋 CSP: ${cspHeader}`);

        // Check if Creative Commons is allowed
        if (cspHeader.includes('mirrors.creativecommons.org')) {
          console.log('   ✅ Creative Commons domain is allowed');
        } else {
          console.log('   ❌ Creative Commons domain is NOT allowed');
        }
      } else {
        console.log('   ❌ No CSP header found on local server');
      }

      // Test dev server
      console.log('\n2. Testing dev server (https://dev.chatluthier.org:4000)...');

      const devReq = https.request(
        {
          hostname: 'dev.chatluthier.org',
          port: 4000,
          path: '/',
          method: 'GET',
        },
        (devRes) => {
          const devCspHeader = devRes.headers['content-security-policy'];

          if (devCspHeader) {
            console.log('   ✅ CSP header found on dev server');
            console.log(`   📋 CSP: ${devCspHeader}`);

            // Check if Creative Commons is allowed
            if (devCspHeader.includes('mirrors.creativecommons.org')) {
              console.log('   ✅ Creative Commons domain is allowed');
            } else {
              console.log('   ❌ Creative Commons domain is NOT allowed');
            }
          } else {
            console.log('   ❌ No CSP header found on dev server');
          }

          console.log('\n📝 CSP Header Test Summary:');
          console.log('================================');
          console.log('Local server: Check CSP headers above');
          console.log('Dev server: Check CSP headers above');
          console.log('');
          console.log('🎯 If Creative Commons is not allowed:');
          console.log('   1. Make sure the server is restarted');
          console.log('   2. Check that the CSP middleware is properly configured');
          console.log('   3. Verify the deployment script preserves the CSP configuration');
        }
      );

      devReq.on('error', (error) => {
        console.log(`   ⚠️  Could not connect to dev server: ${error.message}`);
        console.log('   This is expected if the dev server is not running or not accessible');
      });

      devReq.end();
    }
  );

  localReq.on('error', (error) => {
    console.log(`   ⚠️  Could not connect to local server: ${error.message}`);
    console.log('   Make sure the local server is running with: node srv/server.js');
  });

  localReq.end();
}

// Test the configuration directly
console.log('🔧 Testing CSP Configuration...');
try {
  const config = require('../srv/config/appConfig');
  const csp = config.security.contentSecurityPolicy;

  console.log('   ✅ CSP configuration loaded');
  console.log(`   📋 img-src: ${csp.imgSrc}`);

  if (csp.imgSrc.includes('mirrors.creativecommons.org')) {
    console.log('   ✅ Creative Commons domain is configured in CSP');
  } else {
    console.log('   ❌ Creative Commons domain is NOT configured in CSP');
  }

  // Test that the server can start with CSP headers
  console.log('\n🚀 Testing server startup with CSP...');
  const app = require('../srv/app.js');
  console.log('   ✅ Server loads successfully with CSP middleware');
} catch (error) {
  console.log(`   ❌ Error testing CSP configuration: ${error.message}`);
}

testCspHeaders();
