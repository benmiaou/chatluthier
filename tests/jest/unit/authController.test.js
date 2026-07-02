/**
 * Unit tests for authController.js
 * Tests JWT generation, token refresh, session validation, and auth flows
 */

// Mock dependencies FIRST before importing helpers
jest.mock('../../../srv/config/secret', () => {
  return () => ({
    accessTokenSecret: 'test-access-secret-12345678901234567890',
    refreshTokenSecret: 'test-refresh-secret-12345678901234567890',
  });
});

jest.mock('../../../srv/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  access: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../../srv/database/db');

// Now require helpers
const {
  createMockRequest,
  createMockResponse,
  createMockUser,
  createMockToken,
  expectErrorResponse,
  expectValidToken,
  decodeToken,
} = require('../utils/testHelpers');

const authController = require('../../../srv/controllers/authController');

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    it('should refresh token from cookies', () => {
      const user = createMockUser();
      const { refreshTokenSecret } = require('../../../srv/config/secret')();
      const oldRefreshToken = createMockToken(user, refreshTokenSecret);

      const req = createMockRequest({
        cookies: { refreshToken: oldRefreshToken },
        hostname: 'localhost',
      });
      const res = createMockResponse();

      authController.refreshToken(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expectValidToken(res.body.accessToken);
    });

    it('should refresh token from request body if no cookie', () => {
      const user = createMockUser();
      const { refreshTokenSecret } = require('../../../srv/config/secret')();
      const refreshToken = createMockToken(user, refreshTokenSecret);

      const req = createMockRequest({
        body: { refreshToken },
        hostname: 'localhost',
      });
      const res = createMockResponse();

      authController.refreshToken(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 if no refresh token provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      authController.refreshToken(req, res);

      expectErrorResponse(res, 401, 'No refresh token provided');
    });

    it('should return 401 if token is invalid', () => {
      const req = createMockRequest({
        cookies: { refreshToken: 'invalid.token.here' },
        hostname: 'localhost',
      });
      const res = createMockResponse();

      authController.refreshToken(req, res);

      expectErrorResponse(res, 401, 'verification failed');
    });

    it('should include user data in new tokens', () => {
      const user = createMockUser({ pseudo: 'TestAdmin', isAdmin: true });
      const { refreshTokenSecret } = require('../../../srv/config/secret')();
      const refreshToken = createMockToken(user, refreshTokenSecret);

      const req = createMockRequest({
        cookies: { refreshToken },
        hostname: 'localhost',
      });
      const res = createMockResponse();

      authController.refreshToken(req, res);

      const decoded = decodeToken(res.body.accessToken);
      expect(decoded.pseudo).toBe('TestAdmin');
      expect(decoded.isAdmin).toBe(true);
    });
  });

  describe('checkSession', () => {
    it('should verify valid access token from cookies', () => {
      const user = createMockUser();
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const token = createMockToken(user, accessTokenSecret);

      const req = createMockRequest({
        cookies: { accessToken: token },
      });
      const res = createMockResponse();

      authController.checkSession(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isSignedIn).toBe(true);
      expect(res.body.userId).toBe(user.userId);
      expect(res.body.pseudo).toBe(user.pseudo);
    });

    it('should verify token from Authorization header', () => {
      const user = createMockUser();
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const token = createMockToken(user, accessTokenSecret);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authController.checkSession(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.isSignedIn).toBe(true);
    });

    it('should return 401 if no token provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      authController.checkSession(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.isSignedIn).toBe(false);
    });

    it('should prioritize cookie token over header token', () => {
      const user1 = createMockUser({ pseudo: 'User1' });
      const user2 = createMockUser({ pseudo: 'User2' });
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const token1 = createMockToken(user1, accessTokenSecret);
      const token2 = createMockToken(user2, accessTokenSecret);

      const req = createMockRequest({
        cookies: { accessToken: token1 },
        headers: { authorization: `Bearer ${token2}` },
      });
      const res = createMockResponse();

      authController.checkSession(req, res);

      expect(res.body.pseudo).toBe('User1');
    });

    it('should include admin flag in response', () => {
      const user = createMockUser({ isAdmin: true });
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const token = createMockToken(user, accessTokenSecret);

      const req = createMockRequest({
        cookies: { accessToken: token },
      });
      const res = createMockResponse();

      authController.checkSession(req, res);

      expect(res.body.isAdmin).toBe(true);
    });
  });

  describe('verifyjwt', () => {
    it('should verify valid token', async () => {
      const user = createMockUser();
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const token = createMockToken(user, accessTokenSecret);

      const decoded = await authController.verifyjwt(token);

      expect(decoded.userId).toBe(user.userId);
      expect(decoded.pseudo).toBe(user.pseudo);
    });

    it('should throw error for invalid token', async () => {
      await expect(authController.verifyjwt('invalid.token.here')).rejects.toThrow();
    });

    it('should throw error for expired token', async () => {
      const { accessTokenSecret } = require('../../../srv/config/secret')();
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({ userId: 'test' }, accessTokenSecret, { expiresIn: '-1h' });

      await expect(authController.verifyjwt(expiredToken)).rejects.toThrow();
    });
  });
});
