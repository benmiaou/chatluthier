import {
  Button,
  Modal,
  Stack,
  TextInput,
  Text,
  Anchor,
  List,
  MultiSelect,
  Group,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { CustomCombobox } from '../audio/CustomCombobox';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import React from 'react';

interface RequestSoundModalProps {
  opened: boolean;
  onClose: () => void;
  userId?: string | null;
}

export function RequestSoundModal({
  opened,
  onClose,
  _userId,
}: RequestSoundModalProps): React.JSX.Element {
  const [soundName, setSoundName] = useState('');
  const [soundUrl, setSoundUrl] = useState('');
  const [category, setCategory] = useState('soundboard');
  const [contexts, setContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Mapping between display names and API values
  const categoryMapping: Record<string, string> = {
    'Background Music': 'backgroundMusic',
    Ambiance: 'ambianceSounds',
    Soundboard: 'soundboard',
  };

  // Get display name from API value
  const getCategoryDisplayName = (apiValue: string): string => {
    return (
      Object.entries(categoryMapping).find(([_, value]) => value === apiValue)?.[0] || 'Soundboard'
    );
  };

  const handleSubmit = async () => {
    if (!soundName) {
      notifications.show({ message: 'Sound name is required', color: 'red' });
      return;
    }
    if (!soundUrl) {
      notifications.show({ message: 'Sound URL is required', color: 'red' });
      return;
    }
    if (!soundUrl.startsWith('http')) {
      notifications.show({
        message: 'Please enter a valid URL starting with http or https',
        color: 'red',
      });
      return;
    }
    setLoading(true);
    try {
      await fetch('/request-sound', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          file: soundName,
          contexts: contexts,
          soundUrl: soundUrl,
        }),
      });
      notifications.show({ message: 'Request submitted!', color: 'teal' });
      setSoundName('');
      setSoundUrl('');
      setCategory('soundboard');
      onClose();
    } catch {
      notifications.show({ message: 'Failed to submit request', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Request a Sound" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Only sounds with{' '}
          <Anchor href="https://creativecommons.org/" target="_blank" rel="noopener noreferrer">
            Creative Commons licenses
          </Anchor>{' '}
          can be added to this platform.
        </Text>

        <TextInput
          label="Sound name / description"
          placeholder="e.g. tavern ambiance, thunder crack..."
          value={soundName}
          onChange={(e) => setSoundName(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Sound URL (direct link to audio file)"
          placeholder=""
          value={soundUrl}
          onChange={(e) => setSoundUrl(e.currentTarget.value)}
          required
        />

        <CustomCombobox
          label="Category"
          value={getCategoryDisplayName(category)}
          onChange={(v) => setCategory(categoryMapping[v] || 'soundboard')}
          data={['Background Music', 'Ambiance', 'Soundboard']}
          placeholder="Select category"
          width="100%"
        />

        <MultiSelect
          label="Contexts (optional) - Describe when this sound should be used"
          placeholder="Search or add contexts..."
          value={contexts}
          onChange={setContexts}
          data={[
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
            ...contexts,
          ]}
          searchable
          clearable
          creatable
          getCreateLabel={(query) => `+ Add "${query}"`}
          onCreate={(query) => {
            const newContext = query.trim();
            if (newContext && !contexts.includes(newContext)) {
              setContexts([...contexts, newContext]);
              return newContext;
            }
            return query;
          }}
          createLabel="Add custom context"
          maxDropdownHeight={200}
          withinPortal={true}
        />

        {contexts.length > 0 && (
          <div
            style={{
              maxHeight: 80,
              overflowY: 'auto',
              padding: '0.5rem',
              border: '1px solid var(--mantine-color-dark-4)',
              borderRadius: 'var(--mantine-radius-sm)',
              marginTop: '0.5rem',
            }}
          >
            <Text size="sm" fw={500} mb="xs">
              Selected Contexts ({contexts.length}):
            </Text>
            <Group gap="xs" wrap="wrap">
              {contexts.map((context, index) => (
                <Badge
                  key={`${context}-${index}`}
                  variant="light"
                  size="sm"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContexts(contexts.filter((c) => c !== context));
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  }
                >
                  {context}
                </Badge>
              ))}
            </Group>
          </div>
        )}

        <Text size="sm" fw={500} mt="sm">
          Recommended sources for Creative Commons sounds:
        </Text>
        <List size="sm" withPadding>
          <List.Item>
            <Anchor href="https://openverse.org/" target="_blank" rel="noopener noreferrer">
              Openverse
            </Anchor>{' '}
            - Large collection of CC-licensed media
          </List.Item>
          <List.Item>
            <Anchor href="https://pixabay.com/fr/" target="_blank" rel="noopener noreferrer">
              Pixabay
            </Anchor>{' '}
            - Free images, videos, and music
          </List.Item>
          <List.Item>
            <Anchor href="https://freesound.org/" target="_blank" rel="noopener noreferrer">
              Freesound
            </Anchor>{' '}
            - Collaborative database of CC-licensed sounds
          </List.Item>
          <List.Item>
            <Anchor href="https://www.jamendo.com/start" target="_blank" rel="noopener noreferrer">
              Jamendo
            </Anchor>{' '}
            - Free music platform
          </List.Item>
        </List>

        <Button onClick={handleSubmit} loading={loading} mt="md">
          Submit Request
        </Button>
      </Stack>
    </Modal>
  );
}
