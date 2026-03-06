import { Button, FileInput, Modal, Select, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import type React from 'react';
import { notifications } from '@mantine/notifications';

interface AddSoundModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onAdded: () => void;
}

export function AddSoundModal({ opened, onClose, onAdded }: AddSoundModalProps): React.JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('soundboard');
  const [credit, setCredit] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !displayName) {
      notifications.show({ message: 'Name and file are required', color: 'red' });
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('display_name', displayName);
    formData.append('category', category);
    formData.append('credit', credit);
    formData.append('contexts', JSON.stringify([]));

    try {
      await fetch('/add-sound', { method: 'POST', body: formData, credentials: 'include' });
      notifications.show({ message: 'Sound added successfully', color: 'teal' });
      setDisplayName('');
      setCredit('');
      setFile(null);
      onAdded();
      onClose();
    } catch {
      notifications.show({ message: 'Failed to upload sound', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add New Sound">
      <Stack gap="sm">
        <TextInput
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
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
          required
        />
        <TextInput
          label="Credit"
          value={credit}
          onChange={(e) => setCredit(e.currentTarget.value)}
        />
        <FileInput label="Audio File" accept="audio/*" value={file} onChange={setFile} required />
        <Button onClick={handleSubmit} loading={loading}>
          Upload
        </Button>
      </Stack>
    </Modal>
  );
}
