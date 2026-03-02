import React from 'react';
import { Button, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BackgroundMusic } from '../components/audio/BackgroundMusic';
import { AmbianceSounds } from '../components/audio/AmbianceSounds';
import { Soundboard } from '../components/audio/Soundboard';
import { SessionManager } from '../components/session/SessionManager';
import { RequestSoundModal } from '../components/modals/RequestSoundModal';

import { EditSoundsModal } from '../components/modals/EditSoundsModal';
import { ServerEditSoundsModal } from '../components/modals/ServerEditSoundsModal';
import { ReviewRequestsModal } from '../components/modals/ReviewRequestsModal';
import { useAuthContext } from '../contexts/AuthContext';

// Feature flag to toggle Spotify integration
const ENABLE_SPOTIFY = false;

// Conditional import for Spotify
let SpotifyPlayer: React.ComponentType<unknown> | null = null;
if (ENABLE_SPOTIFY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SpotifyPlayer = require('../components/spotify/SpotifyPlayer').SpotifyPlayer;
}

export function Home(): React.ReactElement {
  const { userId, isAdmin } = useAuthContext();
  const [_requestOpened, { open: _openRequest, close: closeRequest }] = useDisclosure(false);

  const [_editOpened, { open: _openEdit, close: closeEdit }] = useDisclosure(false);
  const [_serverEditOpened, { open: _openServerEdit, close: closeServerEdit }] =
    useDisclosure(false);
  const [_reviewOpened, { open: _openReview, close: closeReview }] = useDisclosure(false);

  return (
    <Stack gap="xl" pb="xl">
      <BackgroundMusic userId={userId} isAdmin={isAdmin} />
      <AmbianceSounds userId={userId} isAdmin={isAdmin} />
      <Soundboard userId={userId} isAdmin={isAdmin} />
      {ENABLE_SPOTIFY && SpotifyPlayer && <SpotifyPlayer />}
      <SessionManager />

      <Group justify="center" gap="sm" wrap="wrap">
        {isAdmin && (
          <Button variant="outline" size="xs" color="orange" onClick={_openServerEdit}>
            Edit Server Sounds
          </Button>
        )}
        {isAdmin && (
          <Button variant="outline" size="xs" color="orange" onClick={_openReview}>
            Review Requests
          </Button>
        )}
      </Group>

      <RequestSoundModal opened={_requestOpened} onClose={closeRequest} userId={userId} />
      <EditSoundsModal
        opened={_editOpened}
        onClose={closeEdit}
        category="ambiance"
        userId={userId}
        onSave={() => {}}
      />
      <ServerEditSoundsModal opened={_serverEditOpened} onClose={closeServerEdit} userId={userId} />

      <ReviewRequestsModal opened={_reviewOpened} onClose={closeReview} />
    </Stack>
  );
}
