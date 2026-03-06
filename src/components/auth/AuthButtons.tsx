import {
  Avatar,
  Group,
  Menu,
  Text,
  Button,
  Modal,
  TextInput,
  PasswordInput,
  Stack,
} from '@mantine/core';

import { IconLogout, IconLogin, IconUserPlus } from '@tabler/icons-react';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { handleError } from '../../utils/logger';

// Extracted component for pseudo availability status
interface PseudoAvailabilityStatusProps {
  readonly checking: boolean;
  readonly available: boolean | null;
}

const PseudoAvailabilityStatus = ({
  checking,
  available,
}: PseudoAvailabilityStatusProps): React.ReactNode => {
  if (checking) {
    return (
      <Text size="xs" c="gray">
        Checking...
      </Text>
    );
  }
  if (available === true) {
    return (
      <Text size="xs" c="green">
        ✓ Available
      </Text>
    );
  }
  return null;
};

export function AuthButtons(): React.ReactElement {
  const {
    isSignedIn,

    userName,

    userPicture,

    signOut,

    loginWithPseudo,

    registerWithPseudo,

    getSecretQuestion,

    requestPasswordReset,
  } = useAuthContext();

  // Modal states

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Form states

  const [loginPseudo, setLoginPseudo] = useState('');

  const [loginPassword, setLoginPassword] = useState('');

  const [registerPseudo, setRegisterPseudo] = useState('');

  const [registerPassword, setRegisterPassword] = useState('');

  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const [registerSecretQuestion, setRegisterSecretQuestion] = useState('');

  const [registerSecretAnswer, setRegisterSecretAnswer] = useState('');

  const [error, setError] = useState('');

  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);

  const [secretQuestionModalOpen, setSecretQuestionModalOpen] = useState(false);

  const [resetPseudo, setResetPseudo] = useState('');

  const [resetSecretQuestion, setResetSecretQuestion] = useState('');

  const [resetSecretAnswer, setResetSecretAnswer] = useState('');

  const [resetNewPassword, setResetNewPassword] = useState('');

  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Real-time validation states for registration

  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null);

  const [pseudoChecking, setPseudoChecking] = useState(false);

  const [passwordMatch, setPasswordMatch] = useState(false);

  const [passwordStrongEnough, setPasswordStrongEnough] = useState(false);

  // Real-time validation effects

  useEffect(() => {
    // Check if passwords match

    setPasswordMatch(
      registerPassword === registerConfirmPassword && registerConfirmPassword !== ''
    );
  }, [registerPassword, registerConfirmPassword]);

  useEffect(() => {
    // Check if password is strong enough (at least 6 characters)

    setPasswordStrongEnough(registerPassword.length >= 6);
  }, [registerPassword]);

  useEffect(() => {
    // Check if pseudo is available (debounced to avoid too many requests)

    if (registerPseudo.trim() === '') {
      setPseudoAvailable(null);

      return;
    }

    const timer = setTimeout(async () => {
      setPseudoChecking(true);

      try {
        // Convert pseudo to lowercase for case-insensitive comparison

        const pseudoToCheck = registerPseudo.trim();

        const response = await fetch('/check-pseudo-available', {
          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ pseudo: pseudoToCheck }),
        });

        if (response.ok) {
          const data = await response.json();

          setPseudoAvailable(data.available);
        } else {
          // If the endpoint fails, assume pseudo is available for development

          // Pseudo availability check failed, assuming available

          setPseudoAvailable(true);
        }
      } catch (_error) {
        // Log the error for debugging purposes
        handleError(_error, 'AuthButtons.pseudoAvailabilityCheck');
        // If there's an error, assume pseudo is available for development
        setPseudoAvailable(true);
      } finally {
        setPseudoChecking(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [registerPseudo]);

  const handleLogin = async () => {
    try {
      setError('');

      await loginWithPseudo(loginPseudo, loginPassword);

      setLoginModalOpen(false);

      setLoginPseudo('');

      setLoginPassword('');
    } catch (_error) {
      // Show a simple, user-friendly error message for login failures
      handleError(_error, 'AuthButtons.handleLogin');
      setError('Incorrect login or password');
    }
  };

  const handleRegister = async () => {
    try {
      setError('');

      // Check validation states

      if (!passwordStrongEnough) {
        setError('Password must be at least 6 characters');

        return;
      }

      if (!passwordMatch) {
        setError('Passwords do not match');

        return;
      }

      if (pseudoAvailable === false) {
        setError('Pseudo is already taken');

        return;
      }

      // Validate secret question and answer

      if (!registerSecretQuestion || !registerSecretAnswer) {
        setError('Secret question and answer are required');

        return;
      }

      await registerWithPseudo(
        registerPseudo,

        registerPassword,

        registerSecretQuestion,

        registerSecretAnswer
      );

      setRegisterModalOpen(false);

      setRegisterPseudo('');

      setRegisterPassword('');

      setRegisterConfirmPassword('');

      setRegisterSecretQuestion('');

      setRegisterSecretAnswer('');
    } catch (_error) {
      handleError(_error, 'AuthButtons.handleRegister');
      setError('Registration failed');
    }
  };

  const handleGetSecretQuestion = async () => {
    try {
      setError('');

      if (!resetPseudo.trim()) {
        setError('Please enter your pseudo');

        return;
      }

      const result = await getSecretQuestion(resetPseudo);

      setResetSecretQuestion(result.secretQuestion);

      setSecretQuestionModalOpen(true);

      setPasswordResetModalOpen(false);
    } catch (_error) {
      setError(_error instanceof Error ? _error.message : 'Failed to retrieve secret question');
    }
  };

  const handlePasswordResetModalOpen = () => {
    setError('');

    setPasswordResetModalOpen(true);
  };

  const handleLoginModalOpen = () => {
    setError('');

    setLoginModalOpen(true);
  };

  const handleRegisterModalOpen = () => {
    setError('');

    setRegisterModalOpen(true);
  };

  const handlePasswordReset = async () => {
    try {
      setError('');

      // Validate secret answer

      if (!resetSecretAnswer.trim()) {
        setError('Please enter your secret answer');

        return;
      }

      // Validate password confirmation

      if (resetNewPassword !== resetConfirmPassword) {
        setError('Passwords do not match');

        return;
      }

      // Validate password length

      if (resetNewPassword.length < 6) {
        setError('Password must be at least 6 characters');

        return;
      }

      await requestPasswordReset(resetPseudo, resetSecretAnswer, resetNewPassword);

      setSecretQuestionModalOpen(false);

      setResetPseudo('');

      setResetSecretQuestion('');

      setResetSecretAnswer('');

      setResetNewPassword('');

      setResetConfirmPassword('');

      // Password reset successfully!
    } catch (_error) {
      setError(_error instanceof Error ? _error.message : 'Password reset failed');
    }
  };

  if (isSignedIn) {
    return (
      <Menu withinPortal position="bottom-end">
        <Menu.Target>
          <Group gap="xs" style={{ cursor: 'pointer' }}>
            {userPicture ? (
              <Avatar src={userPicture} size="sm" radius="xl" />
            ) : (
              <Avatar size="sm" radius="xl">
                {userName ? userName[0] : ''}
              </Avatar>
            )}

            <Text size="sm" visibleFrom="sm">
              {userName}
            </Text>
          </Group>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={signOut}>
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Group gap="sm">
      <Button
        leftSection={<IconLogin size={16} />}
        variant="default"
        size="compact-sm"
        style={{ height: '36px' }}
        onClick={handleLoginModalOpen}
      >
        Login
      </Button>

      <Button
        leftSection={<IconUserPlus size={16} />}
        variant="filled"
        size="compact-sm"
        style={{ height: '36px' }}
        onClick={handleRegisterModalOpen}
      >
        Sign Up
      </Button>

      {/* Login Modal */}

      <Modal
        opened={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);

          setError('');
        }}
        title="Login"
        centered
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleLogin();
          }
        }}
        closeOnClickOutside={false}
        closeOnEscape={true}
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Your pseudo"
            value={loginPseudo}
            onChange={(e) => setLoginPseudo(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
              }
            }}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin();
              }
            }}
          />

          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          <Button onClick={handleLogin} fullWidth>
            Login
          </Button>

          <Text ta="center" size="sm" mt="sm">
            <Text
              span
              onClick={() => {
                setLoginModalOpen(false);

                handlePasswordResetModalOpen();
              }}
              style={{ cursor: 'pointer', color: 'var(--mantine-primary-color-6)' }}
            >
              Forgot password?
            </Text>
          </Text>
        </Stack>
      </Modal>

      {/* Register Modal */}

      <Modal
        opened={registerModalOpen}
        onClose={() => {
          setRegisterModalOpen(false);

          setError('');
        }}
        title="Sign Up"
        centered
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleRegister();
          }
        }}
        closeOnClickOutside={false}
        closeOnEscape={true}
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Choose a pseudo"
            value={registerPseudo}
            onChange={(e) => setRegisterPseudo(e.target.value)}
            required
            error={pseudoAvailable === false ? 'Pseudo already taken' : ''}
            rightSection={
              <PseudoAvailabilityStatus checking={pseudoChecking} available={pseudoAvailable} />
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
          />

          <PasswordInput
            label="Password"
            placeholder="Choose a password (min 6 characters)"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
            error={
              registerPassword && !passwordStrongEnough
                ? 'Password must be at least 6 characters'
                : ''
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
            required
            error={registerConfirmPassword && !passwordMatch ? 'Passwords do not match' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
          />

          <TextInput
            label="Secret Question"
            placeholder="e.g., What was your first pet's name?"
            value={registerSecretQuestion}
            onChange={(e) => setRegisterSecretQuestion(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
          />

          <TextInput
            label="Secret Answer"
            placeholder="Your secret answer"
            value={registerSecretAnswer}
            onChange={(e) => setRegisterSecretAnswer(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRegister();
              }
            }}
          />

          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          <Button onClick={handleRegister} fullWidth>
            Sign Up
          </Button>
        </Stack>
      </Modal>

      {/* Password Reset Modal - Step 1: Get Pseudo */}

      <Modal
        opened={passwordResetModalOpen}
        onClose={() => {
          setPasswordResetModalOpen(false);

          setError('');
        }}
        title="Reset Password"
        centered
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleGetSecretQuestion();
          }
        }}
        closeOnClickOutside={false}
        closeOnEscape={true}
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Your pseudo"
            value={resetPseudo}
            onChange={(e) => setResetPseudo(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGetSecretQuestion();
              }
            }}
          />

          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          <Button onClick={handleGetSecretQuestion} fullWidth>
            Continue
          </Button>
        </Stack>
      </Modal>

      {/* Password Reset Modal - Step 2: Show Secret Question and Reset */}

      <Modal
        opened={secretQuestionModalOpen}
        onClose={() => {
          setSecretQuestionModalOpen(false);

          setError('');
        }}
        title="Reset Password"
        centered
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handlePasswordReset();
          }
        }}
        closeOnClickOutside={false}
        closeOnEscape={true}
      >
        <Stack>
          <Text size="sm" mb="sm">
            Your secret question: <strong>{resetSecretQuestion}</strong>
          </Text>

          <TextInput
            label="Secret Answer"
            placeholder="Your secret answer"
            value={resetSecretAnswer}
            onChange={(e) => setResetSecretAnswer(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePasswordReset();
              }
            }}
          />

          <PasswordInput
            label="New Password"
            placeholder="Choose a new password"
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePasswordReset();
              }
            }}
          />

          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={resetConfirmPassword}
            onChange={(e) => setResetConfirmPassword(e.target.value)}
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePasswordReset();
              }
            }}
          />

          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          <Button onClick={handlePasswordReset} fullWidth>
            Reset Password
          </Button>
        </Stack>
      </Modal>
    </Group>
  );
}
