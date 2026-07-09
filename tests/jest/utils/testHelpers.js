/**
 * Shared test utilities for Jest tests
 * Provides factories, mocks, and helper functions
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ─── Mock Data Factories ──────────────────────────────────────────────────────

/**
 * Create a mock user object
 */
function createMockUser(overrides = {}) {
  return {
    userId: crypto.randomBytes(12).toString('hex'),
    pseudo: 'TestUser',
    email: 'test@example.com',
    isAdmin: false,
    ...overrides,
  };
}

/**
 * Create a mock sound object (base format)
 */
function createMockSound(overrides = {}) {
  return {
    filename: `sound_${crypto.randomBytes(6).toString('hex')}.mp3`,
    display_name: 'Test Sound',
    imageFile: null,
    contexts: ['General'],
    credit: 'Test Credit',
    isEnabled: true,
    ...overrides,
  };
}

/**
 * Create a mock JWT token
 */
function createMockToken(user = {}, secret = 'test-secret') {
  const payload = {
    userId: user.userId || crypto.randomBytes(12).toString('hex'),
    pseudo: user.pseudo || 'TestUser',
    email: user.email || 'test@example.com',
    isAdmin: user.isAdmin || false,
  };
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/**
 * Create a mock request object
 */
function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    hostname: 'localhost',
    ...overrides,
  };
}

/**
 * Create a mock response object with chainable methods
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    cookies: {},
    cookieCalls: [],
    _getStatusCode() {
      return this.statusCode;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    cookie(name, value, options = {}) {
      this.cookieCalls.push({ name, value, options });
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options = {}) {
      this.cookieCalls.push({ name, value: null, options, cleared: true });
      delete this.cookies[name];
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

/**
 * Assert response status and body
 */
function expectResponse(res, expectedStatus, expectedBody = null) {
  expect(res.statusCode).toBe(expectedStatus);
  if (expectedBody !== null) {
    expect(res.body).toEqual(expectedBody);
  }
}

/**
 * Simulate a promise-based async operation
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock database query result
 */
function createMockDbRow(overrides = {}) {
  return {
    id: Math.random(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Assertion Helpers ────────────────────────────────────────────────────────

/**
 * Assert error response format
 */
function expectErrorResponse(res, expectedStatus, expectedErrorMessage = null) {
  expect(res.statusCode).toBe(expectedStatus);
  expect(res.body).toHaveProperty('error');
  if (expectedErrorMessage) {
    expect(res.body.error).toContain(expectedErrorMessage);
  }
}

/**
 * Assert JWT token structure
 */
function expectValidToken(token) {
  expect(typeof token).toBe('string');
  const parts = token.split('.');
  expect(parts.length).toBe(3); // Header.Payload.Signature
}

/**
 * Decode JWT without verification (for testing)
 */
function decodeToken(token) {
  const parts = token.split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

// ─── Logger Mock ──────────────────────────────────────────────────────────────

/**
 * Create a mock logger that captures calls
 */
function createMockLogger() {
  return {
    calls: {
      info: [],
      error: [],
      warn: [],
      access: [],
      debug: [],
    },
    info: function (...args) {
      this.calls.info.push(args);
    },
    error: function (...args) {
      this.calls.error.push(args);
    },
    warn: function (...args) {
      this.calls.warn.push(args);
    },
    access: function (...args) {
      this.calls.access.push(args);
    },
    debug: function (...args) {
      this.calls.debug.push(args);
    },
    getCalls(level) {
      return this.calls[level];
    },
  };
}

module.exports = {
  createMockUser,
  createMockSound,
  createMockToken,
  createMockRequest,
  createMockResponse,
  createMockDbRow,
  createMockLogger,
  expectResponse,
  expectErrorResponse,
  expectValidToken,
  decodeToken,
  delay,
};
