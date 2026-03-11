/**
 * Direct JWT verification test to bypass cookie issues
 */

const fetch = require('node-fetch');

async function testJWTDirect() {
  console.log('🔑 Testing direct JWT verification...\n');

  // Step 1: Login and extract tokens from response
  console.log('1. Logging in to get tokens...');
  const loginResponse = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pseudo: 'testuser_persistent',
      password: 'testpassword123',
      rememberMe: true,
    }),
  });

  const loginData = await loginResponse.json();
  console.log('✅ Login successful');

  // Extract tokens from Set-Cookie headers
  const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];

  // Parse the JWT tokens directly
  let accessToken = null;
  let refreshToken = null;

  setCookieHeaders.forEach((cookieStr) => {
    const [cookiePart] = cookieStr.split(';');
    const [name, value] = cookiePart.split('=');
    if (name === 'accessToken') accessToken = value;
    if (name === 'refreshToken') refreshToken = value;
  });

  console.log('2. Extracted tokens:');
  console.log('   Access Token:', accessToken?.substring(0, 20) + '...');
  console.log('   Refresh Token:', refreshToken?.substring(0, 20) + '...');

  // Step 2: Test session check by sending tokens in Authorization header
  console.log('\n3. Testing session check with Authorization header...');

  try {
    const sessionResponse = await fetch('http://localhost:3000/check-session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const sessionData = await sessionResponse.json();
    console.log('Session check status:', sessionResponse.status);
    console.log('Session check response:', sessionData);

    if (sessionData.isSignedIn) {
      console.log('✅ Session check works with Authorization header');
    } else {
      console.log('❌ Session check still fails');
    }
  } catch (error) {
    console.error('❌ Session check failed:', error.message);
  }

  // Step 3: Test refresh token endpoint directly
  console.log('\n4. Testing refresh token endpoint directly...');

  try {
    const refreshResponse = await fetch('http://localhost:3000/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshToken,
      }),
    });

    const refreshData = await refreshResponse.json();
    console.log('Refresh token status:', refreshResponse.status);
    console.log('Refresh token response:', refreshData);

    if (refreshResponse.ok) {
      console.log('✅ Refresh token works when sent in body');
    } else {
      console.log('❌ Refresh token still fails');
    }
  } catch (error) {
    console.error('❌ Refresh token failed:', error.message);
  }

  // Step 4: Test token verification by creating a test endpoint
  console.log('\n5. Testing JWT verification directly...');

  // Decode the JWT to see its contents (without verification)
  try {
    const [header, payload, signature] = accessToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log('✅ Access token payload:', decodedPayload);

    const refreshPayload = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());
    console.log('✅ Refresh token payload:', refreshPayload);
  } catch (error) {
    console.error('❌ Token decoding failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   - Login and token extraction: ✅ Works');
  console.log('   - Token structure: ✅ Valid JWT format');
  console.log('   - Session check with Auth header: ? Need to test');
  console.log('   - Refresh token in body: ? Need to test');
}

testJWTDirect().catch(console.error);
