import { Button, Modal, Select, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

interface RequestSoundModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string | null;
}

export function RequestSoundModal({ opened, onClose, userId: _userId }: RequestSoundModalProps) {
  const [soundName, setSoundName] = useState('');
  const [category, setCategory] = useState('soundboard');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!soundName) {
      notifications.show({ message: 'Sound name is required', color: 'red' });
      return;
    }
    setLoading(true);
    try {
      await fetch('/request-sound', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, file: soundName, contexts: [] }),
      });
      notifications.show({ message: 'Request submitted!', color: 'teal' });
      setSoundName('');
      setCategory('soundboard');
      onClose();
    } catch {
      notifications.show({ message: 'Failed to submit request', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Request a Sound">
      <Stack gap="sm">
        <TextInput
          label="Sound name / description"
          placeholder="e.g. tavern ambiance, thunder crack..."
          value={soundName}
          onChange={(e) => setSoundName(e.currentTarget.value)}
          required
        />
        <Select
          label="Category"
          value={category}
          onChange={(v) => setCategory(v ?? 'soundboard')}
          data={[
            { value: 'backgroundMusic', label: 'Background Music' },
            { value: 'ambianceSounds', label: 'Ambiance' },
            { value: 'soundboard', label: 'Soundboard' },
          ]}
        />
        <Button onClick={handleSubmit} loading={loading}>
          Submit Request
        </Button>
      </Stack>
    </Modal>
  );
}
