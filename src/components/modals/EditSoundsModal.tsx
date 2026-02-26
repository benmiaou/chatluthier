import { Button, Loader, Modal, Select, Stack, Switch, Text, MultiSelect, Group, Badge, TextInput, ActionIcon } from '@mantine/core';
import { useEffect, useState, useRef, useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconX } from '@tabler/icons-react';
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
    'calm', 'dynamic', 'intense',
    'city', 'forest', 'mountain', 'ocean', 'space',
    'fantasy', 'medieval', 'modern', 'sci-fi',
    'battle', 'exploration', 'mystery', 'peaceful'
  ],
  ambiance: [
    'animal', 'nature', 'city', 'fantasy', 'medieval', 'modern',
    'magic', 'weather', 'water', 'fire', 'battle', 'peaceful',
    'horror', 'sci-fi', 'technology', 'vehicle', 'music', 'voice',
    'indoor', 'outdoor', 'day', 'night', 'crowd', 'market'
  ],
  soundboard: [
    'animal', 'nature', 'city', 'fantasy', 'medieval', 'modern',
    'magic', 'weather', 'water', 'fire', 'battle', 'peaceful',
    'horror', 'sci-fi', 'technology', 'vehicle', 'music', 'voice',
    'weapon', 'spell', 'ui', 'notification', 'alert'
  ]
};

interface EditSoundsModalProps {
  opened: boolean;
  onClose: () => void;
  category: SoundCategory;
  isAdmin: boolean;
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
  isAdmin,
  userId,
  onSave,
}: EditSoundsModalProps) {
  const [sounds, setSounds] = useState<SoundEdit[]>([]);
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [contextEdits, setContextEdits] = useState<Record<string, string[]>>({});
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>(category || 'ambiance');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { play, stop, player } = useAudioPlayer();

  // Generate dynamic context options that include both predefined options and user-created contexts
  const availableContexts = useMemo(() => {
    if (!sounds.length || !selectedCategory) return CONTEXT_OPTIONS[selectedCategory] || [];

    // Extract all unique contexts from all sounds in the current category
    const userContexts = new Set<string>();
    sounds.forEach(sound => {
      if (sound.contexts && Array.isArray(sound.contexts)) {
        sound.contexts.forEach(context => {
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
    if (!opened) return;
    setEdits({});
    setContextEdits({});
    setCreditEdits({});
    setEditingSoundId(null);
    setLoading(true);
    
    // Ensure we have a valid category
    const safeCategory = selectedCategory || 'ambiance';
    
    // Ensure the category exists in our ENDPOINT mapping
    if (!ENDPOINT[safeCategory]) {
      console.error(`Invalid category: ${safeCategory}`);
      setLoading(false);
      return;
    }
    
    const url = userId
      ? `${ENDPOINT[safeCategory]}?userId=${userId}`
      : ENDPOINT[safeCategory];
    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data: any[]) => {
        // Map backend data format to frontend expected format
        const mappedSounds = data.map(sound => ({
          id: String(sound.id || sound.filename),
          name: sound.display_name || sound.name || sound.filename,
          filename: sound.filename,
          imageFile: sound.imageFile || sound.image_file,
          contexts: Array.isArray(sound.contexts) ? sound.contexts : [],
          credit: sound.credit || '',
          isEnabled: sound.isEnabled !== undefined ? sound.isEnabled : true
        }));
        setSounds(mappedSounds);
      })
      .catch((error) => {
        console.error('Failed to load sounds:', error);
        notifications.show({ message: `Failed to load sounds: ${error.message}`, color: 'red' });
      })
      .finally(() => setLoading(false));
  }, [opened, selectedCategory, userId]);

  const handleToggle = (filename: string, enabled: boolean) => {
    console.log(`Toggling sound ${filename} to ${enabled}`);
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
    } catch (error) {
      console.error('Error playing sound:', error);
      notifications.show({ message: `Failed to play sound: ${error.message}`, color: 'red' });
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
      
      if (isAdmin) {
        // Admin: send full updated sounds array to /update-main-playlist
        const updated = sounds.map((s) => ({
          ...s,
          isEnabled: edits[s.filename] ?? s.isEnabled ?? true,
          contexts: contextEdits[s.filename] ?? s.contexts ?? [],
          credit: creditEdits[s.filename] ?? s.credit ?? '',
        }));
        
        const response = await fetch('/update-main-playlist', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soundsType, sounds: updated }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update main playlist');
        }
      } else {
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
              changes 
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update user sounds');
          }
        }
      }
      
      notifications.show({ message: 'Saved!', color: 'teal' });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      notifications.show({ message: `Failed to save: ${error.message}`, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit Sounds${isAdmin ? ' (Admin)' : ''}`}
      size="lg"
    >
      <Stack gap="sm">
        <Select
          label="Category"
          value={selectedCategory}
          onChange={(v) => setSelectedCategory((v as SoundCategory) ?? 'ambiance')}
          data={[
            { value: 'background', label: 'Background Music' },
            { value: 'ambiance', label: 'Ambiance Sounds' },
            { value: 'soundboard', label: 'Soundboard' },
          ]}
        />
        {loading ? (
          <Loader size="sm" />
        ) : sounds.length === 0 ? (
          <Text c="dimmed">No sounds found in this category.</Text>
        ) : (
          <Stack gap="xs" mah={400} style={{ overflowY: 'auto' }}>
            {sounds.map((sound) => {
              const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
              const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
              const currentCredit = creditEdits[sound.filename] ?? sound.credit ?? '';
              const isEditing = editingSoundId === sound.id;
              
              return (
                <Stack key={sound.filename} gap="sm" style={{ 
                  border: '1px solid var(--mantine-color-dark-4)',
                  padding: '0.5rem',
                  borderRadius: 'var(--mantine-radius-sm)'
                }}>
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
                                setContextEdits(prev => ({ 
                                  ...prev, 
                                  [sound.filename]: [...(prev[sound.filename] ?? sound.contexts ?? []), newContext]
                                }));
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          size="xs"
                          onClick={() => {
                            const input = document.querySelector('input[placeholder="Add new context..."]') as HTMLInputElement;
                            if (input && input.value.trim() && !currentContexts.includes(input.value.trim())) {
                              const newContext = input.value.trim();
                              setContextEdits(prev => ({ 
                                ...prev, 
                                [sound.filename]: [...(prev[sound.filename] ?? sound.contexts ?? []), newContext]
                              }));
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Group>
                      
                      <MultiSelect
                        label="Select existing contexts"
                        placeholder="Search contexts..."
                        value={currentContexts}
                        onChange={(values) => {
                          setContextEdits(prev => ({ ...prev, [sound.filename]: values }));
                        }}
                        data={availableContexts}
                        searchable
                        clearable
                        maxDropdownHeight={200}
                        withinPortal={true}
                      />
                    </Stack>
                  )}
                  
                  <Group gap="xs" mt="xs">
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={currentlyPlaying === sound.filename && isPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
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
                      <span dangerouslySetInnerHTML={{ __html: sound.credit }} />
                    </Text>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
        <Button mt="sm" onClick={handleSave} loading={saving} disabled={Object.keys(edits).length === 0 && Object.keys(contextEdits).length === 0 && Object.keys(creditEdits).length === 0}>
          Save Changes
        </Button>
      </Stack>
    </Modal>
  );
}