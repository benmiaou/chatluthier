import { Avatar, Group, Menu, Text, Button, Modal, TextInput, PasswordInput, Stack, Title } from '@mantine/core';
import { IconLogout, IconLogin, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

export function AuthButtons() {
  const { isSignedIn, userName, userPicture, signOut, loginWithPseudo, registerWithPseudo, getSecretQuestion, requestPasswordReset } = useAuthContext();
  
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
  
  const handleLogin = async () => {
    try {
      setError('');
      await loginWithPseudo(loginPseudo, loginPassword);
      setLoginModalOpen(false);
      setLoginPseudo('');
      setLoginPassword('');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };
  
  const handleRegister = async () => {
    try {
      setError('');
      
      // Validate password confirmation
      if (registerPassword !== registerConfirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      // Validate secret question and answer
      if (!registerSecretQuestion || !registerSecretAnswer) {
        setError('Secret question and answer are required');
        return;
      }
      
      // Validate password length
      if (registerPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      await registerWithPseudo(registerPseudo, registerPassword, registerSecretQuestion, registerSecretAnswer);
      setRegisterModalOpen(false);
      setRegisterPseudo('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterSecretQuestion('');
      setRegisterSecretAnswer('');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
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
    } catch (err) {
      setError(err.message || 'Failed to retrieve secret question');
    }
  };

  const handlePasswordResetModalOpen = () => {
    setError('');
    setPasswordResetModalOpen(true);
  };

  const handleSecretQuestionModalOpen = () => {
    setError('');
    setSecretQuestionModalOpen(true);
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
      alert('Password reset successfully!');
    } catch (err) {
      setError(err.message || 'Password reset failed');
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
              <Avatar size="sm" radius="xl">{userName?.[0]}</Avatar>
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
        onClick={() => setLoginModalOpen(true)}
      >
        Login
      </Button>
      
      <Button
        leftSection={<IconUserPlus size={16} />}
        variant="filled"
        size="compact-sm"
        style={{ height: '36px' }}
        onClick={() => setRegisterModalOpen(true)}
      >
        Sign Up
      </Button>

      {/* Login Modal */}
      <Modal
        opened={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        title="Login"
        centered
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Your pseudo"
            value={loginPseudo}
            onChange={(e) => setLoginPseudo(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
          />
          {error && <Text color="red" size="sm">{error}</Text>}
          <Button onClick={handleLogin} fullWidth>
            Login
          </Button>
          <Text ta="center" size="sm" mt="sm">
            <Text span onClick={() => { setLoginModalOpen(false); handlePasswordResetModalOpen(); }} style={{ cursor: 'pointer', color: 'var(--mantine-primary-color-6)' }}>
              Forgot password?
            </Text>
          </Text>
        </Stack>
      </Modal>

      {/* Register Modal */}
      <Modal
        opened={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Sign Up"
        centered
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Choose a pseudo"
            value={registerPseudo}
            onChange={(e) => setRegisterPseudo(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            placeholder="Choose a password"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
            required
          />
          <TextInput
            label="Secret Question"
            placeholder="e.g., What was your first pet's name?"
            value={registerSecretQuestion}
            onChange={(e) => setRegisterSecretQuestion(e.target.value)}
            required
          />
          <TextInput
            label="Secret Answer"
            placeholder="Your secret answer"
            value={registerSecretAnswer}
            onChange={(e) => setRegisterSecretAnswer(e.target.value)}
            required
          />
          {error && <Text color="red" size="sm">{error}</Text>}
          <Button onClick={handleRegister} fullWidth>
            Sign Up
          </Button>
        </Stack>
      </Modal>

      {/* Password Reset Modal - Step 1: Get Pseudo */}
      <Modal
        opened={passwordResetModalOpen}
        onClose={() => { setPasswordResetModalOpen(false); setError(''); }}
        title="Reset Password"
        centered
      >
        <Stack>
          <TextInput
            label="Pseudo"
            placeholder="Your pseudo"
            value={resetPseudo}
            onChange={(e) => setResetPseudo(e.target.value)}
            required
          />
          {error && <Text color="red" size="sm">{error}</Text>}
          <Button onClick={handleGetSecretQuestion} fullWidth>
            Continue
          </Button>
        </Stack>
      </Modal>

      {/* Password Reset Modal - Step 2: Show Secret Question and Reset */}
      <Modal
        opened={secretQuestionModalOpen}
        onClose={() => { setSecretQuestionModalOpen(false); setError(''); }}
        title="Reset Password"
        centered
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
          />
          <PasswordInput
            label="New Password"
            placeholder="Choose a new password"
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            required
          />
          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={resetConfirmPassword}
            onChange={(e) => setResetConfirmPassword(e.target.value)}
            required
          />
          {error && <Text color="red" size="sm">{error}</Text>}
          <Button onClick={handlePasswordReset} fullWidth>
            Reset Password
          </Button>
        </Stack>
      </Modal>
    </Group>
  );
}