import { Button, Group, Paper, SimpleGrid, Slider, Stack, Text } from '@mantine/core';
import { IconVolume } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useSoundboard } from '../../hooks/useSoundboard';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CustomCombobox } from './CustomCombobox';

interface SoundboardProps {
  readonly userId?: string | null;
}

export function Soundboard({ userId = null }: SoundboardProps) {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const { sounds, allSounds, volume, context, setContext, playSound, setVolume } = useSoundboard(userId);
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

  const renderSoundButton = (sound: any, index: number) => {
    return (
      <Draggable key={sound.filename} draggableId={sound.filename} index={index} isDragDisabled={!userId}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="soundboard-button-container">
            <Button
              className="soundboard-button"
              style={{ width: '100%', cursor: userId ? 'grab' : 'pointer' }}
              size="compact-xs"
              variant="default"
              onClick={() => handlePlay(sound.filename)}
              title={sound.name}
            >
              {sound.name}
            </Button>
          </div>
        )}
      </Draggable>
    );
  };

  const renderSoundboardGrid = () => {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="soundboard">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ margin: 0, padding: 0 }}>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing={4} style={{ margin: 0, padding: 0 }} className="soundboard-grid">
                {orderedSounds.map((sound, index) => renderSoundButton(sound, index))}
                {provided.placeholder}
              </SimpleGrid>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

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
            Loading sounds…
          </Text>
        )}

        {renderSoundboardGrid()}
      </Stack>
    </Paper>
  );
}
