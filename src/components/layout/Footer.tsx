import { Group, Text, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';

export function AppFooter() {
  return (
    <Group h="100%" px="md" justify="center" gap="xl">
      <Anchor component={Link} to="/privacy" size="xs" c="dimmed">
        Privacy Policy
      </Anchor>
      <Anchor component={Link} to="/about" size="xs" c="dimmed">
        About
      </Anchor>
      <Text size="xs" c="dimmed">
        © {new Date().getFullYear()} Le Chat Luthier
      </Text>
    </Group>
  );
}
