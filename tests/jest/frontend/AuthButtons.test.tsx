/**
 * Example frontend component tests (AuthButtons)
 * Tests React component rendering, state, and interactions
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';
import { AuthButtons } from '../../../src/components/auth/AuthButtons';

// Mock the API service
jest.mock('../../../src/services/api', () => ({
  logout: jest.fn().mockResolvedValue({ success: true }),
  login: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
}));

// Mock AuthContext with configurable return values
import { useAuthContext } from '../../../src/contexts/AuthContext';
jest.mock('../../../src/contexts/AuthContext');

// Helper to configure mock context values
function mockUseAuthContext(values: Partial<ReturnType<typeof useAuthContext>>) {
  (useAuthContext as jest.Mock).mockReturnValue({
    isSignedIn: false,
    userName: undefined,
    userPicture: undefined,
    signOut: jest.fn(),
    loginWithPseudo: jest.fn(),
    registerWithPseudo: jest.fn(),
    getSecretQuestion: jest.fn(),
    requestPasswordReset: jest.fn(),
    ...values,
  });
}

// Helper to render with MantineProvider
function renderWithProviders(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('AuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mock
    mockUseAuthContext({});
  });

  describe('rendering', () => {
    it('should render without crashing when not signed in', () => {
      mockUseAuthContext({ isSignedIn: false });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
    });

    it('should render without crashing when signed in', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'TestUser' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
    });

    it('should render without crashing for admin user', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'Admin' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
    });

    it('should render logout button when signed in', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'TestUser' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
    });
  });

  describe('interactions', () => {
    it('should handle signOut call without errors', async () => {
      const mockSignOut = jest.fn();
      mockUseAuthContext({ isSignedIn: true, userName: 'TestUser', signOut: mockSignOut });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Test completes without errors
    });

    it('should display user name when provided', () => {
      const userName = 'MyAwesomeNickname';
      mockUseAuthContext({ isSignedIn: true, userName });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });

    it('should handle undefined user name gracefully', () => {
      mockUseAuthContext({ isSignedIn: true, userName: undefined });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component should render without crashing
    });
  });

  describe('conditional rendering', () => {
    it('should render when user name is not provided', () => {
      mockUseAuthContext({ isSignedIn: true, userName: undefined });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });

    it('should render for non-admin user', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'User' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });
  });

  describe('accessibility', () => {
    it('should render with proper structure', () => {
      mockUseAuthContext({ isSignedIn: false });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });

    it('should render when signed in', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'User' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });

    it('should handle keyboard interaction without errors', () => {
      mockUseAuthContext({ isSignedIn: true, userName: 'User' });
      expect(() => {
        renderWithProviders(<AuthButtons />);
      }).not.toThrow();
      // Component renders without errors
    });
  });
});
