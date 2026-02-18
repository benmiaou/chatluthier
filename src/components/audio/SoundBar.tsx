import { ActionIcon, Box, Text } from '@mantine/core';
import { IconTrash, IconVolumeOff } from '@tabler/icons-react';
import { useRef } from 'react';
import type { AmbianceBar } from '../../hooks/useAmbianceSounds';

const IMAGE_BASE = '/assets/images/backgrounds/';
const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

interface SoundBarProps {
  bar: AmbianceBar;
  onChange: (filename: string, volume: number) => void;
  isAdmin?: boolean;
  onDelete?: (filename: string) => void;
}

export function SoundBar({ bar, onChange, isAdmin, onDelete }: SoundBarProps) {
  const imgSrc = bar.sound.imageFile ? `${IMAGE_BASE}${bar.sound.imageFile}` : FALLBACK;
  const isActive = bar.volume > 0;
  const dragging = useRef(false);

  const volumeFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(bar.sound.filename, volumeFromPointer(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    onChange(bar.sound.filename, volumeFromPointer(e));
  };

  const handlePointerUp = () => { dragging.current = false; };

  return (
    <Box
      style={{ position: 'relative', width: 52, height: 52, borderRadius: 6, overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', flexShrink: 0 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Background image */}
      <img
        src={imgSrc}
        alt={bar.sound.name}
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
      />

      {/* Dark base overlay */}
      <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />

      {/* Volume fill left→right */}
      <Box
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${bar.volume * 100}%`,
          background: 'rgba(146,58,58,0.55)',
          transition: 'width 0.05s linear',
          pointerEvents: 'none',
        }}
      />

      {/* Volume line */}
      {isActive && (
        <Box style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${bar.volume * 100}%`,
          width: 2,
          background: 'rgba(220,100,100,0.9)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Name label at bottom */}
      <Box style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '2px 3px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        pointerEvents: 'none',
      }}>
        <Text size="xs" c="white" fw={500} truncate style={{ fontSize: 9, lineHeight: 1.2 }}>
          {bar.sound.name}
        </Text>
      </Box>

      {/* Mute icon top-left */}
      {!isActive && (
        <Box style={{ position: 'absolute', top: 2, left: 2, pointerEvents: 'none' }}>
          <IconVolumeOff size={10} color="rgba(255,255,255,0.5)" />
        </Box>
      )}

      {/* Admin delete */}
      {isAdmin && (
        <ActionIcon
          size={14}
          variant="filled"
          color="red"
          style={{ position: 'absolute', top: 2, right: 2 }}
          onClick={(e) => { e.stopPropagation(); onDelete?.(bar.sound.filename); }}
        >
          <IconTrash size={9} />
        </ActionIcon>
      )}
    </Box>
  );
}
