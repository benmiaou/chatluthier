import { Group, Text, Anchor, Menu, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLoginButton } from '../auth/GoogleLoginButton';

export function AppHeader() {
  const [menuOpen, { toggle: toggleMenu }] = useDisclosure(false);
  const navigate = useNavigate();

  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      {/* Logo + Title */}
      <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img
          src="/images/favicons/MainLogo.PNG"
          alt="Le Chat Luthier"
          style={{ height: 42, width: 'auto' }}
        />
        <Text fw={700} size="xl" visibleFrom="sm">
          Le Chat Luthier
        </Text>
      </Group>

      {/* Nav links — desktop */}
      <Group gap="lg" visibleFrom="sm">
        <Anchor component={Link} to="/about" c="dimmed" size="sm">
          About
        </Anchor>
        <Anchor component={Link} to="/privacy" c="dimmed" size="sm">
          Privacy
        </Anchor>
      </Group>

      {/* Mobile burger menu */}
      <Menu opened={menuOpen} onChange={toggleMenu} withinPortal>
        <Menu.Target>
          <Burger opened={menuOpen} hiddenFrom="sm" size="sm" />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item component={Link} to="/about">
            About
          </Menu.Item>
          <Menu.Item component={Link} to="/privacy">
            Privacy
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Auth button */}
      <GoogleLoginButton />
    </Group>
  );
}
