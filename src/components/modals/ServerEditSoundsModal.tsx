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
  FileInput,
} from '@mantine/core';
import { CustomCombobox } from '../audio/CustomCombobox';
import { ContextSelector } from '../audio/ContextSelector';
import { useState } from 'react';
import type React from 'react';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconSearch } from '@tabler/icons-react';
import type { SoundCategory } from '../../types/sound';
import {
  SOUNDS_TYPE,
  BACKGROUND_INTENSITY_OPTIONS,
  type SoundEdit,
  type BackendSound,
} from './editSoundsShared';
import { useEditSoundsBase } from '../../hooks/useEditSoundsBase';

interface ServerEditSoundsModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onAddSound?: () => void;
}

export function ServerEditSoundsModal({
  opened,
  onClose,
  onAddSound,
}: Readonly<ServerEditSoundsModalProps>): React.JSX.Element {
  const [saving, setSaving] = useState(false);
  const [imageFileEdits, setImageFileEdits] = useState<Record<string, File | string>>({});
  const [currentImages, setCurrentImages] = useState<Record<string, string>>({});
  const [backgroundIntensity, setBackgroundIntensity] = useState<Record<string, string>>({});
  const [backgroundContext, setBackgroundContext] = useState<Record<string, string>>({});

  const parseBackgroundContext = (context: string): { intensity: string; context: string } => {
    const m = /^\(([^,]+),\s*([^)]+)\)$/.exec(context);
    return m
      ? { intensity: m[1].trim(), context: m[2].trim() }
      : { intensity: BACKGROUND_INTENSITY_OPTIONS[0], context };
  };

  const formatBackgroundContext = (intensity: string, ctx: string) => `(${intensity}, ${ctx})`;

  const {
    sounds,
    edits,
    contextEdits,
    creditEdits,
    setCreditEdits,
    selectedCategory,
    setSelectedCategory,
    loading,
    searchTerm,
    setSearchTerm,
    editingSoundId,
    setEditingSoundId,
    currentlyPlaying,
    isPlaying,
    filteredSounds,
    handleToggle,
    handlePlayPause,
    handleStop,
    handleContextChange,
  } = useEditSoundsBase({
    opened,
    initialCategory: 'ambiance',
    buildFetchUrl: (cat) => `/${SOUNDS_TYPE[cat]}`,
    onSoundsLoaded: (_mapped, rawData) => {
      const images: Record<string, string> = {};
      const initIntensity: Record<string, string> = {};
      const initContext: Record<string, string> = {};

      (rawData as BackendSound[]).forEach((sound) => {
        if (sound.imageFile || sound.image_file) {
          images[sound.filename] = sound.imageFile || sound.image_file || '';
        }
        if (Array.isArray(sound.contexts) && sound.contexts.length > 0) {
          const first = sound.contexts[0];
          if (typeof first === 'string') {
            const parsed = parseBackgroundContext(first);
            initIntensity[sound.filename] = parsed.intensity;
            initContext[sound.filename] = parsed.context;
          }
        }
      });

      setCurrentImages(images);
      setBackgroundIntensity(initIntensity);
      setBackgroundContext(initContext);
    },
  });

  const getFinalContexts = (sound: SoundEdit): string[] => {
    if (selectedCategory === 'background' && backgroundIntensity[sound.filename]) {
      const intensity = backgroundIntensity[sound.filename] || BACKGROUND_INTENSITY_OPTIONS[0];
      const ctx = backgroundContext[sound.filename] || '';
      return [formatBackgroundContext(intensity, ctx)];
    }
    return contextEdits[sound.filename] ?? sound.contexts ?? [];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const soundsType = SOUNDS_TYPE[selectedCategory];
      const updatedSounds = sounds.map((s) => ({
        ...s,
        display_name: s.display_name || s.name || s.filename,
        isEnabled: edits[s.filename] ?? s.isEnabled ?? true,
        contexts: getFinalContexts(s),
        credit: creditEdits[s.filename] ?? s.credit ?? '',
        ...(imageFileEdits[s.filename] && typeof imageFileEdits[s.filename] === 'string'
          ? { imageFile: imageFileEdits[s.filename] }
          : {}),
      }));

      const response = await fetch('/update-main-playlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soundsType, sounds: updatedSounds }),
      });

      if (!response.ok) {
        throw new Error('Failed to update main playlist');
      }

      notifications.show({ message: 'Server sounds updated successfully!', color: 'teal' });
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

  const renderContextEditor = (sound: SoundEdit, currentContexts: string[]) => {
    if (selectedCategory === 'background') {
      return (
        <Stack gap="xs" mt="xs">
          <Text size="xs" c="dimmed">
            Background Music Settings
          </Text>
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="xs" c="dimmed">
                Intensity
              </Text>
              <CustomCombobox
                value={backgroundIntensity[sound.filename] || BACKGROUND_INTENSITY_OPTIONS[0]}
                onChange={(v) =>
                  setBackgroundIntensity((prev) => ({ ...prev, [sound.filename]: v || '' }))
                }
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
                onChange={(e) =>
                  setBackgroundContext((prev) => ({
                    ...prev,
                    [sound.filename]: e.currentTarget.value,
                  }))
                }
              />
            </Stack>
          </Group>
        </Stack>
      );
    }

    return (
      <ContextSelector
        value={currentContexts}
        onChange={(newContexts) => handleContextChange(sound.filename, newContexts)}
        category={selectedCategory}
      />
    );
  };

  const renderSoundItem = (sound: SoundEdit) => {
    const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
    const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
    const currentCredit = creditEdits[sound.filename] ?? sound.credit ?? '';
    const isEditing = editingSoundId === sound.id;

    return (
      <Stack
        key={sound.filename}
        gap="sm"
        style={{
          border: '1px solid var(--mantine-color-dark-4)',
          padding: '0.75rem',
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

        {/* Display current contexts outside of edit mode */}
        {currentContexts.length > 0 && !isEditing && (
          <Group gap="xs" wrap="wrap" align="center">
            <Text size="xs" c="dimmed">
              Contexts:
            </Text>
            {currentContexts.map((ctx) => (
              <Badge key={ctx} variant="light" size="sm" c="blue">
                {ctx}
              </Badge>
            ))}
          </Group>
        )}

        {isEditing && (
          <Stack gap="xs">
            {renderContextEditor(sound, currentContexts)}

            <TextInput
              placeholder="Credit (optional)"
              value={currentCredit}
              onChange={(e) =>
                setCreditEdits((prev) => ({ ...prev, [sound.filename]: e.currentTarget.value }))
              }
              mt="xs"
            />

            {selectedCategory === 'ambiance' && (
              <FileInput
                label="Upload image"
                placeholder="Select image file"
                accept="image/*"
                onChange={(file) => {
                  if (file) {
                    setImageFileEdits((prev) => ({ ...prev, [sound.filename]: file }));
                  }
                }}
                mt="xs"
              />
            )}
          </Stack>
        )}

        <Group gap="xs">
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

        {selectedCategory === 'ambiance' && currentImages[sound.filename] && (
          <Group gap="xs">
            <Text size="xs">Current Image:</Text>
            <img
              src={`/assets/images/backgrounds/${currentImages[sound.filename]}`}
              alt="Background"
              style={{ maxWidth: '100px', maxHeight: '60px', objectFit: 'cover' }}
            />
          </Group>
        )}

        {sound.credit?.trim() && (
          <Text size="xs" c="dimmed" fs="italic">
            {sound.credit}
          </Text>
        )}
      </Stack>
    );
  };

  const renderGrid = () => {
    if (loading) {
      return <Loader size="sm" />;
    }
    if (filteredSounds.length === 0) {
      return <Text c="dimmed">No sounds found matching your search.</Text>;
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          paddingRight: '0.25rem',
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
      size="90%"
      styles={{
        content: { display: 'flex', flexDirection: 'column', height: '90vh' },
        body: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          paddingBottom: '1rem',
        },
      }}
    >
      <Stack gap="sm" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <CustomCombobox
          value={selectedCategory}
          onChange={(v) => setSelectedCategory((v as SoundCategory) ?? 'ambiance')}
          data={['background', 'ambiance', 'soundboard']}
          placeholder="Select category"
        />
        <TextInput
          placeholder="Search sounds..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
        {renderGrid()}
        <Group gap="sm" mt="xs">
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
