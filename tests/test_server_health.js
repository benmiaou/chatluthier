/**
 * Simple test to check server health and debug cookie issues
 */

const fetch = require('node-fetch');

async function testServerHealth() {
  console.log('🏥 Testing server health and cookie debugging...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await fetch('http://localhost:3000/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: Simple login to check cookie settings
  console.log('\n2. Testing login to check cookie attributes...');
  try {
    const loginResponse = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: 'testuser_persistent',
        password: 'testpassword123',
        rememberMe: true,
      }),
    });

    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
    console.log('✅ Cookies set by server:');
    setCookieHeaders.forEach((cookie, index) => {
      console.log(`   ${cookie}`);

      // Check if cookies have the right attributes for localhost
      if (cookie.includes('SameSite=Lax') && !cookie.includes('Secure')) {
        console.log('   ✅ Cookie has correct localhost attributes');
      } else {
        console.log('   ❌ Cookie has incorrect attributes');
      }
    });
  } catch (error) {
    console.error('❌ Login failed:', error.message);
  }

  console.log('\n📋 Server health test completed');
}

testServerHealth().catch(console.error);
