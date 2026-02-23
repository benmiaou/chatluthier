import { Group, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { AuthButtons } from '../auth/AuthButtons';

export function AppHeader() {
  const navigate = useNavigate();

  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap" style={{ backgroundColor: 'var(--main-background-color)' }}>
      {/* Logo + Title on the left */}
      <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img
          src="/images/favicons/MainLogo.PNG"
          alt="Le Chat Luthier"
          style={{ height: 42, width: 'auto' }}
        />
        <Text fw={700} size="xl" visibleFrom="sm" style={{ color: 'var(--main-text)' }}>
          Le Chat Luthier
        </Text>
      </Group>

      {/* Auth buttons on the right */}
      <AuthButtons />
    </Group>
  );
}
