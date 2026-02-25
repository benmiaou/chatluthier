import { Button, Loader, Modal, Select, Stack, Switch, Text, MultiSelect, Group, Badge, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { Sound, SoundCategory } from '../../types/sound';

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
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>(category);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setEdits({});
    setContextEdits({});
    setCreditEdits({});
    setEditingSoundId(null);
    setLoading(true);
    const url = userId
      ? `${ENDPOINT[selectedCategory]}?userId=${userId}`
      : ENDPOINT[selectedCategory];
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
          id: sound.id || sound.filename,
          name: sound.display_name || sound.name || sound.filename,
          filename: sound.filename,
          imageFile: sound.imageFile || sound.image_file,
          contexts: sound.contexts || [],
          credit: sound.credit,
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
        await fetch('/update-main-playlist', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soundsType, sounds: updated }),
        });
      } else {
        // User: call /update-user-sound for each changed sound
        await Promise.all(
          Object.entries(edits).map(([filename, isEnabled]) =>
            fetch('/update-user-sound', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, soundsType, filename, isEnabled }),
            }),
          ),
        );
      }
      notifications.show({ message: 'Saved!', color: 'teal' });
      onSave?.();
      onClose();
    } catch {
      notifications.show({ message: 'Failed to save', color: 'red' });
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
                    {isAdmin && (
                      <Button
                        size="xs"
                        variant={isEditing ? 'filled' : 'outline'}
                        onClick={() => setEditingSoundId(isEditing ? null : sound.id)}
                      >
                        {isEditing ? 'Done' : 'Edit'}
                      </Button>
                    )}
                  </Group>
                  
                  {isEditing && isAdmin && (
                    <Stack gap="xs" mt="xs">
                      <MultiSelect
                        label="Contexts"
                        placeholder="Select contexts..."
                        value={Array.isArray(currentContexts) ? currentContexts : []}
                        onChange={(values) => {
                          setContextEdits(prev => ({ ...prev, [sound.filename]: values }));
                        }}
                        data={CONTEXT_OPTIONS[selectedCategory]}
                        searchable
                        clearable
                        creatable
                        getCreateLabel={(query) => `+ Create ${query}`}
                        onCreate={(query) => {
                          const newOption = query;
                          setContextEdits(prev => ({ 
                            ...prev, 
                            [sound.filename]: [...(prev[sound.filename] ?? []), newOption]
                          }));
                          return newOption;
                        }}
                      />
                      
                      <TextInput
                        label="Credit"
                        placeholder="Artist/Source credit..."
                        value={currentCredit}
                        onChange={(e) => {
                          setCreditEdits(prev => ({ ...prev, [sound.filename]: e.currentTarget.value }));
                        }}
                      />
                      
                      {currentContexts.length > 0 && (
                        <Group gap="xs">
                          <Text size="sm" fw={500}>Current contexts:</Text>
                          {currentContexts.map((ctx, index) => (
                            <Badge key={index} variant="light">
                              {ctx}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Stack>
                  )}
                  
                  <Text size="xs" c="dimmed">{sound.filename}</Text>
                  {sound.credit && !isEditing && (
                    <Text size="xs" c="dimmed" italic>
                      Credit: {sound.credit}
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
