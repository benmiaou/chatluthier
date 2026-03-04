import { Badge, Button, Group, Paper, Select, Stack, Text } from '@mantine/core';
import {
  IconBrandSpotify,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';

interface SpotifyPlayerProps {
  onAuthChange?: (connected: boolean) => void;
}

export function SpotifyPlayer({ onAuthChange }: Readonly<SpotifyPlayerProps>): React.JSX.Element {
=======
interface SpotifyPlayerProps {
  onAuthChange?: (connected: boolean) => void;
}

export function SpotifyPlayer({ onAuthChange }: Readonly<SpotifyPlayerProps>): React.JSX.Element {

export function SpotifyPlayer({ onAuthChange }: SpotifyPlayerProps): React.JSX.Element {
  const {
    isAuthenticated,
    isConnecting,
    playbackState,
    playlists,
    connect,
    disconnect,
    play,
    pause,
    next,
  } = useSpotify();

  useEffect(() => {
    onAuthChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthChange]);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconBrandSpotify size={18} color="#1DB954" />
            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
              Spotify
            </Text>
          </Group>
          {isAuthenticated && (
            <Badge color="green" size="xs">
              Connected
            </Badge>
          )}
        </Group>

        {isAuthenticated ? (
          <Stack gap="xs">
            {/* Current track */}
            {playbackState?.item && (
              <Stack gap={2}>
                <Text size="xs" fw={500} truncate>
                  {playbackState.item.name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {playbackState.item.artists.map((a) => a.name).join(', ')}
                </Text>
              </Stack>
            )}

            {/* Playback controls */}
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  playbackState?.is_playing ? (
                    <IconPlayerPause size={14} />
                  ) : (
                    <IconPlayerPlay size={14} />
                  )
                }
                onClick={() => (playbackState?.is_playing ? pause() : play())}
              >
                {playbackState?.is_playing ? 'Pause' : 'Play'}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlayerSkipForward size={14} />}
                onClick={next}
              >
                Next
              </Button>
            </Group>

            {/* Playlist selector */}
            {playlists.length > 0 && (
              <Select
                size="xs"
                placeholder="Play a playlist…"
                data={playlists.map((p) => ({ value: p.uri, label: p.name }))}
                onChange={(uri) => uri && play(uri)}
              />
            )}

            <Button size="xs" variant="subtle" color="red" onClick={disconnect}>
              Disconnect
            </Button>
          </Stack>
        ) : (
          <Button
            size="xs"
            leftSection={<IconBrandSpotify size={16} />}
            color="green"
            onClick={connect}
            loading={isConnecting}
          >
            Connect to Spotify
          </Button>
        )}
          <Stack gap="xs">
            {/* Current track */}
            {playbackState?.item && (
              <Stack gap={2}>
                <Text size="xs" fw={500} truncate>
                  {playbackState.item.name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {playbackState.item.artists.map((a) => a.name).join(', ')}
                </Text>
              </Stack>
            )}

            {/* Playback controls */}
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                leftSection={
                  playbackState?.is_playing ? (
                    <IconPlayerPause size={14} />
                  ) : (
                    <IconPlayerPlay size={14} />
                  )
                }
                onClick={() => (playbackState?.is_playing ? pause() : play())}
              >
                {playbackState?.is_playing ? 'Pause' : 'Play'}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlayerSkipForward size={14} />}
                onClick={next}
              >
                Next
              </Button>
            </Group>

            {/* Playlist selector */}
            {playlists.length > 0 && (
              <Select
                size="xs"
                placeholder="Play a playlist…"
                data={playlists.map((p) => ({ value: p.uri, label: p.name }))}
                onChange={(uri) => uri && play(uri)}
              />
            )}

            <Button size="xs" variant="subtle" color="red" onClick={disconnect}>
              Disconnect
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
