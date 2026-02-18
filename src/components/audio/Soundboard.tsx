import { ActionIcon, Button, Group, Paper, Select, SimpleGrid, Slider, Stack, Text } from '@mantine/core';
import { IconTrash, IconVolume } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useSoundboard } from '../../hooks/useSoundboard';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';

interface SoundboardProps {
  userId?: string | null;
  isAdmin?: boolean;
}

export function Soundboard({ userId = null, isAdmin = false }: SoundboardProps) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { sounds, allSounds, volume, context, setContext, playSound, setVolume, loadSounds } = useSoundboard(userId);

  const contexts = ['All', ...Array.from(new Set(allSounds.flatMap((s) => s.contexts ?? [])))].filter(Boolean);

  const handleDelete = async (filename: string) => {
    await fetch('/delete-sound', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, soundType: 'soundboard' }),
    });
    loadSounds();
  };

  const handlePlay = (filename: string) => {
    playSound(filename);
    if (sessionId) {
      send({ type: 'playSoundboardSound', id: sessionId, content: { filename } });
    }
  };

  // Listen for remote soundboard triggers
  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (msg.type === 'playSoundboardSound' && msg.content) {
        const { filename } = msg.content as { filename: string };
        playSound(filename);
      }
    });
  }, [addMessageHandler, playSound]);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm" tt="uppercase" c="dimmed">
            Soundboard
          </Text>
          <Group gap={6} align="center">
            {contexts.length > 1 && (
              <Select
                size="xs"
                w={130}
                value={context}
                onChange={(v) => setContext(v ?? 'All')}
                data={contexts}
              />
            )}
            <IconVolume size={16} color="var(--mantine-color-dimmed)" />
            <Slider
              size="xs"
              w={100}
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={setVolume}
              label={(v) => `${Math.round(v * 100)}%`}
            />
          </Group>
        </Group>

        {sounds.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading sounds…
          </Text>
        )}

        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
          {sounds.map((sound) => (
            <Group key={sound.filename} gap={4} wrap="nowrap">
              <Button
                style={{ flex: 1 }}
                size="xs"
                variant="default"
                onClick={() => handlePlay(sound.filename)}
                styles={{ root: { whiteSpace: 'normal', height: 'auto', padding: '6px 8px' } }}
              >
                {sound.name}
              </Button>
              {isAdmin && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => handleDelete(sound.filename)}
                  title={`Delete ${sound.name}`}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              )}
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
