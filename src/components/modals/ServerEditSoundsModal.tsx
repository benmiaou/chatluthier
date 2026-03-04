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
  FileInput,
  useCombobox,
} from '@mantine/core';
import { CustomCombobox } from '../audio/CustomCombobox';
import { useEffect, useState } from 'react';
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

// Intensity options for background music
const BACKGROUND_INTENSITY_OPTIONS = ['calm', 'dynamic', 'intense'];

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

interface ServerEditSoundsModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onAddSound?: () => void;
}

interface SoundEdit extends Sound {
  display_name?: string;
  contextEdits?: string[];
  creditEdits?: string;
  imageFileEdits?: File | string;
  imageFile?: string;
}

const ContextBadge = ({
  ctx,
  selectedCategory,
}: {
  ctx: string;
  selectedCategory: SoundCategory;
}) => {
  if (selectedCategory === 'background') {
    const match = /^\(([^,]+),\s*([^)]+)\)$/.exec(String(ctx));
    if (match) {
      return (
        <Badge variant="light" size="sm" c="blue">
          {match[1]} - {match[2]}
        </Badge>
      );
    }
  }
  return (
    <Badge variant="light" size="sm" c="blue">
      {ctx}
    </Badge>
  );
};

export function ServerEditSoundsModal({
  opened,
  onClose,
  onAddSound,
}: Readonly<ServerEditSoundsModalProps>): React.JSX.Element {
  const [sounds, setSounds] = useState<SoundEdit[]>([]);
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [contextEdits, setContextEdits] = useState<Record<string, string[]>>({});
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [imageFileEdits, setImageFileEdits] = useState<Record<string, File | string>>({});
  const [currentImages, setCurrentImages] = useState<Record<string, string>>({});
  const [backgroundIntensity, setBackgroundIntensity] = useState<Record<string, string>>({});
  const [backgroundContext, setBackgroundContext] = useState<Record<string, string>>({});
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>('ambiance');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sounds based on search term
  const filteredSounds = sounds.filter(
    (sound) =>
      sound.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sound.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { play, stop, player } = useAudioPlayer();

  // For server editing, use only predefined contexts (no user-created contexts)
  // Ensure all contexts are strings to prevent MultiSelect errors
  const availableContexts = CONTEXT_OPTIONS[selectedCategory] || [];

  // Helper function to parse background context tuple
  const parseBackgroundContext = (context: string): { intensity: string; context: string } => {
    const tupleMatch = /^\(([^,]+),\s*([^)]+)\)$/.exec(context);
    if (tupleMatch) {
      return { intensity: tupleMatch[1].trim(), context: tupleMatch[2].trim() };
    }
    // Default to first intensity if no tuple format
    return { intensity: BACKGROUND_INTENSITY_OPTIONS[0], context: context };
  };

  // Helper function to format as tuple
  const formatBackgroundContext = (intensity: string, context: string): string => {
    return `(${intensity}, ${context})`;
  };

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
    if (!SOUNDS_TYPE[safeCategory]) {
      setLoading(false);
      return;
    }

    const endpoint = `/${SOUNDS_TYPE[safeCategory]}`;
    // For server editing, always fetch from main sounds table (no user-specific data)
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => processLoadedSounds(data, safeCategory))
      .catch((error: unknown) => {
        notifications.show({
          message: `Failed to load sounds: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: 'red',
        });
      })
      .finally(() => setLoading(false));

    const processLoadedSounds = (data: BackendSound[], _safeCategory: SoundCategory) => {
      // Map backend data format to frontend expected format
      const mappedSounds = data.map((sound: BackendSound) => ({
        id: String(sound.id || sound.filename),
        name: sound.display_name || sound.name || sound.filename,
        filename: sound.filename,
        category: _safeCategory,
        imageFile: sound.imageFile || sound.image_file,
        // For server editing, show only main playlist contexts (no user custom contexts)
        contexts: Array.isArray(sound.contexts) ? sound.contexts : [],
        credit: sound.credit || '',
        isEnabled: sound.isEnabled ?? true,
      }));

      // Extract current images for ambiance sounds
      const images: Record<string, string> = {};
      const initialBackgroundIntensity: Record<string, string> = {};
      const initialBackgroundContext: Record<string, string> = {};

      data.forEach((sound: BackendSound) => {
        if (sound.imageFile || sound.image_file) {
          images[sound.filename] = sound.imageFile || sound.image_file || '';
        }

        // Parse background contexts for initial values
        if (
          selectedCategory === 'background' &&
          Array.isArray(sound.contexts) &&
          sound.contexts.length > 0
        ) {
          const firstContext = sound.contexts[0];
          if (typeof firstContext === 'string') {
            const parsed = parseBackgroundContext(firstContext);
            initialBackgroundIntensity[sound.filename] = parsed.intensity;
            initialBackgroundContext[sound.filename] = parsed.context;
          }
        }
      });

      setCurrentImages(images);
      setBackgroundIntensity(initialBackgroundIntensity);
      setBackgroundContext(initialBackgroundContext);

      setSounds(mappedSounds);
    };
  }, [opened, selectedCategory]);

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
      const updatedSounds = prepareUpdatedSounds();
      const response = await sendUpdatedSoundsToServer(soundsType, updatedSounds);

      if (!response?.ok) {
        throw new Error('Failed to update main playlist');
      }

      notifications.show({ message: 'Server sounds updated successfully!', color: 'teal' });
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

  const prepareUpdatedSounds = (): Array<SoundEdit> => {
    return sounds.map((s) => {
      const finalContexts = getFinalContextsForSound(s);
      return {
        ...s,
        display_name: s.display_name || s.name || s.filename,
        isEnabled: edits[s.filename] ?? s.isEnabled ?? true,
        contexts: finalContexts,
        credit: creditEdits[s.filename] ?? s.credit ?? '',
        ...(imageFileEdits[s.filename] && typeof imageFileEdits[s.filename] === 'string' && { imageFile: imageFileEdits[s.filename] }),
        imageFile: undefined,
      };
    });
  };

  const getFinalContextsForSound = (sound: SoundEdit): string[] => {
    let finalContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];

    if (selectedCategory === 'background' && backgroundIntensity[sound.filename]) {
      const intensity = backgroundIntensity[sound.filename] || BACKGROUND_INTENSITY_OPTIONS[0];
      const context = backgroundContext[sound.filename] || '';
      finalContexts = [formatBackgroundContext(intensity, context)];
    }

    return finalContexts;
  };

  const sendUpdatedSoundsToServer = async (soundsType: string, updatedSounds: Array<SoundEdit>) => {
    return await fetch('/update-main-playlist', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundsType, sounds: updatedSounds }),
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

  const handleExistingContextChange = (value: string, soundFilename: string, currentContexts: string[]) => {
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

  const renderContextBadges = (soundFilename: string, currentContexts: string[]) => {
    return (
      <Group gap="xs" mt="xs">
        {currentContexts.map((ctx) => {
          const badgeKey = `${soundFilename}-${ctx}`;
          return (
            <Badge
              key={badgeKey}
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
          );
        })}
      </Group>
    );
  };

  const renderSoundEditSection = (sound: SoundEdit, currentContexts: string[], currentCredit: string): React.ReactNode => {
    const handleIntensityChange = (value: string) => {
      setBackgroundIntensity((prev) => ({
        ...prev,
        [sound.filename]: value || '',
      }));
    };

    const handleContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackgroundContext((prev) => ({
        ...prev,
        [sound.filename]: e.currentTarget.value,
      }));
    };

    const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreditEdits((prev) => ({
        ...prev,
        [sound.filename]: e.currentTarget.value,
      }));
    };

    const handleImageFileChange = (file: File | null) => {
      if (file) {
        setImageFileEdits((prev) => ({
          ...prev,
          [sound.filename]: file,
        }));
      }
    };

    return (
      <Stack gap="xs" mt="xs">
        {/* Background Music: Simple ComboBox + context */}
        {selectedCategory === 'background' ? (
          <>
            <Text size="xs" c="dimmed" mb="xs">
              Background Music Settings
            </Text>
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  Intensity
                </Text>
                <CustomCombobox
                  value={backgroundIntensity[sound.filename] || BACKGROUND_INTENSITY_OPTIONS[0]}
                  onChange={handleIntensityChange}
                  data={BACKGROUND_INTENSITY_OPTIONS}
                  placeholder="Select intensity"
                  width={150}
                />
              </Stack>

              <Stack gap="xs" style={{ flex: 2 }}>
                <Text size="xs" c="dimmed">
                  Context
                </Text>
                <TextInput
                  placeholder="additional context (optional)"
                  value={backgroundContext[sound.filename] || ''}
                  onChange={handleContextChange}
                  style={{ flex: 1 }}
                />
              </Stack>
            </Group>
          </>
        ) : (
          <>
            {/* Context Editing (for ambiance and soundboard) - Simplified with Combobox */}
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
          </>
        )}

        {/* Credit editing */}
        <TextInput
          placeholder="Credit (optional)"
          value={currentCredit}
          onChange={handleCreditChange}
          mt="xs"
        />

        {/* Image upload for ambiance sounds */}
        {selectedCategory === 'ambiance' && (
          <FileInput
            label="Upload image"
            placeholder="Select image file"
            accept="image/*"
            onChange={handleImageFileChange}
            mt="xs"
          />
        )}
      </Stack>
    );
  };

  const renderSoundItem = (sound: SoundEdit): React.ReactNode => {
    const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
    // Ensure all contexts are strings to prevent MultiSelect errors
    const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
    const currentCredit = creditEdits[sound.filename] ?? sound.credit ?? '';
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

        {renderSoundContexts(sound, currentContexts)}
        {isEditing && renderSoundEditSection(sound, currentContexts, currentCredit)}
        {renderSoundControls(sound)}
        {renderSoundImage(sound)}
        {renderSoundCreditText(sound)}
      </Stack>
    );
  };

  const renderSoundContexts = (sound: SoundEdit, currentContexts: string[]): React.ReactNode => {
    if (currentContexts.length === 0 && !(selectedCategory === 'background' && backgroundContext[sound.filename])) {
      return null;
    }
    return (
      <Group gap="xs" wrap="nowrap" align="center" mt="xs">
        <Text size="xs" c="dimmed">
          Contexts:
        </Text>
        {currentContexts.map((ctx) => (
          <ContextBadge key={ctx} ctx={ctx} selectedCategory={selectedCategory} />
        ))}
      </Group>
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

  const renderSoundImage = (sound: SoundEdit): React.ReactNode => {
    if (selectedCategory !== 'ambiance' || !currentImages[sound.filename]) {
      return null;
    }
    return (
      <Group gap="xs" mt="xs">
        <Text size="xs">Current Image:</Text>
        <img
          src={`/assets/images/backgrounds/${currentImages[sound.filename]}`}
          alt="Background"
          style={{ maxWidth: '100px', maxHeight: '60px', objectFit: 'cover' }}
        />
      </Group>
    );
  };

  const renderSoundCreditText = (sound: SoundEdit): React.ReactNode => {
    if (!sound.credit?.trim()) {
      return null;
    }
    return (
      <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
        {sound.credit}
      </Text>
    );
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Server Sounds (Admin)"
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
          onChange={(v) => {
            const newCategory = (v as SoundCategory) ?? 'ambiance';
            setSelectedCategory(newCategory);
          }}
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
          {onAddSound && (
            <Button variant="outline" color="green" onClick={onAddSound}>
              Add New Sound
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
