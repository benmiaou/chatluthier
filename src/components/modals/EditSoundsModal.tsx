import {
  Button,
  Loader,
  Modal,
  Stack,
  Switch,
  Text,
  Group,
  Badge,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import { CustomCombobox } from '../audio/CustomCombobox';
import { useEffect, useState, useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import React from 'react';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconX,
  IconSearch,
} from '@tabler/icons-react';
import type { Sound, SoundCategory } from '../../types/sound';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

// Maps UI category to backend soundsType value
const SOUNDS_TYPE: Record<SoundCategory, string> = {
  background: 'backgroundMusic',
  ambiance: 'ambianceSounds',
  soundboard: 'soundboard',
};

const ENDPOINT: Record<SoundCategory, string> = {
  background: '/backgroundMusic',
  ambiance: '/ambianceSounds',
  soundboard: '/soundboard',
};

// Context options for each category
const CONTEXT_OPTIONS: Record<SoundCategory, string[]> = {
  background: [
    'calm',
    'dynamic',
    'intense',
    'city',
    'forest',
    'mountain',
    'ocean',
    'space',
    'fantasy',
    'medieval',
    'modern',
    'sci-fi',
    'battle',
    'exploration',
    'mystery',
    'peaceful',
  ],
  ambiance: [
    'animal',
    'nature',
    'city',
    'fantasy',
    'medieval',
    'modern',
    'magic',
    'weather',
    'water',
    'fire',
    'battle',
    'peaceful',
    'horror',
    'sci-fi',
    'technology',
    'vehicle',
    'music',
    'voice',
    'indoor',
    'outdoor',
    'day',
    'night',
    'crowd',
    'market',
  ],
  soundboard: [
    'animal',
    'nature',
    'city',
    'fantasy',
    'medieval',
    'modern',
    'magic',
    'weather',
    'water',
    'fire',
    'battle',
    'peaceful',
    'horror',
    'sci-fi',
    'technology',
    'vehicle',
    'music',
    'voice',
    'weapon',
    'spell',
    'ui',
    'notification',
    'alert',
  ],
};

interface EditSoundsModalProps {
  opened: boolean;
  onClose: () => void;
  category: SoundCategory;
  userId: string | null;
  onSave?: () => void;
}

interface SoundEdit extends Sound {
  contextEdits?: string[];
  creditEdits?: string;
}

export function EditSoundsModal({
  opened,
  onClose,
  category,
  userId,
  onSave,
}: EditSoundsModalProps): React.JSX.Element {
  const [sounds, setSounds] = useState<SoundEdit[]>([]);
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [contextEdits, setContextEdits] = useState<Record<string, string[]>>({});
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>(category || 'ambiance');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sounds based on search term
  const filteredSounds = sounds.filter(
    (sound) =>
      sound.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sound.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { play, stop, player } = useAudioPlayer();

  // Generate dynamic context options that include both predefined options and user-created contexts
  const availableContexts = useMemo(() => {
    if (!sounds.length || !selectedCategory) {
      return CONTEXT_OPTIONS[selectedCategory] || [];
    }

    // Extract all unique contexts from all sounds in the current category
    const userContexts = new Set<string>();
    sounds.forEach((sound) => {
      if (sound.contexts && Array.isArray(sound.contexts)) {
        sound.contexts.forEach((context) => {
          if (context && typeof context === 'string') {
            userContexts.add(context);
          }
        });
      }
    });

    // Merge predefined options with user contexts
    const predefinedOptions = CONTEXT_OPTIONS[selectedCategory] || [];
    const allContexts = [...new Set([...predefinedOptions, ...Array.from(userContexts)])];

    // Sort alphabetically
    return allContexts.sort((a, b) => a.localeCompare(b));
  }, [sounds, selectedCategory]);

  useEffect(() => {
    if (!opened) {
      return;
    }
    setEdits({});
    setContextEdits({});
    setCreditEdits({});
    setEditingSoundId(null);
    setLoading(true);

    // Ensure we have a valid category
    const safeCategory = selectedCategory || 'ambiance';

    // Ensure the category exists in our ENDPOINT mapping
    if (!ENDPOINT[safeCategory]) {
      setLoading(false);
      return;
    }

    const url = userId ? `${ENDPOINT[safeCategory]}?userId=${userId}` : ENDPOINT[safeCategory];
    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data: unknown[]) => {
        // Map backend data format to frontend expected format
        const mappedSounds = data.map((sound: unknown) => ({
          id: String(sound.id || sound.filename),
          name: sound.display_name || sound.name || sound.filename,
          filename: sound.filename,
          imageFile: sound.imageFile || sound.image_file,
          contexts: Array.isArray(sound.contexts) ? sound.contexts : [],
          credit: sound.credit || '',
          isEnabled: sound.isEnabled !== undefined ? sound.isEnabled : true,
        }));
        setSounds(mappedSounds);
      })
      .catch((error: unknown) => {
        notifications.show({
          message: `Failed to load sounds: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: 'red',
        });
      })
      .finally(() => setLoading(false));
  }, [opened, selectedCategory, userId]);

  const handleToggle = (filename: string, enabled: boolean) => {
    setEdits((prev) => ({ ...prev, [filename]: enabled }));
  };

  const handlePlayPause = async (filename: string) => {
    try {
      // Fix audio path based on category
      let soundUrl;
      switch (selectedCategory) {
        case 'background':
          soundUrl = `/assets/background/${filename}`;
          break;
        case 'ambiance':
          soundUrl = `/assets/ambiance/${filename}`;
          break;
        case 'soundboard':
          soundUrl = `/assets/soundboard/${filename}`;
          break;
        default:
          soundUrl = `/assets/${SOUNDS_TYPE[selectedCategory]}/${filename}`;
      }

      if (currentlyPlaying === filename && isPlaying) {
        // Currently playing this sound, pause it
        player.pause();
        setIsPlaying(false);
      } else {
        // Play this sound
        if (currentlyPlaying && currentlyPlaying !== filename) {
          // Stop any currently playing sound first
          stop();
        }

        await play(soundUrl, 0.5); // Play at 50% volume
        setCurrentlyPlaying(filename);
        setIsPlaying(true);
      }
    } catch (error: unknown) {
      notifications.show({
        message: `Failed to play sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const handleStop = (filename: string) => {
    if (currentlyPlaying === filename) {
      stop();
      setCurrentlyPlaying(null);
      setIsPlaying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const soundsType = SOUNDS_TYPE[selectedCategory];

      // User: collect all changes and send in a single request if possible
      const changes = [];

      // Collect all changes
      Object.entries(edits).forEach(([filename, isEnabled]) => {
        changes.push({
          filename,
          isEnabled,
          contexts: contextEdits[filename],
        });
      });

      // Add context-only changes
      Object.entries(contextEdits).forEach(([filename, contexts]) => {
        if (!edits[filename]) {
          changes.push({
            filename,
            contexts,
          });
        }
      });

      // Send all changes in a single batch request if there are changes
      if (changes.length > 0) {
        const response = await fetch('/update-user-sounds-batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            soundsType,
            changes,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update user sounds');
        }
      }

      notifications.show({ message: 'Saved!', color: 'teal' });
      onSave?.();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit My Sounds"
      size="xl"
      styles={{
        root: {
          '--modal-width': '80%',
          '--modal-max-width': '900px',
        },
        content: {
          width: 'var(--modal-width)',
          maxWidth: 'var(--modal-max-width)',
          height: '90vh',
          maxHeight: '90vh',
          margin: 'auto',
        },
      }}
    >
      <Stack gap="sm">
        <CustomCombobox
          value={selectedCategory}
          onChange={(v) => setSelectedCategory((v as SoundCategory) ?? 'ambiance')}
          data={['background', 'ambiance', 'soundboard']}
          placeholder="Select category"
        />
        <TextInput
          placeholder="Search sounds..."
          leftSection={<IconSearch size={16} />}
          onChange={(e) => {
            const newSearchTerm = e.currentTarget.value.toLowerCase();
            setSearchTerm(newSearchTerm);
          }}
          style={{ marginBottom: '10px' }}
        />
        {loading ? (
          <Loader size="sm" />
        ) : filteredSounds.length === 0 ? (
          <Text c="dimmed">No sounds found matching your search.</Text>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '0.5rem',
            }}
          >
            {filteredSounds.map((sound) => {
              const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
              const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
              const isEditing = editingSoundId === sound.id;

              return (
                <Stack
                  key={sound.filename}
                  gap="sm"
                  style={{
                    border: '1px solid var(--mantine-color-dark-4)',
                    padding: '0.5rem',
                    borderRadius: 'var(--mantine-radius-sm)',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Switch
                      label={sound.name}
                      checked={enabled}
                      onChange={(e) => handleToggle(sound.filename, e.currentTarget.checked)}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="xs"
                      variant={isEditing ? 'filled' : 'outline'}
                      onClick={() => setEditingSoundId(isEditing ? null : String(sound.id))}
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </Button>
                  </Group>

                  {isEditing && (
                    <Stack gap="xs" mt="xs">
                      <Group gap="xs" align="flex-end">
                        <TextInput
                          placeholder="Add new context..."
                          style={{ flex: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const newContext = e.currentTarget.value.trim();
                              if (!currentContexts.includes(newContext)) {
                                setContextEdits((prev) => ({
                                  ...prev,
                                  [sound.filename]: [
                                    ...(prev[sound.filename] ?? sound.contexts ?? []),
                                    newContext,
                                  ],
                                }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          size="xs"
                          onClick={() => {
                            const input = document.querySelector(
                              'input[placeholder="Add new context..."]'
                            ) as HTMLInputElement;
                            if (
                              input &&
                              input.value.trim() &&
                              !currentContexts.includes(input.value.trim())
                            ) {
                              const newContext = input.value.trim();
                              setContextEdits((prev) => ({
                                ...prev,
                                [sound.filename]: [
                                  ...(prev[sound.filename] ?? sound.contexts ?? []),
                                  newContext,
                                ],
                              }));
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Group>

                      {/* CustomCombobox for choosing existing contexts (like main page) */}
                      <CustomCombobox
                        value=""
                        onChange={(value) => {
                          if (value && !currentContexts.includes(value)) {
                            setContextEdits((prev) => ({
                              ...prev,
                              [sound.filename]: [
                                ...(prev[sound.filename] ?? sound.contexts ?? []),
                                value,
                              ],
                            }));
                          }
                        }}
                        data={availableContexts}
                        placeholder="Add existing context"
                        width={200}
                      />

                      {/* Display selected contexts as badges */}
                      {currentContexts.length > 0 && (
                        <Group gap="xs" mt="xs">
                          {currentContexts.map((ctx) => (
                            <Badge
                              key={ctx}
                              variant="light"
                              size="sm"
                              c="blue"
                              rightSection={
                                <ActionIcon
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContextEdits((prev) => ({
                                      ...prev,
                                      [sound.filename]:
                                        prev[sound.filename]?.filter((c) => c !== ctx) || [],
                                    }));
                                  }}
                                >
                                  <IconX size={12} />
                                </ActionIcon>
                              }
                            >
                              {ctx}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Stack>
                  )}

                  <Group gap="xs" mt="xs">
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={
                        currentlyPlaying === sound.filename && isPlaying ? (
                          <IconPlayerPause size={14} />
                        ) : (
                          <IconPlayerPlay size={14} />
                        )
                      }
                      onClick={() => handlePlayPause(sound.filename)}
                      disabled={!sound.filename}
                    >
                      {currentlyPlaying === sound.filename && isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconPlayerStop size={14} />}
                      onClick={() => handleStop(sound.filename)}
                      disabled={currentlyPlaying !== sound.filename}
                    >
                      Stop
                    </Button>
                  </Group>

                  {sound.credit && (
                    <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                      {sound.credit}
                    </Text>
                  )}
                </Stack>
              );
            })}
          </div>
        )}
        <Group gap="sm" mt="sm">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={
              Object.keys(edits).length === 0 &&
              Object.keys(contextEdits).length === 0 &&
              Object.keys(creditEdits).length === 0
            }
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
