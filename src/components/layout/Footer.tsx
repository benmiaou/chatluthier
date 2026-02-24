import { Group, Text, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { CreditsModal } from '../modals/CreditsModal';

export function AppFooter() {
  const [creditsOpened, { open: openCredits, close: closeCredits }] = useDisclosure(false);

  return (
    <>
      <Group h="100%" px="md" justify="center" gap="xl">
        <Anchor component={Link} to="/privacy" size="xs" c="dimmed">
          Privacy Policy
        </Anchor>
        <Anchor size="xs" c="dimmed" onClick={openCredits} style={{ cursor: 'pointer' }}>
          Sound Credits
        </Anchor>
        <Anchor component={Link} to="/about" size="xs" c="dimmed">
          About
        </Anchor>
        <Text size="xs" c="dimmed">
          © {new Date().getFullYear()} Le Chat Luthier
        </Text>
      </Group>
      
      <CreditsModal opened={creditsOpened} onClose={closeCredits} />
    </>
  );
}
