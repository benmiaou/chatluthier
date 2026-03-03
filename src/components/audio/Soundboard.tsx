import { Group, Paper, Slider, Stack, Text } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IconVolume } from '@tabler/icons-react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSoundboard } from '../../hooks/useSoundboard';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
import { CustomCombobox } from './CustomCombobox';
import { DraggableSoundButton } from './DraggableSoundButton';

interface SoundboardProps {
  readonly userId?: string | null;
}

export function Soundboard({ userId = null }: SoundboardProps): React.ReactElement {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { sounds, allSounds, volume, context, setContext, playSound, setVolume } =
    useSoundboard(userId);

  // Initialize soundOrder with the current order of sounds
  const [soundOrder, setSoundOrder] = useState<string[]>(() => {
    return sounds.map((sound) => sound.filename);
  });

  // Add moveItem function for react-dnd
  const moveItem = (fromIndex: number, toIndex: number) => {
    setSoundOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  };

  // Apply sound order to sounds when soundOrder or sounds change
  const orderedSounds = useMemo(() => {
    if (soundOrder.length === 0 || sounds.length === 0) {
      return sounds;
    }

    // Create a map for quick lookup
    const orderMap = new Map(soundOrder.map((filename, index) => [filename, index]));

    // Sort sounds based on the soundOrder
    return [...sounds].sort((a, b) => {
      const aIndex = orderMap.get(a.filename) ?? Infinity;
      const bIndex = orderMap.get(b.filename) ?? Infinity;
      return aIndex - bIndex;
    });
  }, [sounds, soundOrder]);

  // Load sound order when user logs in
  const loadSoundOrder = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/get-sound-order?userId=${userId}&soundType=soundboard`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();
      const loadedOrder = data.order || [];

      // Filter the loaded order to only include filenames that exist in current sounds
      const validOrder = loadedOrder.filter((filename: string) =>
        sounds.some((sound) => sound.filename === filename)
      );

      // If we have a valid loaded order, use it. Otherwise use the current sounds order.
      setSoundOrder(validOrder.length > 0 ? validOrder : sounds.map((sound) => sound.filename));
    } catch (_error) {
      // Fallback to current sounds order if loading fails
      setSoundOrder(sounds.map((sound) => sound.filename));
    }
  }, [userId, sounds]);

  useEffect(() => {
    if (userId) {
      loadSoundOrder();
    }
  }, [userId, loadSoundOrder]);

  const saveSoundOrder = async (newOrder: string[]) => {
    try {
      if (!userId) {
        setSoundOrder(newOrder);
        return;
      }

      const response = await fetch('http://localhost:3000/save-sound-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          soundType: 'soundboard',
          order: newOrder,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      setSoundOrder(newOrder);
    } catch (_error) {
      // Fallback: still update local state even if server save fails
      setSoundOrder(newOrder);
    }
  };

  const handleDragEnd = (fromIndex: number, toIndex: number) => {
    if (!userId || userId === 'null' || userId === 'undefined') {
      return;
    }

    // Ensure the soundOrder state is updated with the final position
    setSoundOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);

      // Save the final order to the server immediately after state update
      saveSoundOrder(newOrder);

      return newOrder;
    });

    // The visual order will update automatically via the orderedSounds memo
  };

  const contexts = [
    'All',
    ...Array.from(new Set(allSounds.flatMap((s) => s.contexts ?? []))),
  ].filter(Boolean);

  const handlePlay = (filename: string) => {
    playSound(filename);

    // Always try to show credits, regardless of session
    const sound = sounds.find((s) => s.filename === filename);
    if (sound?.credit) {
      showCreditToast(sound.name, sound.credit);
    }

    // Session-specific logic
    if (sessionId) {
      send({
        type: 'playSoundboardSound',
        id: sessionId,
        content: {
          filename,
          credit: sound?.credit,
          name: sound?.name,
        },
      });
    }
  };

  // Listen for remote soundboard triggers
  useEffect(() => {
    return addMessageHandler((msg: WsMessage) => {
      if (msg.type === 'playSoundboardSound' && msg.content) {
        const { filename, credit, name } = msg.content as {
          filename: string;
          credit?: string;
          name?: string;
        };
        playSound(filename);
        // Show credit for received soundboard sounds
        if (credit && name) {
          showCreditToast(name, credit);
        }
      }
    });
  }, [addMessageHandler, playSound]);

  return (
    <Paper p="xs" radius="md" withBorder>
      <Stack gap="xs">
        {/* Title with volume control */}
        <Group justify="center" align="center">
          <Text fw={600} size="sm" tt="uppercase" c="dimmed">
            Soundboard
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

        {/* Context dropdown */}
        {contexts.length > 1 && (
          <Group justify="flex-end" gap="xs">
            <CustomCombobox
              value={context}
              onChange={(v) => setContext(v ?? 'All')}
              data={contexts}
              placeholder="Context"
            />
          </Group>
        )}

        {orderedSounds.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading sounds...
          </Text>
        )}

        <DndProvider backend={HTML5Backend}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              margin: 0,
              padding: 0,
              width: '100%',
              overflow: 'visible',
              alignContent: 'start',
            }}
          >
            {orderedSounds.map((sound, index) => (
              <DraggableSoundButton
                key={`${sound.filename}-${index}`}
                sound={sound}
                index={index}
                onPlay={handlePlay}
                moveItem={moveItem}
                onDragEnd={handleDragEnd}
                showDragHandle={Boolean(userId)}
              />
            ))}
          </div>
        </DndProvider>
      </Stack>
    </Paper>
  );
}
