import React from 'react';
import { Group, Text, Tooltip } from '@mantine/core';
import { IconBrandSpotifyFilled, IconBrandSoundcloud, IconBrandDeezer } from '@tabler/icons-react';
import type { ExternalProvider } from '../../types/sound';

interface ProviderConfig {
  label: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}

const PROVIDER_CONFIG: Record<ExternalProvider, ProviderConfig> = {
  spotify: { label: 'Spotify', color: '#1DB954', Icon: IconBrandSpotifyFilled },
  deezer: { label: 'Deezer', color: '#EF5466', Icon: IconBrandDeezer },
  soundcloud: { label: 'SoundCloud', color: '#FF5500', Icon: IconBrandSoundcloud },
};

interface ExternalSoundBadgeProps {
  provider: ExternalProvider;
  /** compact = icon only with tooltip; default = icon + label */
  compact?: boolean;
  size?: number;
}

export function ExternalSoundBadge({
  provider,
  compact = false,
  size = 14,
}: Readonly<ExternalSoundBadgeProps>): React.JSX.Element {
  const { label, color, Icon } = PROVIDER_CONFIG[provider];

  const content = compact ? (
    <Icon size={size} color={color} />
  ) : (
    <Group gap={4} align="center" wrap="nowrap">
      <Icon size={size} color={color} />
      <Text size="xs" fw={600} style={{ color }}>
        {label}
      </Text>
    </Group>
  );

  if (compact) {
    return (
      <Tooltip label={`via ${label}`} withArrow position="top">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{content}</span>
      </Tooltip>
    );
  }

  return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{content}</span>;
}
