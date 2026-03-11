import React from 'react';
import { Badge, Tooltip } from '@mantine/core';
import type { ExternalProvider } from '../../types/sound';

const PROVIDER_CONFIG: Record<
  ExternalProvider,
  { label: string; color: string; bg: string }
> = {
  spotify: { label: 'Spotify', color: '#1DB954', bg: '#1DB95420' },
  deezer: { label: 'Deezer', color: '#EF5466', bg: '#EF546620' },
  soundcloud: { label: 'SoundCloud', color: '#FF5500', bg: '#FF550020' },
};

interface ExternalSoundBadgeProps {
  provider: ExternalProvider;
  /** If true, show the full provider name; otherwise show a compact version */
  compact?: boolean;
}

export function ExternalSoundBadge({
  provider,
  compact = false,
}: Readonly<ExternalSoundBadgeProps>): React.JSX.Element {
  const cfg = PROVIDER_CONFIG[provider];

  const badge = (
    <Badge
      size={compact ? 'xs' : 'sm'}
      variant="light"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        fontWeight: 700,
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {compact ? cfg.label[0] : cfg.label}
    </Badge>
  );

  if (compact) {
    return <Tooltip label={cfg.label} withArrow position="top">{badge}</Tooltip>;
  }

  return badge;
}
