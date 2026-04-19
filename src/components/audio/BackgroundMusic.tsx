import {
  Box,
  Button,
  Group,
  Modal,
  Slider,
  Stack,
  Text,
  Progress,
  Switch,
  Tooltip,
  Grid,
  ActionIcon,
  Avatar,
  Menu,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { CustomCombobox } from './CustomCombobox';
import {
  IconPlayerSkipForward,
  IconPlayerStop,
  IconVolume,
  IconPlugConnected,
  IconSearch,
  IconCloudOff,
} from '@tabler/icons-react';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useExternalSounds } from '../../hooks/useExternalSounds';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import { SETTINGS } from '../../constants/settings';

import type { BackgroundMusicCategory, Sound } from '../../types/sound';
import { bgScenes, bgMatchesCategoryAndContext } from '../../types/sound';
import { ExternalSoundBadge } from './ExternalSoundBadge';
import { ExternalSoundProviderModal } from './ExternalSoundProviderModal';
import { ExternalSoundSearchModal } from './ExternalSoundSearchModal';

interface BackgroundMusicProps {
  userId?: string | null;
  isAdmin?: boolean;
}

const CATEGORIES: { value: BackgroundMusicCategory; label: string }[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'intense', label: 'Intense' },
  { value: 'all', label: 'All' },
];

