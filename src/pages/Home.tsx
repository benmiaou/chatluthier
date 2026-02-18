import { Button, Collapse, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';
import { BackgroundMusic } from '../components/audio/BackgroundMusic';
import { AmbianceSounds } from '../components/audio/AmbianceSounds';
import { Soundboard } from '../components/audio/Soundboard';
import { SpotifyPlayer } from '../components/spotify/SpotifyPlayer';
import { SessionManager } from '../components/session/SessionManager';
import { CreditsModal } from '../components/modals/CreditsModal';
import { RequestSoundModal } from '../components/modals/RequestSoundModal';
import { AddSoundModal } from '../components/modals/AddSoundModal';
import { EditSoundsModal } from '../components/modals/EditSoundsModal';
import { ReviewRequestsModal } from '../components/modals/ReviewRequestsModal';
import { useAuthContext } from '../contexts/AuthContext';

export function Home() {
  const { userId, isAdmin } = useAuthContext();
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [creditsOpened, { open: openCredits, close: closeCredits }] = useDisclosure(false);
  const [requestOpened, { open: openRequest, close: closeRequest }] = useDisclosure(false);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [reviewOpened, { open: openReview, close: closeReview }] = useDisclosure(false);

  const handleSpotifyAuthChange = useCallback((connected: boolean) => {
    setSpotifyConnected(connected);
  }, []);

  return (
    <Stack gap="xl" pb="xl">
      <Collapse in={!spotifyConnected}>
        <BackgroundMusic userId={userId} isAdmin={isAdmin} />
      </Collapse>
      <AmbianceSounds userId={userId} isAdmin={isAdmin} />
      <Soundboard userId={userId} isAdmin={isAdmin} />
      <SpotifyPlayer onAuthChange={handleSpotifyAuthChange} />
      <SessionManager />

      <Group justify="center" gap="sm" wrap="wrap">
        <Button variant="outline" size="xs" onClick={openCredits}>Credits</Button>
        {userId && <Button variant="outline" size="xs" onClick={openRequest}>Request a Sound</Button>}
        {userId && <Button variant="outline" size="xs" onClick={openEdit}>Edit Sounds</Button>}
        {isAdmin && <Button variant="outline" size="xs" color="orange" onClick={openAdd}>Add Sound</Button>}
        {isAdmin && <Button variant="outline" size="xs" color="orange" onClick={openReview}>Review Requests</Button>}
      </Group>

      <CreditsModal opened={creditsOpened} onClose={closeCredits} />
      <RequestSoundModal opened={requestOpened} onClose={closeRequest} userId={userId} />
      <EditSoundsModal
        opened={editOpened}
        onClose={closeEdit}
        category="ambiance"
        isAdmin={isAdmin}
        userId={userId}
        onSave={() => {}}
      />
      <AddSoundModal opened={addOpened} onClose={closeAdd} onAdded={() => {}} />
      <ReviewRequestsModal opened={reviewOpened} onClose={closeReview} />
    </Stack>
  );
}
