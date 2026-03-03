import React from 'react';
import { Box, Button, Group, Modal, Paper, Slider, Stack, Text, Progress } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CustomCombobox } from './CustomCombobox';
import { IconPlayerSkipForward, IconPlayerStop, IconVolume } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';

import type { BackgroundMusicCategory, Sound } from '../../types/sound';
import { bgScenes, bgMatchesCategory } from '../../types/sound';

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
  // Autoplay permission modal state
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [modalOpened, { open, close }] = useDisclosure(false);

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
    setContext,
    sounds,
    playReceived,
    stopReceived,
    getCurrentTime,
    userInteracted,
    setUserInteracted,
  } = useBackgroundMusic(userId, () => {
    // This callback is called when autoplay is blocked
    if (!autoplayBlocked) {
      setAutoplayBlocked(true);
      open(); // Open the permission modal
    }
  });

  // Broadcast music change to session peers
  const handlePlayCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      // Mark that user has interacted with audio controls
      if (!userInteracted) {
        setUserInteracted(true);
      }
      await playCategory(category);
    },
    [playCategory, userInteracted, setUserInteracted]
  );

  // When a track starts, broadcast to session
  useEffect(() => {
    if (currentSound && sessionId) {
      const currentTime = getCurrentTime();
      send({
        type: 'backgroundMusicChange',
        id: sessionId,
        content: {
          filename: currentSound.filename,
          credit: currentSound.credit,
          timestamp: Date.now(),
          currentTime: currentTime,
        },
      });
    }
  }, [currentSound, sessionId, send, getCurrentTime]);

  // Listen for incoming socket messages
  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (!msg.content) {return;}

      const messageHandlers: Record<string, (content: unknown) => void> = {
        backgroundMusicChange: (content) => {
          const { filename, credit, timestamp, currentTime } = content as {
            filename: string;
            credit?: string;
            timestamp?: number;
            currentTime?: number;
          };
          playReceived({ filename, credit, timestamp, currentTime });
        },
        backgroundMusicStop: () => {
          stopReceived();
        },
        statusRequest: (content) => {
          const { statusType } = content as { statusType: string };
          if (statusType === 'backgroundMusic' && currentSound) {
            const currentTime = getCurrentTime();
            send({
              type: 'statusResponse',
              id: sessionId,
              content: {
                statusType: 'backgroundMusic',
                statusData: {
                  filename: currentSound.filename,
                  credit: currentSound.credit,
                  isPlaying: isPlaying,
                  timestamp: Date.now(),
                  currentTime: currentTime,
                },
              },
            });
          }
        },
        statusResponse: (content) => {
          const { statusType, statusData } = content as {
            statusType: string;
            statusData: {
              filename: string;
              credit?: string;
              isPlaying: boolean;
              timestamp?: number;
              currentTime?: number;
            };
          };
          if (statusType === 'backgroundMusic' && statusData) {
            if (statusData.isPlaying) {
              playReceived({
                filename: statusData.filename,
                credit: statusData.credit,
                timestamp: statusData.timestamp,
                currentTime: statusData.currentTime,
              });
            } else {
              stopReceived();
            }
          }
        }
      };

      const handler = messageHandlers[msg.type as keyof typeof messageHandlers];
      if (handler) {
        handler(msg.content);
      }
    });
  }, [
    addMessageHandler,
    playReceived,
    stopReceived,
    currentSound,
    isPlaying,
    sessionId,
    send,
    getCurrentTime,
  ]);

  // Broadcast stop
  const handleVolumeChange = useCallback(
    (v: number) => {
      // Mark user interaction when changing volume
      if (!userInteracted) {
        setUserInteracted(true);
      }
      setVolume(v);
    },
    [setVolume, userInteracted, setUserInteracted]
  );

  const handleNext = useCallback(() => {
    // Mark user interaction when going to next track
    if (!userInteracted) {
      setUserInteracted(true);
    }
    next();
  }, [next, userInteracted, setUserInteracted]);

  const handlePlayCurrentSound = useCallback(() => {
    // Mark user interaction and play the current sound
    if (!userInteracted) {
      setUserInteracted(true);
    }

    // If there's a current sound that was blocked, play it specifically
    if (currentSound) {
      // Use the specific sound play method to play exactly this sound
      playSpecificSound(currentSound).catch((_e) => {
        // Silently handle playback errors
      });
    }
  }, [currentSound, playSpecificSound, userInteracted, setUserInteracted]);

  const handleStop = useCallback(() => {
    // Mark user interaction when stopping
    if (!userInteracted) {
      setUserInteracted(true);
    }
    stop();
    if (sessionId) {
      send({ type: 'backgroundMusicStop', id: sessionId });
    }
  }, [stop, send, sessionId, userInteracted, setUserInteracted]);

  const contexts = ['All', ...Array.from(new Set(sounds.flatMap((s) => bgScenes(s))))];

  // Helper function to filter sounds by both context and category
  const filterSoundsByContextAndCategory = (
    sound: Sound,
    contextFilter: string,
    categoryFilter: BackgroundMusicCategory
  ) => {
    // If context is 'All', only filter by category
    if (contextFilter === 'All') {
      return categoryFilter === 'all' || bgMatchesCategory(sound, categoryFilter);
    }

    // If context is specific, filter by both scene and category
    const soundScenes = bgScenes(sound);
    const matchesScene = soundScenes.includes(contextFilter);
    const matchesCategory = categoryFilter === 'all' || bgMatchesCategory(sound, categoryFilter);

    return matchesScene && matchesCategory;
  };

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Mark user interaction when seeking
      if (!userInteracted) {
        setUserInteracted(true);
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      seekTo(pct);
    },
    [seekTo, userInteracted, setUserInteracted]
  );

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          {/* Title with volume control */}
          <Group justify="center" align="center">
            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
              Background Music
            </Text>
            <Group gap={6} align="center" ml={8}>
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

          {/* Category buttons with counts and aligned context dropdown */}
          <Group gap="xs" align="center">
            {CATEGORIES.map(({ value, label }) => {
              // Filter sounds by current context first, then by category
              const count = sounds.filter((s) =>
                filterSoundsByContextAndCategory(s, context, value)
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
            {/* Context dropdown - exact same size as buttons */}
            <CustomCombobox
              value={context}
              onChange={setContext}
              data={contexts}
              placeholder="Context"
            />
          </Group>

          {/* Current track info */}
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
              {currentSound ? `♪ ${currentSound.name}` : 'No track playing'}
            </Text>
          </Group>
          {currentSound?.credit && (
            <Text
              size="xs"
              c="dimmed"
              fs="italic"
              truncate
              dangerouslySetInnerHTML={{ __html: currentSound.credit }}
            />
          )}

          {/* Progress bar */}
          <Box style={{ cursor: 'pointer' }} onClick={handleSeek}>
            <Progress value={progress} size="sm" radius="xs" color="maroon" />
          </Box>

          {/* Controls row */}
          <Group gap="xs" align="center">
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
              disabled={!isPlaying}
            >
              Next
            </Button>
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
            <Button
              variant="filled"
              onClick={() => {
                // Play the current sound using the proper method
                handlePlayCurrentSound();
              }}
            >
              Allow Audio
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
