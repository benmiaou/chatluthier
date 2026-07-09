/**
 * Simple test to debug cookie transmission issues
 */

const fetch = require('node-fetch');

async function testCookieTransmission() {
  console.log('🔍 Testing cookie transmission...\n');

  // Step 1: Login and capture cookies
  console.log('1. Logging in to get cookies...');
  const loginResponse = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pseudo: 'testuser_persistent',
      password: 'testpassword123',
      rememberMe: true,
    }),
  });

  console.log('Login status:', loginResponse.status);
  const loginData = await loginResponse.json();
  console.log('Login response:', loginData);

  // Extract cookies from Set-Cookie headers
  const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
  console.log('\n2. Cookies received from login:');
  setCookieHeaders.forEach((cookie, index) => {
    console.log(`   Cookie ${index + 1}: ${cookie}`);
  });

  // Parse cookies for reuse
  const cookies = {};
  setCookieHeaders.forEach((cookieStr) => {
    const [cookiePart] = cookieStr.split(';');
    const [name, value] = cookiePart.split('=');
    cookies[name] = value;
  });

  console.log('\n3. Parsed cookies:');
  console.log('   Cookies:', cookies);

  // Step 2: Test session check with cookies
  console.log('\n4. Testing session check with cookies...');

  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  console.log('   Cookie header:', cookieHeader);

  const sessionResponse = await fetch('http://localhost:3000/check-session', {
    method: 'GET',
    headers: {
      Cookie: cookieHeader,
    },
  });

  console.log('Session check status:', sessionResponse.status);
  const sessionData = await sessionResponse.json();
  console.log('Session check response:', sessionData);

  // Step 3: Test refresh token with cookies
  console.log('\n5. Testing refresh token with cookies...');

  const refreshResponse = await fetch('http://localhost:3000/refresh-token', {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
    },
  });

  console.log('Refresh token status:', refreshResponse.status);
  const refreshData = await refreshResponse.json();
  console.log('Refresh token response:', refreshData);

  console.log('\n📋 Summary:');
  console.log('   - Login: ✅ Works');
  console.log('   - Cookies received: ✅ Yes');
  console.log('   - Session check: ❌ Fails');
  console.log('   - Refresh token: ❌ Fails');
  console.log('\n🔧 Issue: Cookies are set but not being received by backend');
}

testCookieTransmission().catch(console.error);
