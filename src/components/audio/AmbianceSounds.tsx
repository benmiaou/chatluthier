import { Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAmbianceSounds } from '../../hooks/useAmbianceSounds';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { SoundBar } from './SoundBar';

interface AmbianceSoundsProps {
  userId?: string | null;
  isAdmin?: boolean;
}

export function AmbianceSounds({ userId = null, isAdmin = false }: AmbianceSoundsProps) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { bars, allBars, context, setContext, setBarVolume, reset, getStatus, applyStatus, loadSounds, presets, savePreset, applyPreset, loadPresets } = useAmbianceSounds(userId);
  const [presetName, setPresetName] = useState('');

  const contexts = ['All', ...Array.from(new Set(allBars.flatMap((b) => b.sound.contexts ?? [])))].filter(Boolean);

  // Load presets when user logs in
  useEffect(() => {
    if (userId) loadPresets();
  }, [userId, loadPresets]);



  const handleChange = (filename: string, volume: number) => {
    setBarVolume(filename, volume);
    if (sessionId) {
      send({ type: 'ambianceStatusUpdate', id: sessionId, content: { ambianceStatus: getStatus() } });
    }
  };

  const handleReset = () => {
    reset();
    if (sessionId) {
      send({ type: 'ambianceStatusUpdate', id: sessionId, content: { ambianceStatus: {} } });
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName('');
  };

  const handleApplyPreset = (name: string | null) => {
    if (name) applyPreset(name);
  };

  // Listen for incoming ambiance updates from session peers
  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (msg.type === 'ambianceStatusUpdate' && msg.content) {
        const { ambianceStatus } = msg.content as { ambianceStatus: Record<string, number> };
        applyStatus(ambianceStatus);
      }
    });
  }, [addMessageHandler, applyStatus]);

  const presetNames = Object.keys(presets);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Text fw={600} size="sm" tt="uppercase" c="dimmed" ta="center">
          Ambiance Sounds
        </Text>
        <Group justify="flex-end">
          <Group gap="xs">
            {contexts.length > 1 && (
              <Select
                size="xs"
                w={130}
                value={context}
                onChange={(v) => setContext(v ?? 'All')}
                data={contexts}
              />
            )}
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconRefresh size={14} />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Group>
        </Group>

        {bars.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading ambiance sounds…
          </Text>
        )}

        <SimpleGrid cols={{ base: 5, sm: 7, md: 9 }} spacing={4}>
          {bars.map((bar) => (
            <SoundBar key={bar.sound.filename} bar={bar} onChange={handleChange} />
          ))}
        </SimpleGrid>

        {/* Preset controls — only shown when logged in */}
        {userId && (
          <Stack gap="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Presets</Text>
            <Group gap="xs">
              <TextInput
                size="xs"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.currentTarget.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              />
              <Button
                size="xs"
                variant="default"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Save
              </Button>
            </Group>
            {presetNames.length > 0 && (
              <Select
                size="xs"
                placeholder="Load preset…"
                data={presetNames}
                onChange={handleApplyPreset}
                clearable
              />
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
