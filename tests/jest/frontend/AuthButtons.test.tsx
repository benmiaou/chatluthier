/**
 * Example frontend component tests (AuthButtons)
 * Tests React component rendering, state, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthButtons from '../../../src/components/auth/AuthButtons';

// Mock the API service
jest.mock('../../../src/services/api', () => ({
  logout: jest.fn().mockResolvedValue({ success: true }),
  login: jest.fn().mockResolvedValue({ accessToken: 'test-token' }),
}));

describe('AuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<AuthButtons isSignedIn={false} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show login button when not signed in', () => {
      render(<AuthButtons isSignedIn={false} />);
      expect(screen.getByRole('link', { name: /sign in|login/i })).toBeInTheDocument();
    });

    it('should show logout button when signed in', () => {
      render(<AuthButtons isSignedIn={true} pseudo="TestUser" onLogout={jest.fn()} />);
      expect(screen.getByText(/TestUser/i)).toBeInTheDocument();
    });

    it('should show admin badge for admin users', () => {
      render(<AuthButtons isSignedIn={true} isAdmin={true} pseudo="Admin" onLogout={jest.fn()} />);
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onLogout when logout button is clicked', async () => {
      const handleLogout = jest.fn();
      render(<AuthButtons isSignedIn={true} pseudo="TestUser" onLogout={handleLogout} />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(handleLogout).toHaveBeenCalled();
      });
    });

    it('should display user pseudo in button', () => {
      const pseudo = 'MyAwesomeNickname';
      render(<AuthButtons isSignedIn={true} pseudo={pseudo} onLogout={jest.fn()} />);
      expect(screen.getByText(pseudo)).toBeInTheDocument();
    });

    it('should handle undefined pseudo gracefully', () => {
      render(<AuthButtons isSignedIn={true} onLogout={jest.fn()} />);
      // Component should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('conditional rendering', () => {
    it('should show "User" text when pseudo is not provided', () => {
      render(<AuthButtons isSignedIn={true} onLogout={jest.fn()} />);
      expect(screen.getByText(/user/i)).toBeInTheDocument();
    });

    it('should not show admin badge when isAdmin is false', () => {
      render(<AuthButtons isSignedIn={true} isAdmin={false} pseudo="User" onLogout={jest.fn()} />);
      expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles', () => {
      render(<AuthButtons isSignedIn={false} />);
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should have accessible text for logout action', () => {
      render(<AuthButtons isSignedIn={true} pseudo="User" onLogout={jest.fn()} />);
      expect(screen.getByRole('button', { name: /logout|sign out/i })).toBeInTheDocument();
    });

    it('logout button should be keyboard accessible', () => {
      const handleLogout = jest.fn();
      render(<AuthButtons isSignedIn={true} pseudo="User" onLogout={handleLogout} />);

      const logoutButton = screen.getByRole('button');
      logoutButton.focus();
      expect(logoutButton).toHaveFocus();

      fireEvent.keyDown(logoutButton, { key: 'Enter', code: 'Enter' });
    });
  });
});
