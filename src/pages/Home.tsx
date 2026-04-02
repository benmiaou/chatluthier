import React from 'react';
import { Box, Tabs } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconWind, IconUsersGroup, IconMusic } from '@tabler/icons-react';
import { AmbianceSounds } from '../components/audio/AmbianceSounds';
import { Soundboard } from '../components/audio/Soundboard';
import { SessionManager } from '../components/session/SessionManager';
import { useAuthContext } from '../contexts/AuthContext';
import { SETTINGS } from '../constants/settings';
import { BackgroundMusic } from '../components/audio/BackgroundMusic';

export function Home(): React.ReactElement {
  const { userId, isAdmin } = useAuthContext();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const contentHeight = `calc(100vh - ${SETTINGS.HEADER_HEIGHT}px - ${SETTINGS.FOOTER_HEIGHT}px - ${SETTINGS.BACKGROUND_MUSIC_HEIGHT}px)`;
  if (isMobile) {
    return (
      <>

        <Tabs
          defaultValue="ambiance"
          variant="pills"
          style={{
            height: contentHeight,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 8,
          }}
        >
          <Tabs.List
            grow
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--mantine-color-dark-9)',
              paddingBottom: 4,
            }}
          >
            <Tabs.Tab value="soundboard" aria-label="Soundboard">
              <IconMusic size={16} />
            </Tabs.Tab>
            <Tabs.Tab value="ambiance" aria-label="Ambiance">
              <IconWind size={16} />
            </Tabs.Tab>
            <Tabs.Tab value="session" aria-label="Session">
              <IconUsersGroup size={16} />
            </Tabs.Tab>
          </Tabs.List>

          <Box style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 8 }}>
            <Tabs.Panel value="soundboard" style={{ height: '100%' }}>
              <Box style={{ height: '100%', overflow: 'hidden' }}>
                <Soundboard userId={userId} />
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="ambiance" style={{ height: '100%' }}>
              <Box style={{ height: '100%', overflow: 'hidden' }}>
                <AmbianceSounds userId={userId} />
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="session" style={{ height: '100%' }}>
              <Box bg="dark.7" p="sm" style={{ borderRadius: 8, height: '100%', overflow: 'auto' }}>
                <SessionManager />
              </Box>
            </Tabs.Panel>
          </Box>
        </Tabs>
        <BackgroundMusic userId={userId} isAdmin={isAdmin} />
      </>
    );
  }

  return (
    <>

      <div
        style={{
          height: contentHeight,
          display: 'grid',
          gridTemplateColumns: '3fr 7fr 2fr',
          gap: 5,
          overflow: 'hidden',
          padding: 5,
        }}
      >
        <Box style={{ overflow: 'hidden' }}>
          <Soundboard userId={userId} />
        </Box>
        <Box style={{ overflow: 'hidden' }}>
          <AmbianceSounds userId={userId} />
        </Box>
        <Box bg="dark.7" p="sm" style={{ borderRadius: 8, overflow: 'hidden' }}>
          <SessionManager />
        </Box>
      </div>
      <BackgroundMusic userId={userId} isAdmin={isAdmin} />

    </>
  );
}
