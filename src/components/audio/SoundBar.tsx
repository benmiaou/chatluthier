import { ActionIcon, Box, Text } from '@mantine/core';
import { IconTrash, IconVolume, IconVolumeOff } from '@tabler/icons-react';
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

  /** Convert a pointer Y position within the card to a 0–1 volume value */
  const volumeFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = 1 - (e.clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(1, pct));
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

  const handlePointerUp = () => {
    dragging.current = false;
  };

  /** Single click with no drag toggles between 0 and 0.7 */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = 1 - (e.clientY - rect.top) / rect.height;
    const newVol = Math.max(0, Math.min(1, pct));
    // If click is very close to current volume level, treat as toggle
    if (Math.abs(newVol - bar.volume) < 0.05) {
      onChange(bar.sound.filename, isActive ? 0 : 0.7);
    } else {
      onChange(bar.sound.filename, newVol);
    }
  };

  return (
    <Box
      style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'ns-resize', userSelect: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
    >
      {/* Background image */}
      <img
        src={imgSrc}
        alt={bar.sound.name}
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
      />

      {/* Dark overlay when muted */}
      {!isActive && (
        <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
      )}

      {/* Volume fill from bottom */}
      <Box
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${bar.volume * 100}%`,
          background: 'rgba(146,58,58,0.45)',
          transition: 'height 0.05s linear',
          pointerEvents: 'none',
        }}
      />

      {/* Volume level line */}
      {isActive && (
        <Box
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${bar.volume * 100}%`,
            height: 2,
            background: 'rgba(220,100,100,0.9)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Label */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '4px 6px 3px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          pointerEvents: 'none',
        }}
      >
        <Text size="xs" c="white" fw={500} truncate style={{ lineHeight: 1.2 }}>
          {bar.sound.name}
        </Text>
      </Box>

      {/* Volume icon top-left */}
      <Box style={{ position: 'absolute', top: 4, left: 4, pointerEvents: 'none' }}>
        {isActive
          ? <IconVolume size={14} color="rgba(255,255,255,0.85)" />
          : <IconVolumeOff size={14} color="rgba(255,255,255,0.5)" />
        }
      </Box>

      {/* Admin delete button */}
      {isAdmin && (
        <ActionIcon
          size="xs"
          variant="filled"
          color="red"
          style={{ position: 'absolute', top: 4, right: 4 }}
          onClick={(e) => { e.stopPropagation(); onDelete?.(bar.sound.filename); }}
          title={`Delete ${bar.sound.name}`}
        >
          <IconTrash size={11} />
        </ActionIcon>
      )}
    </Box>
  );
}
