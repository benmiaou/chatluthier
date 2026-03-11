import {
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Slider,
  Stack,
  Text,
  Progress,
  Switch,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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

import type { BackgroundMusicCategory, Sound } from '../../types/sound';
import { bgScenes, bgMatchesCategory } from '../../types/sound';
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
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [providerModalOpened, { open: openProviderModal, close: closeProviderModal }] =
    useDisclosure(false);
  const [searchModalOpened, { open: openSearchModal, close: closeSearchModal }] =
    useDisclosure(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [filterContext, setFilterContext] = useState<string>('All');

  const externalSoundsHook = useExternalSounds(userId);

  const {
    currentSound,
    activeCategory,
    isPlaying,
    volume,
    progress,
    playCategory,
    playSpecificSound,
    next,
    stop,
    setVolume,
    seekTo,
    sounds,
    getCurrentTime,
    disableExternalSounds,
    setDisableExternalSounds,
    playExternalReceived,
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
    externalSoundsHook.resolveAndPlayExternal
  );

  // Broadcast music change to session peers
  const handlePlayCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      if (!userInteracted) {
        setUserInteracted(true);
      }
      await playCategory(category);
    },
    [playCategory, userInteracted]
  );

  // When a track starts, broadcast to session (with external sound info when applicable)
  useEffect(() => {
    if (currentSound && sessionId) {
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
  }, [currentSound, sessionId, send, getCurrentTime]);

  // Message handler functions
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
    }) => {
      if (content.externalSound) {
        playExternalReceived(content.externalSound).catch(() => {});
        return;
      }
      if (content.filename) {
        const sound = sounds.find((s) => s.filename === content.filename);
        if (sound) {
          playSpecificSound(sound).catch(() => {});
        }
      }
    },
    [playSpecificSound, playExternalReceived, sounds]
  );

  const handleBackgroundMusicStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleStatusRequest = useCallback(
    (content: { statusType: string }) => {
      if (content.statusType === 'backgroundMusic' && currentSound) {
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
      }
    },
    [currentSound, isPlaying, sessionId, send, getCurrentTime]
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
      };
    }) => {
      if (content.statusType === 'backgroundMusic' && content.statusData) {
        if (content.statusData.isPlaying) {
          if (content.statusData.externalSound) {
            playExternalReceived(content.statusData.externalSound).catch(() => {});
          } else if (content.statusData.filename) {
            const sound = sounds.find((s) => s.filename === content.statusData.filename);
            if (sound) {
              playSpecificSound(sound).catch(() => {});
            }
          }
        } else {
          stop();
        }
      }
    },
    [playSpecificSound, playExternalReceived, stop, sounds]
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
        statusResponse: (c) =>
          handleStatusResponse(c as Parameters<typeof handleStatusResponse>[0]),
        externalSoundsDisabled: (c) => handleExternalSoundsDisabled(c as { disabled: boolean }),
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
      playSpecificSound(currentSound).catch(() => {});
    }
  }, [currentSound, playSpecificSound, userInteracted]);

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
  ) => {
    if (contextFilter === 'All') {
      return categoryFilter === 'all' || bgMatchesCategory(sound, categoryFilter);
    }
    const soundScenes = bgScenes(sound);
    return (
      soundScenes.includes(contextFilter) &&
      (categoryFilter === 'all' || bgMatchesCategory(sound, categoryFilter))
    );
  };

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
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          {/* Title with volume control */}
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
              Background Music
            </Text>
            <Group gap={6} align="center">
              <IconVolume size={16} color="var(--mantine-color-dimmed)" />
              <Slider
                size="xs"
                w={80}
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                label={(v) => `${Math.round(v * 100)}%`}
              />
            </Group>
          </Group>

          {/* Category buttons + context filter */}
          <Group gap="xs" align="center">
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
                  variant={activeCategory === value ? 'filled' : 'default'}
                  onClick={() => handlePlayCategory(value)}
                >
                  Play {label} ({count})
                </Button>
              );
            })}
            <CustomCombobox
              value={filterContext}
              onChange={setFilterContext}
              data={contexts}
              placeholder="Context"
            />
          </Group>

          {/* Current track info */}
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
              {currentSound
                ? `♪ ${currentSound.isExternal ? `${currentSound.artist ?? ''} – ${currentSound.title ?? ''}` : (currentSound.name ?? '')}`
                : 'No track playing'}
            </Text>
            {currentSound?.isExternal && currentSound.provider && (
              <ExternalSoundBadge provider={currentSound.provider} compact />
            )}
          </Group>
          {currentSound?.isExternal && currentSound.provider && (
            <Group gap={6} align="center">
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
              truncate
              dangerouslySetInnerHTML={{ __html: currentSound.credit }}
            />
          )}

          {/* Progress bar (not shown for external sounds) */}
          {!currentSound?.isExternal && (
            <Box style={{ cursor: 'pointer' }} onClick={handleSeek}>
              <Progress value={progress} size="sm" radius="xs" color="maroon" />
            </Box>
          )}

          {/* Controls row */}
          <Group gap="xs" align="center" justify="space-between">
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlayerStop size={14} />}
                onClick={handleStop}
                disabled={!isPlaying}
              >
                Stop
              </Button>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlayerSkipForward size={14} />}
                onClick={handleNext}
                disabled={!isPlaying || currentSound?.isExternal}
              >
                Next
              </Button>
            </Group>

            {/* External sounds controls */}
            <Group gap="xs">
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
        </Stack>
      </Paper>

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
