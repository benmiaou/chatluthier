import { ActionIcon, Box, Button, Group, Paper, Slider, Stack, Text, Progress } from '@mantine/core';
import { CustomCombobox } from './CustomCombobox';
import { IconPlayerSkipForward, IconPlayerStop, IconTrash, IconVolume } from '@tabler/icons-react';
import { useCallback, useEffect } from 'react';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
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

export function BackgroundMusic({ userId = null, isAdmin = false }: Readonly<BackgroundMusicProps>) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const {
    currentSound,
    activeCategory,
    isPlaying,
    volume,
    progress,
    context,
    playCategory,
    next,
    stop,
    setVolume,
    seekTo,
    setContext,
    sounds,
    loadSounds,
    playReceived,
    stopReceived,
  } = useBackgroundMusic(userId);

  const handleDelete = async (filename: string) => {
    await fetch('/delete-sound', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, soundType: 'backgroundMusic' }),
    });
    loadSounds();
  };

  // Broadcast music change to session peers
  const handlePlayCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      await playCategory(category);
    },
    [playCategory],
  );

  // When a track starts, broadcast to session
  useEffect(() => {
    if (currentSound && sessionId) {
      send({
        type: 'backgroundMusicChange',
        id: sessionId,
        content: { 
          filename: currentSound.filename, 
          credit: currentSound.credit,
          timestamp: Date.now()
        },
      });
    }
  }, [currentSound, sessionId, send]);

  // Listen for incoming socket messages
  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (msg.type === 'backgroundMusicChange' && msg.content) {
        const { filename, credit, timestamp } = msg.content as { 
          filename: string; 
          credit?: string;
          timestamp?: number
        };
        
        // Calculate delay from when the message was sent
        const now = Date.now();
        const delay = timestamp ? now - timestamp : 0;
        
        playReceived({ filename, credit });
        // Credit is already shown in the player UI, no need for toast
      } else if (msg.type === 'backgroundMusicStop') {
        stopReceived();
      } else if (msg.type === 'statusRequest' && msg.content) {
        const { statusType } = msg.content as { statusType: string };
        if (statusType === 'backgroundMusic' && currentSound) {
          // Respond with current background music status
          send({
            type: 'statusResponse',
            id: sessionId,
            content: {
              statusType: 'backgroundMusic',
              statusData: {
                filename: currentSound.filename,
                credit: currentSound.credit,
                isPlaying: isPlaying,
                timestamp: Date.now()
              }
            }
          });
        }
      } else if (msg.type === 'statusResponse' && msg.content) {
        const { statusType, statusData } = msg.content as { 
          statusType: string; 
          statusData: { filename: string; credit?: string; isPlaying: boolean; timestamp?: number }
        };
        if (statusType === 'backgroundMusic' && statusData) {
          if (statusData.isPlaying) {
            playReceived({
              filename: statusData.filename,
              credit: statusData.credit
            });
            // Credit is already shown in the player UI, no need for toast
          }
        }
      }
    });
  }, [addMessageHandler, playReceived, stopReceived, currentSound, isPlaying, sessionId, send]);

  // Broadcast stop
  const handleStop = useCallback(() => {
    stop();
    if (sessionId) send({ type: 'backgroundMusicStop', id: sessionId });
  }, [stop, send, sessionId]);

  const contexts = ['All', ...Array.from(new Set(sounds.flatMap((s) => bgScenes(s))))];

  // Helper function to filter sounds by both context and category
  const filterSoundsByContextAndCategory = (sound: Sound, contextFilter: string, categoryFilter: BackgroundMusicCategory) => {
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
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      seekTo(pct);
    },
    [seekTo],
  );

  return (
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
              onChange={setVolume}
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
          {isAdmin && currentSound && (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => handleDelete(currentSound.filename)}
              title={`Delete ${currentSound.name}`}
            >
              <IconTrash size={12} />
            </ActionIcon>
          )}
        </Group>
        {currentSound?.credit && (
          <Text size="xs" c="dimmed" fs="italic" truncate
            dangerouslySetInnerHTML={{ __html: currentSound.credit }}
          />
        )}

        {/* Progress bar */}
        <Box
          style={{ cursor: 'pointer' }}
          onClick={handleSeek}
        >
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
            onClick={next}
            disabled={!isPlaying}
          >
            Next
          </Button>


        </Group>
      </Stack>
    </Paper>
  );
}
