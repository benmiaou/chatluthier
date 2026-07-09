# Authentication System Tests

This directory contains comprehensive tests for the authentication system.

## Available Tests

### 1. `test_auth_system.js`

Comprehensive test that simulates the full authentication flow:

- User registration
- Login with "Remember Me"
- Session checking
- Token expiration and refresh
- Persistent session after page reload

### 2. `test_cookie_transmission.js`

Debug test for cookie transmission issues:

- Tests login and cookie extraction
- Tests session check with cookies
- Tests refresh token with cookies

### 3. `test_jwt_direct.js`

Direct JWT verification test:

- Tests token extraction and decoding
- Tests session check with Authorization header
- Tests refresh token in request body

## Running Tests

### Run all tests:

```bash
node tests/run_all_tests.js
```

### Run individual tests:

```bash
node tests/test_auth_system.js
node tests/test_cookie_transmission.js
node tests/test_jwt_direct.js
```

## Test Results Interpretation

- ✅ **Passed**: Test completed successfully
- ❌ **Failed**: Test encountered an error
- 🔧 **Issue**: Indicates a known issue that needs attention

## Current Status

The tests reveal that:

1. ✅ User registration works
2. ✅ Login works and sets cookies correctly
3. ✅ Tokens have valid JWT structure
4. ❌ Session check fails (cookie transmission issue)
5. ❌ Token refresh fails (cookie transmission issue)

## Debugging

The main issue appears to be cookie transmission between frontend (port 5173) and backend (port 3000). The cookies are being set correctly but not received by the backend.

## Development Notes

- Tests use `node-fetch` for HTTP requests
- Cookie handling is simulated to mimic browser behavior
- JWT tokens are decoded to verify their structure
- Debug logs are included to help troubleshoot issues
