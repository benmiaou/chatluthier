import { Badge, Box, Group, ScrollArea, Slider, Stack, Text } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IconVolume } from '@tabler/icons-react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSoundboard } from '../../hooks/useSoundboard';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
import { CustomCombobox } from './CustomCombobox';
import { DraggableSoundButton } from './DraggableSoundButton';
import { handleError } from '../../utils/logger';

interface SoundboardProps {
  readonly userId?: string | null;
}

export function Soundboard({ userId = null }: SoundboardProps): React.ReactElement {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { sounds, volume, context, setContext, playSound, setVolume } = useSoundboard(userId);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);

  // Initialize soundOrder with the current order of sounds
  const [soundOrder, setSoundOrder] = useState<string[]>(() => {
    return sounds.map((sound) => sound.filename ?? '');
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
      const aIndex = orderMap.get(a.filename ?? '') ?? Infinity;
      const bIndex = orderMap.get(b.filename ?? '') ?? Infinity;
      return aIndex - bIndex;
    });
  }, [sounds, soundOrder]);

  // Load sound order when user logs in
  const loadSoundOrder = useCallback(async () => {
    try {
      const response = await fetch(`/get-sound-order?userId=${userId}&soundType=soundboard`, {
        credentials: 'include',
      });
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
      setSoundOrder(
        validOrder.length > 0 ? validOrder : sounds.map((sound) => sound.filename ?? '')
      );
    } catch (error) {
      handleError(error, 'Soundboard.loadSoundOrder');
      // Fallback to current sounds order if loading fails
      setSoundOrder(sounds.map((sound) => sound.filename ?? ''));
    }
  }, [userId, sounds]);

  useEffect(() => {
    if (userId) {
      loadSoundOrder();
    }
  }, [userId, loadSoundOrder]);

  const saveSoundOrder = async (newOrder: string[]) => {
    if (!userId) {
      setSoundOrder(newOrder);
      return;
    }

    try {
      const response = await fetch('/save-sound-order', {
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
    } catch (_error) {
      handleError(_error, 'Soundboard.saveSoundOrder');
    }

    // Always update local state, whether server save succeeds or fails
    setSoundOrder(newOrder);
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

  const contexts = ['All', ...Array.from(new Set(sounds.flatMap((s) => s.contexts ?? [])))].filter(
    Boolean
  );

  const handlePlay = (filename: string) => {
    const sound = sounds.find((s) => s.filename === filename);
    if (!sound) {
      return;
    }

    playSound(sound);
    setActiveFilename(filename);
    setTimeout(() => {
      setActiveFilename((prev) => (prev === filename ? null : prev));
    }, 750);

    // Always try to show credits, regardless of session
    if (sound.credit) {
      showCreditToast(sound.name, sound.credit);
    }

    // Session-specific logic
    if (sessionId) {
      send({
        type: 'playSoundboardSound',
        id: sessionId,
        content: {
          filename,
          credit: sound.credit,
          name: sound.name,
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
        const sound = sounds.find((s) => s.filename === filename);
        if (sound) {
          playSound(sound);
          setActiveFilename(filename);
          setTimeout(() => {
            setActiveFilename((prev) => (prev === filename ? null : prev));
          }, 750);
          // Show credit for received soundboard sounds
          if (credit && name) {
            showCreditToast(name, credit);
          }
        }
      }
    });
  }, [addMessageHandler, playSound, sounds]);

  return (
    <Stack
      gap="sm"
      bg="dark.7"
      style={{
        flex: 1,
        minHeight: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" px="xs" mt="xs">
        <Text fw={700} size="sm" tt="uppercase" c="dimmed" className="soundboard-title">
          Soundboard
        </Text>
        <Group gap="xs" wrap="wrap">
          {Boolean(userId) && (
            <Badge size="sm" variant="light" color="teal">
              Drag enabled
            </Badge>
          )}
        </Group>
      </Group>

      <ScrollArea px={10} pb={5} style={{ flex: 1 }} type="auto">
        {orderedSounds.length === 0 && (
          <Text size="xs" c="dimmed" ta="center" py="sm">
            Loading sounds...
          </Text>
        )}

        <DndProvider backend={HTML5Backend}>
          <div className="soundboard-grid">
            {orderedSounds.map((sound, index) => (
              <DraggableSoundButton
                key={`${sound.filename}-${index}`}
                sound={sound}
                index={index}
                onPlay={handlePlay}
                moveItem={moveItem}
                onDragEnd={handleDragEnd}
                showDragHandle={Boolean(userId)}
                isActive={activeFilename === sound.filename}
              />
            ))}
          </div>
        </DndProvider>
      </ScrollArea>
      <Box bg="dark.8" p="xs">
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          {contexts.length > 1 && (
            <CustomCombobox
              value={context}
              onChange={(v) => setContext(v ?? 'All')}
              data={contexts}
              placeholder="Context"
            />
          )}

          <Group gap={6} align="center" className="soundboard-volume-control">
            <IconVolume size={16} color="var(--mantine-color-dimmed)" />
            <Slider
              size="xs"
              w={110}
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={setVolume}
              label={(v) => `${Math.round(v * 100)}%`}
            />
          </Group>
        </Group>
      </Box>
    </Stack>
  );
}
