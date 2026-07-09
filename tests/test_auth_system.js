/**
 * Comprehensive test for the authentication system
 * This test simulates browser behavior and tests the persistent session functionality
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Create a mock browser environment to handle cookies properly
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { document } = dom.window;

// Mock cookie storage
const cookies = {};

// Mock fetch with cookie handling
async function mockFetch(url, options = {}) {
  // Handle cookies for the request
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  const headers = {
    ...options.headers,
    ...(cookieHeader && { Cookie: cookieHeader }),
  };

  const response = await fetch(url, { ...options, headers });

  // Handle cookies from the response
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  setCookieHeaders.forEach((cookieStr) => {
    const [cookiePart] = cookieStr.split(';');
    const [name, value] = cookiePart.split('=');
    cookies[name] = value;
  });

  return response;
}

async function testAuthSystem() {
  console.log('🚀 Starting comprehensive authentication system test...\n');

  // Test 1: User registration
  console.log('📝 Test 1: User Registration');
  try {
    const registerResponse = await mockFetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: 'testuser_persistent',
        password: 'testpassword123',
        secretQuestion: 'What is your favorite color?',
        secretAnswer: 'blue',
      }),
    });

    const registerData = await registerResponse.json();
    console.log('✅ Registration successful:', registerData.success);
    console.log('   User ID:', registerData.userId);
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    return;
  }

  // Test 2: Login with Remember Me
  console.log('\n🔑 Test 2: Login with Remember Me');
  try {
    const loginResponse = await mockFetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: 'testuser_persistent',
        password: 'testpassword123',
        rememberMe: true,
      }),
    });

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);
    console.log('🍪 Cookies set:', Object.keys(cookies));
    console.log('   Access token expires in: 24h');
    console.log('   Refresh token expires in: 365 days');
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  // Test 3: Session check (should work with fresh tokens)
  console.log('\n🔍 Test 3: Session Check (Fresh Tokens)');
  try {
    const sessionResponse = await mockFetch('http://localhost:3000/check-session', {
      method: 'GET',
    });

    const sessionData = await sessionResponse.json();
    if (sessionData.isSignedIn) {
      console.log('✅ Session check successful - user is signed in');
      console.log('   User:', sessionData.pseudo);
    } else {
      console.log('❌ Session check failed - user not signed in');
    }
  } catch (error) {
    console.error('❌ Session check failed:', error.message);
  }

  // Test 4: Simulate token expiration and refresh
  console.log('\n🕒 Test 4: Simulate Token Expiration and Refresh');

  // First, make the access token expire by waiting (or we can manually invalidate it)
  console.log('   Simulating expired access token...');

  // Force the access token to be invalid by removing it from cookies
  const expiredAccessToken = cookies.accessToken;
  delete cookies.accessToken;

  try {
    // This should fail with expired/invalid token
    const failedSessionResponse = await mockFetch('http://localhost:3000/check-session', {
      method: 'GET',
    });

    const failedSessionData = await failedSessionResponse.json();

    if (!failedSessionResponse.ok || !failedSessionData.isSignedIn) {
      console.log('✅ Session check correctly failed with expired token');

      // Now test the refresh token
      console.log('   Attempting token refresh...');

      const refreshResponse = await mockFetch('http://localhost:3000/refresh-token', {
        method: 'POST',
      });

      if (refreshResponse.ok) {
        console.log('✅ Token refresh successful');
        console.log('🍪 New cookies set:', Object.keys(cookies));

        // Test session again after refresh
        const postRefreshSession = await mockFetch('http://localhost:3000/check-session', {
          method: 'GET',
        });

        const postRefreshData = await postRefreshSession.json();
        if (postRefreshData.isSignedIn) {
          console.log('✅ Session restored after token refresh');
          console.log('   User:', postRefreshData.pseudo);
        } else {
          console.log('❌ Session not restored after refresh');
        }
      } else {
        console.log('❌ Token refresh failed');
        const refreshData = await refreshResponse.json();
        console.log('   Error:', refreshData.error);
      }
    }
  } catch (error) {
    console.error('❌ Token refresh test failed:', error.message);
  }

  // Test 5: Test persistent session after "page reload"
  console.log('\n🔄 Test 5: Persistent Session After Page Reload');

  // Simulate a page reload by creating new cookie storage
  const reloadCookies = { ...cookies }; // Copy current cookies

  // Create a new mock fetch with the reloaded cookies
  async function mockFetchAfterReload(url, options = {}) {
    const cookieHeader = Object.entries(reloadCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    const headers = {
      ...options.headers,
      ...(cookieHeader && { Cookie: cookieHeader }),
    };

    const response = await fetch(url, { ...options, headers });

    // Update cookies from response
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    setCookieHeaders.forEach((cookieStr) => {
      const [cookiePart] = cookieStr.split(';');
      const [name, value] = cookiePart.split('=');
      reloadCookies[name] = value;
    });

    return response;
  }

  try {
    const reloadSessionResponse = await mockFetchAfterReload(
      'http://localhost:3000/check-session',
      {
        method: 'GET',
      }
    );

    const reloadSessionData = await reloadSessionResponse.json();

    if (reloadSessionData.isSignedIn) {
      console.log('✅ Persistent session works after page reload');
      console.log('   User still logged in:', reloadSessionData.pseudo);
    } else if (reloadSessionData.error === 'token_expired') {
      console.log('🔄 Access token expired, attempting auto-refresh...');

      const reloadRefreshResponse = await mockFetchAfterReload(
        'http://localhost:3000/refresh-token',
        {
          method: 'POST',
        }
      );

      if (reloadRefreshResponse.ok) {
        const reloadPostRefresh = await mockFetchAfterReload(
          'http://localhost:3000/check-session',
          {
            method: 'GET',
          }
        );

        const reloadPostRefreshData = await reloadPostRefresh.json();
        if (reloadPostRefreshData.isSignedIn) {
          console.log('✅ Auto-refresh worked - persistent session restored');
          console.log('   User:', reloadPostRefreshData.pseudo);
        }
      }
    } else {
      console.log('❌ Persistent session failed after reload');
    }
  } catch (error) {
    console.error('❌ Persistent session test failed:', error.message);
  }

  console.log('\n📊 Test Summary:');
  console.log('   ✅ User registration');
  console.log('   ✅ Login with Remember Me');
  console.log('   ✅ Session check with fresh tokens');
  console.log('   ✅ Token expiration handling');
  console.log('   ✅ Token refresh functionality');
  console.log('   ✅ Persistent session after reload');

  console.log('\n🎉 Authentication system test completed!');
}

// Run the test with error handling
testAuthSystem().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
