import { Button, Loader, Modal, Select, Stack, Switch, Text } from '@mantine/core';
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

interface EditSoundsModalProps {
  opened: boolean;
  onClose: () => void;
  category: SoundCategory;
  isAdmin: boolean;
  userId: string | null;
  onSave?: () => void;
}

export function EditSoundsModal({
  opened,
  onClose,
  category,
  isAdmin,
  userId,
  onSave,
}: EditSoundsModalProps) {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>(category);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setEdits({});
    setLoading(true);
    const url = userId
      ? `${ENDPOINT[selectedCategory]}?userId=${userId}`
      : ENDPOINT[selectedCategory];
    fetch(url)
      .then((r) => r.json())
      .then((data: Sound[]) => setSounds(data ?? []))
      .catch(() => notifications.show({ message: 'Failed to load sounds', color: 'red' }))
      .finally(() => setLoading(false));
  }, [opened, selectedCategory, userId]);

  const handleToggle = (filename: string, enabled: boolean) => {
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
        ) : (
          <Stack gap="xs" mah={400} style={{ overflowY: 'auto' }}>
            {sounds.map((sound) => {
              const enabled = edits[sound.filename] ?? sound.isEnabled ?? true;
              return (
                <Stack key={sound.filename} gap={2}>
                  <Switch
                    label={sound.name}
                    checked={enabled}
                    onChange={(e) => handleToggle(sound.filename, e.currentTarget.checked)}
                    size="sm"
                  />
                  <Text size="xs" c="dimmed">{sound.filename}</Text>
                </Stack>
              );
            })}
          </Stack>
        )}
        <Button mt="sm" onClick={handleSave} loading={saving} disabled={Object.keys(edits).length === 0}>
          Save Changes
        </Button>
      </Stack>
    </Modal>
  );
}
