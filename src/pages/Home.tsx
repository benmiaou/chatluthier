import { Button, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback } from 'react';
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
let SpotifyPlayer = null;
if (ENABLE_SPOTIFY) {
  SpotifyPlayer = require('../components/spotify/SpotifyPlayer').SpotifyPlayer;
}

export function Home() {
  const { userId, isAdmin } = useAuthContext();
  const [requestOpened, { open: openRequest, close: closeRequest }] = useDisclosure(false);

  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [serverEditOpened, { open: openServerEdit, close: closeServerEdit }] = useDisclosure(false);
  const [reviewOpened, { open: openReview, close: closeReview }] = useDisclosure(false);

  return (
    <Stack gap="xl" pb="xl">
      <BackgroundMusic userId={userId} isAdmin={isAdmin} />
      <AmbianceSounds userId={userId} isAdmin={isAdmin} />
      <Soundboard userId={userId} isAdmin={isAdmin} />
      {ENABLE_SPOTIFY && SpotifyPlayer && <SpotifyPlayer />}
      <SessionManager />

      <Group justify="center" gap="sm" wrap="wrap">
        {isAdmin && <Button variant="outline" size="xs" color="orange" onClick={openServerEdit}>Edit Server Sounds</Button>}
        {isAdmin && <Button variant="outline" size="xs" color="orange" onClick={openReview}>Review Requests</Button>}
      </Group>

      <RequestSoundModal opened={requestOpened} onClose={closeRequest} userId={userId} />
      <EditSoundsModal
        opened={editOpened}
        onClose={closeEdit}
        category="ambiance"
        userId={userId}
        onSave={() => {}}
      />
      <ServerEditSoundsModal
        opened={serverEditOpened}
        onClose={closeServerEdit}
        userId={userId}
      />

      <ReviewRequestsModal opened={reviewOpened} onClose={closeReview} />
    </Stack>
  );
}
