import { Button, Loader, Modal, Stack, Switch, Text, Group, TextInput, Badge } from '@mantine/core';
import { CustomCombobox } from '../audio/CustomCombobox';
import { ContextSelector } from '../audio/ContextSelector';
import { useState } from 'react';
import type React from 'react';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconSearch } from '@tabler/icons-react';
import type { SoundCategory } from '../../types/sound';
import { SOUNDS_TYPE, ENDPOINT, BACKGROUND_INTENSITY_OPTIONS } from './editSoundsShared';
import type { SoundEdit, BackendSound } from './editSoundsShared';
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
  // Per-sound list of [intensity, context] tuples (loaded from server, updated by user)
  const [backgroundTuples, setBackgroundTuples] = useState<Record<string, [string, string][]>>({});
  // Only filenames the user actually edited — used to avoid saving untouched sounds
  const [dirtyFilenames, setDirtyFilenames] = useState<Set<string>>(new Set());

  const parseRawContexts = (contexts: unknown[]): [string, string][] => {
    return contexts.flatMap((c) => {
      if (Array.isArray(c) && c.length >= 2) {
        return [[String(c[0]), String(c[1])] as [string, string]];
      }
      if (typeof c === 'string') {
        const m = /^\(([^,]+),\s*([^)]+)\)$/.exec(c);
        if (m) {
          return [[m[1].trim(), m[2].trim()] as [string, string]];
        }
      }
      return [];
    });
  };

  const {
    edits,
    contextEdits,
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
    initialCategory: category || 'ambiance',
    buildFetchUrl: (cat) => (userId ? `${ENDPOINT[cat]}?userId=${userId}` : ENDPOINT[cat]),
    onSoundsLoaded: (_mapped, rawData) => {
      const initTuples: Record<string, [string, string][]> = {};
      (rawData as BackendSound[]).forEach((sound) => {
        if (Array.isArray(sound.contexts) && sound.contexts.length > 0) {
          const parsed = parseRawContexts(sound.contexts);
          if (parsed.length > 0) {
            initTuples[sound.filename] = parsed;
          }
        }
      });
      setBackgroundTuples(initTuples);
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const soundsType = SOUNDS_TYPE[selectedCategory];
      const changes: Array<{ filename: string; isEnabled?: boolean; contexts?: unknown }> = [];

      if (selectedCategory === 'background') {
        // Only save sounds the user actually changed (toggled or edited contexts)
        const dirtySet = new Set([...Object.keys(edits), ...dirtyFilenames]);
        dirtySet.forEach((filename) => {
          const tuples = backgroundTuples[filename];
          changes.push({
            filename,
            ...(edits[filename] !== undefined ? { isEnabled: edits[filename] } : {}),
            ...(tuples ? { contexts: tuples } : {}),
          });
        });
      } else {
        Object.entries(edits).forEach(([filename, isEnabled]) => {
          changes.push({ filename, isEnabled, contexts: contextEdits[filename] });
        });
        Object.entries(contextEdits).forEach(([filename, contexts]) => {
          if (!edits[filename]) {
            changes.push({ filename, contexts });
          }
        });
      }

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
      window.dispatchEvent(new Event('soundsUpdated'));
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

  const renderContextEditor = (sound: SoundEdit) => {
    if (selectedCategory === 'background') {
      const tuples: [string, string][] =
        backgroundTuples[sound.filename] ?? parseRawContexts(sound.contexts ?? []);
      const setTuples = (updated: [string, string][]) => {
        setBackgroundTuples((prev) => ({ ...prev, [sound.filename]: updated }));
        setDirtyFilenames((prev) => new Set(prev).add(sound.filename));
      };

      return (
        <Stack gap="xs" mt="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Background contexts
          </Text>
          {tuples.map(([intensity, ctx], i) => (
            <Group key={i} gap="xs" align="flex-end" wrap="nowrap">
              <CustomCombobox
                value={intensity || BACKGROUND_INTENSITY_OPTIONS[0]}
                onChange={(v) => {
                  const next = tuples.map((t, j): [string, string] =>
                    j === i ? [v || '', t[1]] : t
                  );
                  setTuples(next);
                }}
                data={BACKGROUND_INTENSITY_OPTIONS}
                placeholder="Intensity"
                width={140}
              />
              <TextInput
                placeholder="context"
                value={ctx}
                style={{ flex: 1 }}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  const next = tuples.map((t, j): [string, string] => (j === i ? [t[0], val] : t));
                  setTuples(next);
                }}
              />
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => setTuples(tuples.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            </Group>
          ))}
          <Button
            size="xs"
            variant="light"
            onClick={() => setTuples([...tuples, [BACKGROUND_INTENSITY_OPTIONS[0], '']])}
          >
            + Add context
          </Button>
        </Stack>
      );
    }
    const currentContexts = contextEdits[sound.filename] ?? sound.contexts ?? [];
    return (
      <ContextSelector
        value={currentContexts as string[]}
        onChange={(newContexts) => handleContextChange(sound.filename, newContexts)}
        category={selectedCategory}
      />
    );
  };

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

        {isEditing && renderContextEditor(sound)}

        {!isEditing &&
          selectedCategory === 'background' &&
          (() => {
            const tuples =
              backgroundTuples[sound.filename] ?? parseRawContexts(sound.contexts ?? []);
            return tuples.length > 0 ? (
              <Group gap="xs">
                {tuples.map(([intensity, ctx], i) => (
                  <Badge key={i} size="xs" variant="light" color="gray">
                    {intensity}, {ctx}
                  </Badge>
                ))}
              </Group>
            ) : null;
          })()}

        {!isEditing && selectedCategory !== 'background' && currentContexts.length > 0 && (
          <Group gap="xs">
            {currentContexts.map((ctx, i) => {
              const label = Array.isArray(ctx) ? (ctx as string[]).join(', ') : String(ctx);
              return (
                <Badge key={i} size="xs" variant="light" color="gray">
                  {label}
                </Badge>
              );
            })}
          </Group>
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

        {sound.credit?.trim() && (
          <Text
            size="xs"
            c="dimmed"
            fs="italic"
            dangerouslySetInnerHTML={{ __html: sound.credit }}
          />
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
          size="md"
          width="100%"
        />
        <TextInput
          placeholder="Search sounds..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
        {renderGrid()}
        <Group gap="sm" mt="xs">
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
