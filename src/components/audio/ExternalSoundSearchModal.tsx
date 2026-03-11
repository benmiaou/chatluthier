import React, { useCallback, useState } from 'react';
import {
  Modal,
  Stack,
  Title,
  Text,
  TextInput,
  Button,
  Group,
  Image,
  ScrollArea,
  Alert,
  Select,
  Badge,
  ActionIcon,
  Loader,
  Divider,
} from '@mantine/core';
import { IconSearch, IconPlus, IconAlertCircle, IconX, IconPlayerPlay } from '@tabler/icons-react';
import type { ExternalProvider } from '../../types/sound';
import type { useExternalSounds } from '../../hooks/useExternalSounds';
import { ExternalSoundBadge } from './ExternalSoundBadge';

const INTENSITIES = ['calm', 'dynamic', 'intense'] as const;
type Intensity = (typeof INTENSITIES)[number];

interface SearchResult {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnailUrl: string;
  previewUrl: string;
  provider: ExternalProvider;
}

interface ExternalSoundSearchModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string | null;
  externalSoundsHook: ReturnType<typeof useExternalSounds>;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ExternalSoundSearchModal({
  opened,
  onClose,
  userId,
  externalSoundsHook,
}: Readonly<ExternalSoundSearchModalProps>): React.JSX.Element {
  const { connectedProviders, spotify, deezer, soundCloud, addExternalSound } = externalSoundsHook;

  const [selectedProvider, setSelectedProvider] = useState<ExternalProvider | null>(
    connectedProviders[0] ?? null
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Context selection per result
  const [selectedContexts, setSelectedContexts] = useState<Record<string, [Intensity, string][]>>(
    {}
  );
  const [newScene, setNewScene] = useState<Record<string, string>>({});
  const [newIntensity, setNewIntensity] = useState<Record<string, Intensity>>({});

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !selectedProvider) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      let searchResults: SearchResult[] = [];

      if (selectedProvider === 'spotify') {
        const token = spotify.token;
        if (!token) {
          throw new Error('Not connected to Spotify');
        }
        const { spotifySearch } = await import('../../services/spotifyService');
        searchResults = (await spotifySearch(query, token.access_token)) as SearchResult[];
      } else if (selectedProvider === 'deezer') {
        searchResults = await deezer.search(query);
      } else if (selectedProvider === 'soundcloud') {
        searchResults = await soundCloud.search(query);
      }

      setResults(searchResults);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedProvider, spotify, deezer, soundCloud]);

  const addContext = (trackId: string) => {
    const intensity = newIntensity[trackId] ?? 'calm';
    const scene = (newScene[trackId] ?? '').trim();
    if (!scene) {
      return;
    }

    setSelectedContexts((prev) => ({
      ...prev,
      [trackId]: [...(prev[trackId] ?? []), [intensity, scene]],
    }));
    setNewScene((prev) => ({ ...prev, [trackId]: '' }));
  };

  const removeContext = (trackId: string, index: number) => {
    setSelectedContexts((prev) => ({
      ...prev,
      [trackId]: (prev[trackId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleAdd = useCallback(
    async (result: SearchResult) => {
      if (!userId || !selectedProvider) {
        return;
      }

      setAddingId(result.trackId);
      try {
        await addExternalSound({
          userId,
          provider: selectedProvider,
          trackId: result.trackId,
          artist: result.artist,
          title: result.title,
          album: result.album,
          durationMs: result.durationMs,
          thumbnailUrl: result.thumbnailUrl,
          previewUrl: result.previewUrl,
          contexts: selectedContexts[result.trackId] ?? [],
        });
        // Remove from results to give visual feedback
        setResults((prev) => prev.filter((r) => r.trackId !== result.trackId));
      } catch {
        // error already handled in hook
      } finally {
        setAddingId(null);
      }
    },
    [userId, selectedProvider, addExternalSound, selectedContexts]
  );

  const providerOptions = connectedProviders.map((p) => ({
    value: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={4} style={{ fontFamily: 'inherit' }}>
          Add External Sound
        </Title>
      }
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {connectedProviders.length === 0 ? (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            No providers connected. Close this modal and connect a provider first.
          </Alert>
        ) : (
          <>
            <Group gap="sm" align="flex-end">
              <Select
                label="Provider"
                data={providerOptions}
                value={selectedProvider}
                onChange={(v) => setSelectedProvider(v as ExternalProvider)}
                style={{ width: 160 }}
              />
              <TextInput
                label="Search"
                placeholder="Artist, track or album..."
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={isSearching ? <Loader size={14} /> : <IconSearch size={14} />}
                onClick={handleSearch}
                disabled={!query.trim() || !selectedProvider || isSearching}
              >
                Search
              </Button>
            </Group>

            {searchError && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                {searchError}
              </Alert>
            )}

            {results.length > 0 && (
              <Stack gap="xs">
                <Divider label={`${results.length} results`} labelPosition="left" />
                {results.map((result) => (
                  <Stack
                    key={result.trackId}
                    gap="xs"
                    p="sm"
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 8,
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      {result.thumbnailUrl && (
                        <Image
                          src={result.thumbnailUrl}
                          alt={result.title}
                          w={48}
                          h={48}
                          radius="sm"
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs">
                          <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
                            {result.title}
                          </Text>
                          <ExternalSoundBadge provider={result.provider} compact />
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                          {result.artist}
                          {result.album ? ` · ${result.album}` : ''}
                        </Text>
                        {result.durationMs > 0 && (
                          <Text size="xs" c="dimmed">
                            {formatDuration(result.durationMs)}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        size="xs"
                        leftSection={
                          addingId === result.trackId ? (
                            <Loader size={12} />
                          ) : (
                            <IconPlus size={14} />
                          )
                        }
                        disabled={addingId === result.trackId}
                        onClick={() => handleAdd(result)}
                      >
                        Add
                      </Button>
                    </Group>

                    {/* Context assignment */}
                    <Stack gap="xs" pl={60}>
                      {(selectedContexts[result.trackId] ?? []).map(([intensity, scene], i) => (
                        <Badge
                          key={`${intensity}-${scene}-${i}`}
                          variant="light"
                          rightSection={
                            <ActionIcon
                              size={12}
                              variant="transparent"
                              onClick={() => removeContext(result.trackId, i)}
                            >
                              <IconX size={10} />
                            </ActionIcon>
                          }
                        >
                          {intensity} · {scene}
                        </Badge>
                      ))}

                      <Group gap="xs">
                        <Select
                          size="xs"
                          placeholder="Intensity"
                          data={INTENSITIES}
                          value={newIntensity[result.trackId] ?? 'calm'}
                          onChange={(v) =>
                            setNewIntensity((prev) => ({
                              ...prev,
                              [result.trackId]: (v as Intensity) ?? 'calm',
                            }))
                          }
                          style={{ width: 110 }}
                        />
                        <TextInput
                          size="xs"
                          placeholder="Scene (e.g. city)"
                          value={newScene[result.trackId] ?? ''}
                          onChange={(e) =>
                            setNewScene((prev) => ({
                              ...prev,
                              [result.trackId]: e.currentTarget.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addContext(result.trackId)}
                          style={{ flex: 1 }}
                        />
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => addContext(result.trackId)}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      </Group>
                    </Stack>

                    {/* 30s preview button */}
                    {result.previewUrl && (
                      <Group gap="xs" pl={60}>
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconPlayerPlay size={12} />}
                          onClick={() => {
                            const audio = new Audio(result.previewUrl);
                            audio.volume = 0.5;
                            audio.play().catch(() => {});
                          }}
                        >
                          Preview (30s)
                        </Button>
                      </Group>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
}
