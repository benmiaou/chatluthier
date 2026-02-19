import { Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import { useAmbianceSounds } from '../../hooks/useAmbianceSounds';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { SoundBar } from './SoundBar';
import { CustomCombobox } from './CustomCombobox';
import { DraggableSoundBar } from './DraggableSoundBar';

interface AmbianceSoundsProps {
  userId?: string | null;
  isAdmin?: boolean;
}

export function AmbianceSounds({ userId = null, isAdmin = false }: AmbianceSoundsProps) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { bars, allBars, context, setContext, setBarVolume, reset, getStatus, applyStatus, loadSounds, presets, savePreset, applyPreset, loadPresets } = useAmbianceSounds(userId);
  const [presetName, setPresetName] = useState('');

  const contexts = ['All', ...Array.from(new Set(allBars.flatMap((b) => b.sound.contexts ?? [])))].filter(Boolean);

  const [soundOrder, setSoundOrder] = useState<string[]>([]);

  // Add moveItem function for react-dnd
  const moveItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...soundOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setSoundOrder(newOrder);
  };

  // Apply sound order to bars when soundOrder or bars change
  const orderedBars = useMemo(() => {
    if (soundOrder.length === 0 || bars.length === 0) return bars;
    
    // Create a map for quick lookup
    const orderMap = new Map(soundOrder.map((filename, index) => [filename, index]));
    
    return [...bars].sort((a, b) => {
      const aIndex = orderMap.get(a.sound.filename) ?? Infinity;
      const bIndex = orderMap.get(b.sound.filename) ?? Infinity;
      return aIndex - bIndex;
    });
  }, [bars, soundOrder]);

  // Load presets and sound order when user logs in
  useEffect(() => {
    if (userId) {
      loadPresets();
      loadSoundOrder();
    }
  }, [userId, loadPresets]);

  const loadSoundOrder = async () => {
    try {
      const response = await fetch(`/get-sound-order?userId=${userId}&soundType=ambiance`);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      setSoundOrder(data.order || []);
    } catch (error) {
      console.error('Failed to load sound order:', error);
      // Don't break the app - just keep empty order
      setSoundOrder([]);
    }
  };

  const saveSoundOrder = async (newOrder: string[]) => {
    try {
      const response = await fetch('/save-sound-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          soundType: 'ambiance',
          order: newOrder
        })
      });
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      setSoundOrder(newOrder);
    } catch (error) {
      console.error('Failed to save sound order:', error);
      // Fallback: still update local state even if server save fails
      setSoundOrder(newOrder);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !userId) return;
    
    // Get current bars and create a working copy
    const items = Array.from(bars);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update the sound order
    const newOrder = items.map(item => item.sound.filename);
    saveSoundOrder(newOrder);
    
    // Force re-render to ensure proper reflow
    // This is handled automatically by the soundOrder state update
  };

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
        <Group justify="space-between">
          <Group gap="xs">
            {contexts.length > 1 && (
              <CustomCombobox
                value={context}
                onChange={(v) => setContext(v ?? 'All')}
                data={contexts}
                placeholder="Context"
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
          {userId && (
            <Group gap="xs">
              <TextInput
                size="xs"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.currentTarget.value)}
                style={{ width: 150 }}
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
              {presetNames.length > 0 && (
                <CustomCombobox
                  value=""
                  onChange={handleApplyPreset}
                  data={presetNames}
                  placeholder="Load preset…"
                />
              )}
            </Group>
          )}
        </Group>

        {bars.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading ambiance sounds…
          </Text>
        )}

        <DndProvider backend={HTML5Backend}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 150px)',
              gridTemplateRows: 'repeat(auto-fill, 150px)',
              gap: 1,
              minHeight: '500px',
              position: 'relative',
              width: '100%',
              overflow: 'visible',
              alignContent: 'start',
              rowGap: 0,
              columnGap: 1
            }}
          >
            {orderedBars.map((bar, index) => (
              <DraggableSoundBar
                key={`${bar.sound.filename}-${index}`}
                bar={bar}
                index={index}
                onChange={handleChange}
                moveItem={moveItem}
                showDragHandle={!!userId}
              />
            ))}
          </div>
        </DndProvider>


      </Stack>
    </Paper>
  );
}
