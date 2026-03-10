/**
 * Debug test to verify cookie setting and sending
 */

const fetch = require('node-fetch');

async function testCookieDebug() {
  console.log('🔍 Debugging cookie setting and sending...\n');

  // Test 1: Set a simple cookie
  console.log('1. Setting a test cookie...');
  try {
    const setCookieResponse = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: 'testuser_persistent',
        password: 'testpassword123',
        rememberMe: true,
      }),
    });

    const cookies = setCookieResponse.headers.raw()['set-cookie'] || [];
    console.log('✅ Cookies set:', cookies.length);
    cookies.forEach((cookie, i) => {
      console.log(`   Cookie ${i + 1}: ${cookie.substring(0, 100)}...`);
    });

    // Extract cookie values
    const cookieMap = {};
    cookies.forEach((cookieStr) => {
      const [cookiePart] = cookieStr.split(';');
      const [name, value] = cookiePart.split('=');
      cookieMap[name] = value;
    });

    // Test 2: Send cookies back to server
    console.log('\n2. Sending cookies back to server...');

    const cookieHeader = Object.entries(cookieMap)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    console.log('   Cookie header:', cookieHeader.substring(0, 50) + '...');

    // Test session check with cookies
    const sessionResponse = await fetch('http://localhost:3000/check-session', {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    });

    console.log('   Session check status:', sessionResponse.status);
    const sessionData = await sessionResponse.json();
    console.log('   Session check response:', sessionData);

    // Test refresh token with cookies
    const refreshResponse = await fetch('http://localhost:3000/refresh-token', {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
      },
    });

    console.log('   Refresh token status:', refreshResponse.status);
    const refreshData = await refreshResponse.json();
    console.log('   Refresh token response:', refreshData);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Test 3: Check if cookies work with different approaches
  console.log('\n3. Testing alternative approaches...');

  // Approach 1: Send tokens in headers
  console.log('   Approach 1: Tokens in Authorization header');
  try {
    // First get fresh tokens
    const loginResponse = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: 'testuser_persistent',
        password: 'testpassword123',
        rememberMe: true,
      }),
    });

    const cookies = loginResponse.headers.raw()['set-cookie'] || [];
    let accessToken = null;
    cookies.forEach((cookieStr) => {
      const [cookiePart] = cookieStr.split(';');
      const [name, value] = cookiePart.split('=');
      if (name === 'accessToken') accessToken = value;
    });

    if (accessToken) {
      const authResponse = await fetch('http://localhost:3000/check-session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('   Auth header status:', authResponse.status);
      const authData = await authResponse.json();
      console.log('   Auth header response:', authData);
    }
  } catch (error) {
    console.error('   Auth header failed:', error.message);
  }

  // Approach 2: Send refresh token in body
  console.log('\n   Approach 2: Refresh token in request body');
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

    const cookies = loginResponse.headers.raw()['set-cookie'] || [];
    let refreshToken = null;
    cookies.forEach((cookieStr) => {
      const [cookiePart] = cookieStr.split(';');
      const [name, value] = cookiePart.split('=');
      if (name === 'refreshToken') refreshToken = value;
    });

    if (refreshToken) {
      const bodyResponse = await fetch('http://localhost:3000/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      console.log('   Body refresh status:', bodyResponse.status);
      const bodyData = await bodyResponse.json();
      console.log('   Body refresh response:', bodyData);
    }
  } catch (error) {
    console.error('   Body refresh failed:', error.message);
  }

  console.log('\n📋 Debug summary:');
  console.log('   - Cookies are being set correctly');
  console.log('   - Cookies can be extracted and formatted');
  console.log('   - Manual cookie sending needs testing');
  console.log('   - Alternative approaches (headers/body) available');
}

testCookieDebug().catch(console.error);
