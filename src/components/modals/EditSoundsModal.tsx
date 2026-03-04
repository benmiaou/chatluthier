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
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconX,
  IconSearch,
} from '@tabler/icons-react';
import type { Sound, SoundCategory } from '../../types/sound';

// Backend sound data type
interface BackendSound {
  id?: number | string;
  display_name?: string;
  name?: string;
  filename: string;
  contexts?: string[];
  isEnabled?: boolean;
  credit?: string;
  imageFile?: string;
  image_file?: string; // Legacy field name
}
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
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly category: SoundCategory;
  readonly userId: string | null;
  readonly onSave?: () => void;
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
}: Readonly<EditSoundsModalProps>): React.JSX.Element {
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
      sound.contexts?.forEach((context) => {
        if (typeof context === 'string') {
          userContexts.add(context);
        }
      });
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
        const mappedSounds = data.map((sound) => {
          const typedSound = sound as BackendSound;
          return {
            id: String(typedSound.id || typedSound.filename),
            name: typedSound.display_name || typedSound.name || typedSound.filename,
            filename: typedSound.filename,
            category: selectedCategory,
            imageFile: typedSound.imageFile || typedSound.image_file,
            contexts: Array.isArray(typedSound.contexts) ? typedSound.contexts : [],
            credit: typedSound.credit || '',
            isEnabled: typedSound.isEnabled ?? true,
          };
        });
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

  const getSoundUrl = (filename: string): string => {
    switch (selectedCategory) {
      case 'background':
        return `/assets/background/${filename}`;
      case 'ambiance':
        return `/assets/ambiance/${filename}`;
      case 'soundboard':
        return `/assets/soundboard/${filename}`;
      default:
        return `/assets/${SOUNDS_TYPE[selectedCategory]}/${filename}`;
    }
  };

  const handlePlayPause = async (filename: string) => {
    try {
      const soundUrl = getSoundUrl(filename);

      if (currentlyPlaying === filename && isPlaying) {
        // Currently playing this sound, pause it
        player.current?.pause();
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notifications.show({
        message: `Failed to play sound: ${errorMessage}`,
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
      const changes = collectChanges();

      if (changes.length > 0) {
        const response = await sendChangesToServer(changes, soundsType);
        if (!response.ok) {
          throw new Error('Failed to update user sounds');
        }
      }

      notifications.show({ message: 'Saved!', color: 'teal' });
      onSave?.();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notifications.show({
        message: `Failed to save: ${errorMessage}`,
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const collectChanges = (): Array<{
    filename: string;
    isEnabled?: boolean;
    contexts?: string[];
  }> => {
    const changes: Array<{
      filename: string;
      isEnabled?: boolean;
      contexts?: string[];
    }> = [];

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

    return changes;
  };

  const sendChangesToServer = async (
    changes: Array<{
      filename: string;
      isEnabled?: boolean;
      contexts?: string[];
    }>,
    soundsType: string
  ): Promise<Response> => {
    return await fetch('/update-user-sounds-batch', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        soundsType,
        changes,
      }),
    });
  };

  // Extract nested function to reduce nesting depth
  const handleRemoveContext = (soundFilename: string, contextToRemove: string) => {
    setContextEdits((prev) => {
      const currentSoundContexts = prev[soundFilename] || [];
      const updatedContexts = currentSoundContexts.filter((c) => c !== contextToRemove);
      return {
        ...prev,
        [soundFilename]: updatedContexts,
      };
    });
  };

  // Helper function to render content based on loading state
  const renderContent = (): React.ReactNode => {
    if (loading) {
      return <Loader size="sm" />;
    }
    if (filteredSounds.length === 0) {
      return <Text c="dimmed">No sounds found matching your search.</Text>;
    }
    return renderSoundsGrid();
  };

  const renderSoundsGrid = (): React.ReactNode => {
    return (
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
        {filteredSounds.map((sound) => renderSoundItem(sound))}
      </div>
    );
  };

  // Extract nested functions to reduce nesting depth
  const handleNewContextKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    soundFilename: string,
    currentContexts: string[]
  ) => {
    const inputValue = e.currentTarget.value?.trim();
    if (e.key === 'Enter' && inputValue) {
      const newContext = inputValue;
      if (!currentContexts.includes(newContext)) {
        addNewContext(soundFilename, newContext);
        e.currentTarget.value = '';
      }
    }
  };

  const handleAddContextButtonClick = (soundFilename: string, currentContexts: string[]) => {
    const input = document.querySelector(
      'input[placeholder="Add new context..."]'
    ) as HTMLInputElement;
    const inputValue = input?.value?.trim();
    if (inputValue && !currentContexts.includes(inputValue)) {
      addNewContext(soundFilename, inputValue);
      input.value = '';
    }
  };

  const handleExistingContextChange = (
    value: string,
    soundFilename: string,
    currentContexts: string[]
  ) => {
    const trimmedValue = value?.trim();
    if (trimmedValue && !currentContexts.includes(trimmedValue)) {
      addNewContext(soundFilename, trimmedValue);
    }
  };

  const addNewContext = (soundFilename: string, newContext: string) => {
    setContextEdits((prev) => ({
      ...prev,
      [soundFilename]: [
        ...(prev[soundFilename] ?? []),
        newContext,
      ],
    }));
  };

  const renderContextBadges = (soundFilename: string, currentContexts: string[]): React.ReactNode => {
    return (
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
                  handleRemoveContext(soundFilename, ctx);
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
    );
  };

  const renderSoundEditSection = (sound: SoundEdit, currentContexts: string[]): React.ReactNode => {
    return (
      <Stack gap="xs" mt="xs">
        <Group gap="xs" align="flex-end">
          <TextInput
            placeholder="Add new context..."
            style={{ flex: 1 }}
            onKeyDown={(e) => handleNewContextKeyDown(e, sound.filename, currentContexts)}
          />
          <Button
            size="xs"
            onClick={() => handleAddContextButtonClick(sound.filename, currentContexts)}
          >
            Add
          </Button>
        </Group>

        {/* CustomCombobox for choosing existing contexts (like main page) */}
        <CustomCombobox
          value=""
          onChange={(value) => handleExistingContextChange(value, sound.filename, currentContexts)}
          data={availableContexts}
          placeholder="Add existing context"
          width={200}
        />

        {/* Display selected contexts as badges */}
        {currentContexts.length > 0 && renderContextBadges(sound.filename, currentContexts)}
      </Stack>
    );
  };

  const renderSoundItem = (sound: SoundEdit): React.ReactNode => {
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

        {isEditing && renderSoundEditSection(sound, currentContexts)}
        {renderSoundControls(sound)}
        {renderSoundCredit(sound)}
      </Stack>
    );
  };

  const renderSoundControls = (sound: SoundEdit): React.ReactNode => {
    return (
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
    );
  };

  const renderSoundCredit = (sound: SoundEdit): React.ReactNode => {
    if (!sound.credit?.trim()) {
      return null;
    }
    return (
      <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
        {sound.credit}
      </Text>
    );
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
        {renderContent()}
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
          {filteredSounds.map(renderSoundItem)}
        </div>
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
