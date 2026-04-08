import { Group, Text, Anchor } from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';

import React from 'react';

import { CreditsModal } from '../modals/CreditsModal';

import { PrivacyModal } from '../modals/PrivacyModal';

import { AboutModal } from '../modals/AboutModal';

export function AppFooter(): React.ReactElement {
  const [creditsOpened, { open: openCredits, close: closeCredits }] = useDisclosure(false);

  const [privacyOpened, { open: openPrivacy, close: closePrivacy }] = useDisclosure(false);

  const [aboutOpened, { open: openAbout, close: closeAbout }] = useDisclosure(false);

  return (
    <>
      <Group p="xs" justify="center" gap="xl">
        <Anchor size="xs" c="dimmed" onClick={openPrivacy} style={{ cursor: 'pointer' }}>
          Privacy Policy
        </Anchor>

        <Anchor size="xs" c="dimmed" onClick={openCredits} style={{ cursor: 'pointer' }}>
          Sound Credits
        </Anchor>

        <Anchor size="xs" c="dimmed" onClick={openAbout} style={{ cursor: 'pointer' }}>
          About
        </Anchor>

        <Text size="xs" c="dimmed">
          © {new Date().getFullYear()} Le Chat Luthier
        </Text>
      </Group>

      <PrivacyModal opened={privacyOpened} onClose={closePrivacy} />

      <CreditsModal opened={creditsOpened} onClose={closeCredits} />

      <AboutModal opened={aboutOpened} onClose={closeAbout} />
    </>
  );
}
