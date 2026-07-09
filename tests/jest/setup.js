/**
 * Jest setup file — runs before each test suite in the frontend project.
 * Polyfills import.meta.env so TypeScript service modules load correctly.
 */
globalThis.__importMeta = {
  env: {
    VITE_REDIRECT_URI_LOCAL: 'http://localhost:5173/callback',
    VITE_REDIRECT_URI_PROD: 'https://prod.example.com/callback',
    VITE_API_BASE_URL: '',
  },
};

// Polyfill TextEncoder / TextDecoder (not included by all jsdom versions)
const { TextEncoder, TextDecoder } = require('util');
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;

// Polyfill Web Crypto API (required by PKCE helpers in services)
// jsdom sets globalThis.crypto without crypto.subtle — force override with Node webcrypto
const { webcrypto } = require('crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Polyfill fetch for jsdom environment
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn();
} else {
  // Wrap existing fetch so tests can spy on it
  globalThis.fetch = jest.fn(globalThis.fetch);
}