export function BackgroundMusic({
  userId = null,
}: Readonly<BackgroundMusicProps>): React.JSX.Element {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [providerModalOpened, { open: openProviderModal, close: closeProviderModal }] =
    useDisclosure(false);
  const [searchModalOpened, { open: openSearchModal, close: closeSearchModal }] =
    useDisclosure(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [filterContext, setFilterContext] = useState<string>('All');
  const [isLeader, setIsLeader] = useState(false);

  // Notify server when track ends (if this client is leader)
  const notifyTrackEnded = useCallback(() => {
    if (sessionId && isLeader) {
      send({ type: 'trackEnded', id: sessionId });
    }
  }, [sessionId, isLeader, send]);

  const externalSoundsHook = useExternalSounds(userId);

  const {
    currentSound,
    activeCategory,
    isPlaying,
    volume,
    progress,
    context,
    playCategory,
    playSpecificSound,
    next,
    stop,
    setVolume,
    seekTo,
    sounds,
    getCurrentTime,
    handleSetContext,
    disableExternalSounds,
    setDisableExternalSounds,
    playExternalReceived,
    setOnTrackEnded,
  } = useBackgroundMusic(
    userId,
    () => {
      if (!autoplayBlocked) {
        setAutoplayBlocked(true);
        open();
      }
    },
    externalSoundsHook.playExternal,
    externalSoundsHook.stopExternal,
    externalSoundsHook.resolveAndPlayExternal,
    notifyTrackEnded,
    sessionId
  );

  // Set up track ended callback
  useEffect(() => {
    // Only set track ended callback if we're the leader AND in a session
    // This prevents client-side auto-play from interfering with server-controlled playback
    setOnTrackEnded(sessionId && isLeader ? notifyTrackEnded : null);
  }, [sessionId, isLeader, setOnTrackEnded, notifyTrackEnded]);

  // Check and set leader status
  const checkLeaderStatus = useCallback(() => {
    if (sessionId) {
      send({ type: 'getLeaderStatus', id: sessionId });
    }
  }, [sessionId, send]);

  // Set this client as leader when playing background music
  const setAsLeader = useCallback(() => {
    if (sessionId) {
      send({ type: 'setLeader', id: sessionId });
    }
  }, [sessionId, send]);

  // Broadcast music change to session peers
  const handlePlayCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      if (!userInteracted) {
        setUserInteracted(true);
      }

      // Set as leader when playing background music
      setAsLeader();

      // Generate the playlist for this category
      const filteredSounds = sounds.filter(
        (s) =>
          !(s.isExternal && disableExternalSounds) &&
          bgMatchesCategoryAndContext(s, category, context)
      );

      // console.log(
      //   `[Leader Play] Category: ${category}, Playlist:`,
      //   filteredSounds.map((s) => s.filename)
      // );

      // Send the playlist to server if we're in a session
      if (sessionId) {
        const playlist = filteredSounds.map((s) => s.filename);
        send({
          type: 'setPlaylist',
          id: sessionId,
          content: {
            playlist: playlist,
            currentTrackIndex: 0,
          },
        });
      }

      await playCategory(category);
    },
    [
      playCategory,
      userInteracted,
      setAsLeader,
      sounds,
      disableExternalSounds,
      context,
      sessionId,
      send,
    ]
  );

  // When a track starts, broadcast to session (with external sound info when applicable)
  useEffect(() => {
    if (currentSound && sessionId && userInteracted) {
      const currentTime = getCurrentTime();
      const content: Record<string, unknown> = {
        filename: currentSound.isExternal ? null : currentSound.filename,
        credit: currentSound.credit,
        timestamp: Date.now(),
        currentTime,
      };

      if (currentSound.isExternal) {
        content.externalSound = {
          provider: currentSound.provider,
          trackId: currentSound.providerTrackId,
          artist: currentSound.artist,
          title: currentSound.title,
          album: currentSound.album,
          thumbnailUrl: currentSound.thumbnailUrl,
          previewUrl: currentSound.previewUrl,
        };
      }

      send({ type: 'backgroundMusicChange', id: sessionId, content });
    }
  }, [currentSound, sessionId, send, getCurrentTime, userInteracted]);

  // Message handler functions
  const handleLeaderChange = useCallback(
    (_content: { leaderId: string }) => {
      // Check if the new leader is this client
      // For now, we'll just check leader status when we receive this
      checkLeaderStatus();
    },
    [checkLeaderStatus]
  );

  const handleLeaderStatus = useCallback((content: { isLeader: boolean; leaderId?: string }) => {
    setIsLeader(content.isLeader);
  }, []);

  const handlePlaylistStatus = useCallback(
    (_content: { playlist: string[]; currentTrackIndex: number }) => {
      // Handle playlist updates from server
      // console.log('Playlist status:', _content);
    },
    []
  );

  const handleBackgroundMusicChange = useCallback(
    (content: {
      filename?: string | null;
      credit?: string;
      timestamp?: number;
      currentTime?: number;
      externalSound?: {
        provider: 'spotify' | 'deezer' | 'soundcloud';
        trackId: string;
        artist?: string;
        title?: string;
        album?: string;
        thumbnailUrl?: string;
        previewUrl?: string;
      };
      trackKey?: string;
      isAutoPlay?: boolean;
    }) => {
      if (content.externalSound) {
        playExternalReceived(content.externalSound).catch(() => { });
        return;
      }

      // Handle auto-played tracks from server
      if (content.trackKey && content.isAutoPlay) {
        // Find the sound by track key (filename)
        const sound = sounds.find((s) => s.filename === content.trackKey);
        if (sound) {
          playSpecificSound(sound).catch(() => { });
        }
        return;
      }

      if (content.filename) {
        const sound = sounds.find((s) => s.filename === content.filename);
        if (sound) {
          // Only play if we're not already playing this sound
          const currentSoundFilename = currentSound?.filename;
          if (currentSoundFilename !== content.filename) {
            playSpecificSound(sound).catch(() => { });
          } else {
            // Already playing this sound, ignoring duplicate play request
          }
        }
      }
    },
    [playSpecificSound, playExternalReceived, sounds, currentSound]
  );

  const handleBackgroundMusicStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleStatusRequest = useCallback(
    (content: { statusType?: string; type?: string }) => {
      // Handle both statusRequest (statusType) and requestStatus (type) formats
      const isBackgroundMusicRequest =
        content.statusType === 'backgroundMusic' || content.type === 'backgroundMusic';
      if (isBackgroundMusicRequest && currentSound) {
        const currentTime = getCurrentTime();
        const statusData: Record<string, unknown> = {
          filename: currentSound.isExternal ? null : currentSound.filename,
          credit: currentSound.credit || '',
          isPlaying,
          timestamp: Date.now(),
          currentTime,
        };
        if (currentSound.isExternal) {
          statusData.externalSound = {
            provider: currentSound.provider,
            trackId: currentSound.providerTrackId,
          };
        }
        send({
          type: 'statusResponse',
          id: sessionId,
          content: { statusType: 'backgroundMusic', statusData },
        });
      } else if (content.statusType === 'externalSoundsDisabled') {
        send({
          type: 'statusResponse',
          id: sessionId,
          content: {
            statusType: 'externalSoundsDisabled',
            statusData: { disabled: disableExternalSounds },
          },
        });
      }
    },
    [currentSound, isPlaying, sessionId, send, getCurrentTime, disableExternalSounds]
  );

  const handleExternalSoundsDisabled = useCallback(
    (content: { disabled: boolean }) => {
      setDisableExternalSounds(content.disabled);
      // If external sounds are now disabled and we're playing one, stop
      if (content.disabled && currentSound?.isExternal) {
        stop();
      }
    },
    [setDisableExternalSounds, currentSound, stop]
  );

  const handleStatusResponse = useCallback(
    (content: {
      statusType: string;
      statusData: {
        filename?: string;
        credit?: string;
        isPlaying: boolean;
        timestamp?: number;
        currentTime?: number;
        externalSound?: { provider: 'spotify' | 'deezer' | 'soundcloud'; trackId: string };
        disabled?: boolean;
      };
    }) => {
      if (content.statusType === 'backgroundMusic' && content.statusData) {
        if (content.statusData.isPlaying) {
          if (content.statusData.externalSound) {
            playExternalReceived(content.statusData.externalSound).catch(() => { });
          } else if (content.statusData.filename) {
            const sound = sounds.find((s) => s.filename === content.statusData.filename);
            if (sound) {
              // Only sync if we're not already playing this sound
              const currentSoundFilename = currentSound?.filename;
              if (currentSoundFilename !== content.statusData.filename) {
                // Pass the currentTime from status to sync playback position
                playSpecificSound(sound).catch(() => { });
              } else {
                // Already playing this sound, ignoring sync request
              }
            }
          }
        } else {
          stop();
        }
      } else if (
        content.statusType === 'externalSoundsDisabled' &&
        content.statusData?.disabled !== undefined
      ) {
        handleExternalSoundsDisabled({ disabled: content.statusData.disabled });
      }
    },
    [
      playSpecificSound,
      playExternalReceived,
      stop,
      sounds,
      handleExternalSoundsDisabled,
      currentSound,
    ]
  );

  // Check leader status when session changes or on initial load
  useEffect(() => {
    if (sessionId) {
      checkLeaderStatus();
    }
  }, [sessionId, checkLeaderStatus]);

  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (!msg.content && msg.type !== 'backgroundMusicStop') {
        return;
      }

      const handlers: Record<string, (content: unknown) => void> = {
        backgroundMusicChange: (c) =>
          handleBackgroundMusicChange(c as Parameters<typeof handleBackgroundMusicChange>[0]),
        backgroundMusicStop: () => handleBackgroundMusicStop(),
        statusRequest: (c) => handleStatusRequest(c as { statusType: string }),
        requestStatus: (c) => handleStatusRequest(c as { type: string }),
        statusResponse: (c) =>
          handleStatusResponse(c as Parameters<typeof handleStatusResponse>[0]),
        externalSoundsDisabled: (c) => handleExternalSoundsDisabled(c as { disabled: boolean }),
        leaderChange: (c) => handleLeaderChange(c as { leaderId: string }),
        leaderStatus: (c) => handleLeaderStatus(c as { isLeader: boolean; leaderId?: string }),
        playlistStatus: (c) =>
          handlePlaylistStatus(c as { playlist: string[]; currentTrackIndex: number }),
      };

      const handler = handlers[msg.type];
      if (handler) {
        handler(msg.content);
      }
    });
  }, [
    addMessageHandler,
    handleBackgroundMusicChange,
    handleBackgroundMusicStop,
    handleStatusRequest,
    handleStatusResponse,
    handleExternalSoundsDisabled,
    handleLeaderChange,
    handleLeaderStatus,
    handlePlaylistStatus,
  ]);

  const handleToggleDisableExternal = useCallback(
    (disabled: boolean) => {
      setDisableExternalSounds(disabled);
      if (sessionId) {
        send({ type: 'externalSoundsDisabled', id: sessionId, content: { disabled } });
      }
      if (disabled && currentSound?.isExternal) {
        stop();
      }
    },
    [setDisableExternalSounds, send, sessionId, currentSound, stop]
  );

  const handleVolumeChange = useCallback(
    (v: number) => {
      if (!userInteracted) {
        setUserInteracted(true);
      }
      setVolume(v);
    },
    [setVolume, userInteracted]
  );

  const handleNext = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    next();
  }, [next, userInteracted]);

  const handlePlayCurrentSound = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    if (currentSound) {
      // Set as leader when playing background music
      setAsLeader();
      playSpecificSound(currentSound).catch(() => { });
    }
  }, [currentSound, playSpecificSound, userInteracted, setAsLeader]);

  const handleStop = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
    stop();
    if (sessionId) {
      send({ type: 'backgroundMusicStop', id: sessionId });
    }
  }, [stop, send, sessionId, userInteracted]);

  const contexts = ['All', ...Array.from(new Set(sounds.flatMap((s) => bgScenes(s))))];

  const filterSoundsByContextAndCategory = (
    sound: Sound,
    contextFilter: string,
    categoryFilter: BackgroundMusicCategory
  ) => bgMatchesCategoryAndContext(sound, categoryFilter, contextFilter);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!userInteracted) {
        setUserInteracted(true);
      }
      if (currentSound?.isExternal) {
        return;
      } // Can't seek external sounds via progress bar
      const rect = e.currentTarget.getBoundingClientRect();
      seekTo(((e.clientX - rect.left) / rect.width) * 100);
    },
    [seekTo, userInteracted, currentSound]
  );

  const hasConnectedProviders = externalSoundsHook.connectedProviders.length > 0;
  const externalCount = sounds.filter((s) => s.isExternal).length;

  return (
    <>
      <Box
        px="xs"
        h={SETTINGS.BACKGROUND_MUSIC_HEIGHT}
        style={{
          height: SETTINGS.BACKGROUND_MUSIC_HEIGHT,
          minHeight: SETTINGS.BACKGROUND_MUSIC_HEIGHT,
          maxHeight: SETTINGS.BACKGROUND_MUSIC_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <Grid gutter={isMobile ? 6 : 'sm'}>
          <Grid.Col span={{ base: 10, md: 6 }}>
            {/* Current track info */}
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <Avatar radius="md" size={isMobile ? 'sm' : 'md'} visibleFrom="md">
                <Box
                  className={
                    isPlaying && currentSound
                      ? 'background-music-equalizer background-music-equalizer-playing'
                      : 'background-music-equalizer'
                  }
                >
                  <span className="background-music-equalizer-bar" />
                  <span className="background-music-equalizer-bar" />
                  <span className="background-music-equalizer-bar" />
                </Box>
              </Avatar>
              <Stack
                gap="0"
                justify="flex-start"
                mt={3}
                align="flex-start"
                ta="left"
                w="100%"
                style={{ minWidth: 0 }}
              >
                <Text size="xs" c="dimmed" ta="left" className="background-music-track-title">
                  {currentSound
                    ? `${currentSound.isExternal ? `${currentSound.artist ?? ''} – ${currentSound.title ?? ''}` : (currentSound.name ?? '')}`
                    : 'No track playing'}
                </Text>
                {!isMobile && currentSound?.isExternal && currentSound.provider && (
                  <ExternalSoundBadge provider={currentSound.provider} compact />
                )}

                {!isMobile && currentSound?.isExternal && currentSound.provider && (
                  <Group gap={6} align="center" justify="flex-start" w="100%">
                    <ExternalSoundBadge provider={currentSound.provider} />
                    {currentSound.permalinkUrl ? (
                      <Text
                        size="xs"
                        c="dimmed"
                        component="a"
                        href={currentSound.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'underline dotted', fontSize: 11 }}
                      >
                        Open on{' '}
                        {currentSound.provider === 'soundcloud'
                          ? 'SoundCloud'
                          : currentSound.provider === 'deezer'
                            ? 'Deezer'
                            : 'Spotify'}
                      </Text>
                    ) : null}
                  </Group>
                )}
                {currentSound?.credit && !currentSound.isExternal && (
                  <Text
                    size="xs"
                    c="dimmed"
                    fs="italic"
                    className="background-music-track-title"
                    dangerouslySetInnerHTML={{ __html: currentSound.credit }}
                  />
                )}
              </Stack>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 2, md: 6 }} ta="end">
            {/* Category buttons + context filter */}
            <Box hiddenFrom="md">
              <Menu>
                <Menu.Target>
                  <Button size="compact-xs">
                    {CATEGORIES.find(({ value }) => value === activeCategory)?.label}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  {CATEGORIES.map(({ value, label }) => {
                    const count = sounds.filter(
                      (s) =>
                        !(s.isExternal && disableExternalSounds) &&
                        filterSoundsByContextAndCategory(s, filterContext, value)
                    ).length;
                    return (
                      <Menu.Item onClick={() => handlePlayCategory(value)} key={value}>
                        {label} ({count})
                      </Menu.Item>
                    );
                  })}
                  <Menu.Divider />

                  <CustomCombobox
                    value={filterContext}
                    onChange={(v) => {
                      setFilterContext(v);
                      handleSetContext(v);
                    }}
                    data={contexts}
                    placeholder="Context"
                    size="xs"
                  />
                </Menu.Dropdown>
              </Menu>
            </Box>

            <Group gap={3} justify="flex-end" wrap="wrap" visibleFrom="md">
              {CATEGORIES.map(({ value, label }) => {
                const count = sounds.filter(
                  (s) =>
                    !(s.isExternal && disableExternalSounds) &&
                    filterSoundsByContextAndCategory(s, filterContext, value)
                ).length;
                return (
                  <Button
                    key={value}
                    size="xs"
                    variant={activeCategory === value ? 'light' : 'subtle'}
                    className="background-music-category-btn"
                    onClick={() => handlePlayCategory(value)}
                  >
                    {label} ({count})
                  </Button>
                );
              })}
              <CustomCombobox
                value={filterContext}
                onChange={(v) => {
                  setFilterContext(v);
                  handleSetContext(v);
                }}
                data={contexts}
                placeholder="Context"
                size="xs"
              />
            </Group>
          </Grid.Col>
        </Grid>
        <Box bg="dark.8" mt="5" px="15" style={{ borderRadius: 8, flex: 1 }}>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <ActionIcon
              size={isMobile ? 'sm' : 'md'}
              variant="subtle"
              onClick={handleStop}
              disabled={!isPlaying}
            >
              <IconPlayerStop size={isMobile ? 16 : 18} />
            </ActionIcon>
            <ActionIcon
              size={isMobile ? 'sm' : 'md'}
              variant="subtle"
              onClick={handleNext}
              disabled={!isPlaying || currentSound?.isExternal}
            >
              <IconPlayerSkipForward size={isMobile ? 16 : 18} />
            </ActionIcon>
            {/* Progress bar (not shown for external sounds) */}
            {!currentSound?.isExternal && (
              <Box
                mt={15}
                style={{ cursor: 'pointer', flex: 1, minWidth: 120, maxWidth: '100%' }}
                onClick={handleSeek}
                className="background-music-progress-wrap"
              >
                <Progress value={progress} size="sm" radius="xs" color="maroon" />
              </Box>
            )}
            <Group gap={6} mt={8}>
              <IconVolume size={isMobile ? 16 : 20} color="var(--mantine-color-dimmed)" />
              <Slider
                size="xs"
                w={isMobile ? 70 : 100}
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                label={isMobile ? null : (v) => `${Math.round(v * 100)}%`}
              />
            </Group>
            {/* External sounds controls */}
            <Group gap="xs" wrap="wrap" justify="flex-end" visibleFrom="md">
              {externalCount > 0 && (
                <Tooltip
                  label={
                    disableExternalSounds
                      ? 'External sounds disabled for this session'
                      : 'Disable external sounds for this session'
                  }
                  withArrow
                >
                  <Group gap={4}>
                    <IconCloudOff size={14} color="var(--mantine-color-dimmed)" />
                    <Switch
                      size="xs"
                      checked={disableExternalSounds}
                      onChange={(e) => handleToggleDisableExternal(e.currentTarget.checked)}
                      label={
                        <Text size="xs" c="dimmed">
                          Disable ext.
                        </Text>
                      }
                    />
                  </Group>
                </Tooltip>
              )}
              <Tooltip label="Manage external sound providers" withArrow>
                <Button
                  size="xs"
                  variant={hasConnectedProviders ? 'light' : 'subtle'}
                  color={hasConnectedProviders ? 'green' : undefined}
                  leftSection={<IconPlugConnected size={14} />}
                  onClick={openProviderModal}
                >
                  Providers
                </Button>
              </Tooltip>
              {hasConnectedProviders && (
                <Tooltip label="Search and add external tracks" withArrow>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconSearch size={14} />}
                    onClick={openSearchModal}
                  >
                    Add track
                  </Button>
                </Tooltip>
              )}
            </Group>
          </Group>
        </Box>
      </Box>

      {/* Autoplay Permission Modal */}
      <Modal
        opened={modalOpened}
        onClose={close}
        title="Playback Permission Required"
        centered
        withCloseButton={false}
      >
        <Stack gap="md">
          <Text size="sm">
            The browser blocked automatic playback. Please click &quot;Allow Playback&quot; to
            enable background music.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                close();
                setAutoplayBlocked(false);
              }}
            >
              Not Now
            </Button>
            <Button variant="filled" onClick={handlePlayCurrentSound}>
              Allow Audio
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* External Sound Provider Modal */}
      <ExternalSoundProviderModal
        opened={providerModalOpened}
        onClose={closeProviderModal}
        externalSoundsHook={externalSoundsHook}
      />

      {/* External Sound Search Modal */}
      <ExternalSoundSearchModal
        opened={searchModalOpened}
        onClose={closeSearchModal}
        userId={userId}
        externalSoundsHook={externalSoundsHook}
      />
    </>
  );
}
