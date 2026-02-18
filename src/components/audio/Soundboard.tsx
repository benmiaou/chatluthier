import { ActionIcon, Button, Group, Paper, Select, SimpleGrid, Slider, Stack, Text } from '@mantine/core';
import { IconTrash, IconVolume } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSoundboard } from '../../hooks/useSoundboard';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface SoundboardProps {
  userId?: string | null;
  isAdmin?: boolean;
}

export function Soundboard({ userId = null, isAdmin = false }: SoundboardProps) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { sounds, allSounds, volume, context, setContext, playSound, setVolume, loadSounds } = useSoundboard(userId);
  const [orderedSounds, setOrderedSounds] = useState(sounds);

  // Update ordered sounds when sounds change
  useEffect(() => {
    setOrderedSounds(sounds);
  }, [sounds]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !userId) return;
    
    const items = Array.from(orderedSounds);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedSounds(items);
  };

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
    const sound = sounds.find((s) => s.filename === filename);
    if (sound?.credit) showCreditToast(sound.name, sound.credit);
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

        {orderedSounds.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading sounds…
          </Text>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="soundboard">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
                  {orderedSounds.map((sound, index) => (
                    <Draggable key={sound.filename} draggableId={sound.filename} index={index} isDragDisabled={!userId}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <Group gap={4} wrap="nowrap">
                            <Button
                              style={{ flex: 1, cursor: userId ? 'grab' : 'pointer' }}
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
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </SimpleGrid>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Stack>
    </Paper>
  );
}
