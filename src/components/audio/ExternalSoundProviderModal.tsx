import React from 'react';
import {
  Modal,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Badge,
  Divider,
  Alert,
  Anchor,
} from '@mantine/core';
import {
  IconBrandSpotify,
  IconBrandSoundcloud,
  IconPlayerPlay,
  IconPlugConnected,
  IconPlugConnectedX,
} from '@tabler/icons-react';
import type { ExternalProvider } from '../../types/sound';
import type { useExternalSounds } from '../../hooks/useExternalSounds';

interface ProviderInfo {
  id: ExternalProvider;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  note?: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'spotify',
    label: 'Spotify',
    color: '#1DB954',
    icon: <IconBrandSpotify size={24} />,
    description: 'Stream full tracks with Spotify Premium, or 30s previews with a free account.',
    note: 'Premium required for full playback.',
  },
  {
    id: 'deezer',
    label: 'Deezer',
    color: '#EF5466',
    icon: <IconPlayerPlay size={24} />,
    description: 'Play full tracks with a Deezer Premium account, or 30s previews for free.',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    color: '#FF5500',
    icon: <IconBrandSoundcloud size={24} />,
    description: 'Free streaming for most tracks. Some tracks may require a SoundCloud account.',
  },
];

interface ExternalSoundProviderModalProps {
  opened: boolean;
  onClose: () => void;
  externalSoundsHook: ReturnType<typeof useExternalSounds>;
}

export function ExternalSoundProviderModal({
  opened,
  onClose,
  externalSoundsHook,
}: Readonly<ExternalSoundProviderModalProps>): React.JSX.Element {
  const { spotify, deezer, soundCloud, connectedProviders } = externalSoundsHook;

  const isConnected = (provider: ExternalProvider) => connectedProviders.includes(provider);

  const handleConnect = (provider: ExternalProvider) => {
    if (provider === 'spotify') spotify.connect().catch(() => {});
    else if (provider === 'deezer') deezer.connect();
    else if (provider === 'soundcloud') soundCloud.connect().catch(() => {});
  };

  const handleDisconnect = (provider: ExternalProvider) => {
    if (provider === 'spotify') spotify.disconnect();
    else if (provider === 'deezer') deezer.disconnect();
    else if (provider === 'soundcloud') soundCloud.disconnect();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={4} style={{ fontFamily: 'inherit' }}>
          External Sound Providers
        </Title>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Connect to a streaming service to add tracks to your background music playlist. Connected
          providers are stored in your browser session only.
        </Text>

        {connectedProviders.length > 0 && (
          <Alert color="green" variant="light" icon={<IconPlugConnected size={16} />}>
            Connected:{' '}
            {connectedProviders.map((p) => (
              <Badge key={p} size="sm" mx={4} variant="filled" color="green">
                {p}
              </Badge>
            ))}
          </Alert>
        )}

        <Divider />

        <Stack gap="sm">
          {PROVIDERS.map((provider) => {
            const connected = isConnected(provider.id);
            return (
              <Group
                key={provider.id}
                justify="space-between"
                align="flex-start"
                p="sm"
                style={{
                  border: `1px solid ${connected ? provider.color + '60' : 'var(--mantine-color-default-border)'}`,
                  borderRadius: 8,
                  background: connected ? `${provider.color}10` : undefined,
                }}
              >
                <Group gap="sm" align="flex-start" style={{ flex: 1 }}>
                  <span style={{ color: provider.color, marginTop: 2 }}>{provider.icon}</span>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Text fw={600} size="sm">
                        {provider.label}
                      </Text>
                      {connected && (
                        <Badge size="xs" color="green" variant="light">
                          Connected
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {provider.description}
                    </Text>
                    {provider.note && (
                      <Text size="xs" c="orange">
                        ⚠ {provider.note}
                      </Text>
                    )}
                  </Stack>
                </Group>

                {connected ? (
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconPlugConnectedX size={14} />}
                    onClick={() => handleDisconnect(provider.id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    style={{ color: provider.color, borderColor: provider.color + '40' }}
                    leftSection={<IconPlugConnected size={14} />}
                    loading={
                      (provider.id === 'spotify' && spotify.isConnecting) ||
                      (provider.id === 'soundcloud' && soundCloud.isConnecting)
                    }
                    onClick={() => handleConnect(provider.id)}
                  >
                    Connect
                  </Button>
                )}
              </Group>
            );
          })}
        </Stack>

        <Text size="xs" c="dimmed" ta="center">
          Provider credentials are never stored on our servers.{' '}
          <Anchor size="xs" href="#" onClick={(e) => e.preventDefault()}>
            Learn more
          </Anchor>
        </Text>
      </Stack>
    </Modal>
  );
}
