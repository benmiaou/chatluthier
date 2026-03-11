import React from 'react';
import { Stack } from '@mantine/core';
import { BackgroundMusic } from '../components/audio/BackgroundMusic';
import { AmbianceSounds } from '../components/audio/AmbianceSounds';
import { Soundboard } from '../components/audio/Soundboard';
import { SessionManager } from '../components/session/SessionManager';
import { useAuthContext } from '../contexts/AuthContext';

export function Home(): React.ReactElement {
  const { userId, isAdmin } = useAuthContext();

  return (
    <Stack gap="xl" pb="xl">
      <BackgroundMusic userId={userId} isAdmin={isAdmin} />
      <AmbianceSounds userId={userId} isAdmin={isAdmin} />
      <Soundboard userId={userId} isAdmin={isAdmin} />
      <SessionManager />
    </Stack>
  );
}
