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
import { useState } from 'react';
import type React from 'react';
import { notifications } from '@mantine/notifications';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconX,
  IconSearch,
} from '@tabler/icons-react';
import type { SoundCategory } from '../../types/sound';
import { SOUNDS_TYPE, ENDPOINT } from './editSoundsShared';
import type { SoundEdit } from './editSoundsShared';
import { useEditSoundsBase } from '../../hooks/useEditSoundsBase';

interface EditSoundsModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly category: SoundCategory;
  readonly userId: string | null;
  readonly onSave?: () => void;
}

export function EditSoundsModal({
  opened,
  onClose,
  category,
  userId,
  onSave,
}: Readonly<EditSoundsModalProps>): React.JSX.Element {
  const [saving, setSaving] = useState(false);

  const {
    edits,
    contextEdits,
    creditEdits,
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
    availableContexts,
    handleToggle,
    handlePlayPause,
    handleStop,
    handleRemoveContext,
    addNewContext,
    handleNewContextKeyDown,
    handleExistingContextChange,
  } = useEditSoundsBase({
    opened,
    initialCategory: category || 'ambiance',
    buildFetchUrl: (cat) => (userId ? `${ENDPOINT[cat]}?userId=${userId}` : ENDPOINT[cat]),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const soundsType = SOUNDS_TYPE[selectedCategory];
      const changes: Array<{ filename: string; isEnabled?: boolean; contexts?: string[] }> = [];

      Object.entries(edits).forEach(([filename, isEnabled]) => {
        changes.push({ filename, isEnabled, contexts: contextEdits[filename] });
      });
      Object.entries(contextEdits).forEach(([filename, contexts]) => {
        if (!edits[filename]) {
          changes.push({ filename, contexts });
        }
      });

      if (changes.length > 0) {
        const response = await fetch('/update-user-sounds-batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, soundsType, changes }),
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

  const renderContextEditor = (sound: SoundEdit, currentContexts: string[]) => (
    <Stack gap="xs" mt="xs">
      <Group gap="xs" align="flex-end">
        <TextInput
          placeholder="Add new context..."
          style={{ flex: 1 }}
          onKeyDown={(e) => handleNewContextKeyDown(e, sound.filename, currentContexts)}
        />
        <Button
          size="xs"
          onClick={() => {
            const input = document.querySelector(
              'input[placeholder="Add new context..."]'
            ) as HTMLInputElement;
            const v = input?.value?.trim();
            if (v && !currentContexts.includes(v)) {
              addNewContext(sound.filename, v);
              input.value = '';
            }
          }}
        >
          Add
        </Button>
      </Group>
      <CustomCombobox
        value=""
        onChange={(value) => handleExistingContextChange(value, sound.filename, currentContexts)}
        data={availableContexts}
        placeholder="Add existing context"
        width={200}
      />
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
                    handleRemoveContext(sound.filename, ctx);
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
  );

  const renderSoundItem = (sound: SoundEdit) => {
    const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
    const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
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

        {isEditing && renderContextEditor(sound, currentContexts)}

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
      title="Edit My Sounds"
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
        </Group>
      </Stack>
    </Modal>
  );
}
