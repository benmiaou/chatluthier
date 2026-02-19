import { Box, Text } from '@mantine/core';
import { IconVolumeOff, IconGripVertical } from '@tabler/icons-react';
import { useRef } from 'react';
import type { AmbianceBar } from '../../hooks/useAmbianceSounds';
import { showCreditToast } from '../../utils/showCreditToast';

const IMAGE_BASE = '/assets/images/backgrounds/';
const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

interface SoundBarProps {
  bar: AmbianceBar;
  onChange: (filename: string, volume: number) => void;
  showDragHandle?: boolean;
  dragHandleProps?: any;
}

export function SoundBar({ bar, onChange, showDragHandle = false, dragHandleProps }: SoundBarProps) {
  const imgSrc = bar.sound.imageFile ? `${IMAGE_BASE}${bar.sound.imageFile}` : FALLBACK;
  const isActive = bar.volume > 0;
  const dragging = useRef(false);
  const wasActive = useRef(isActive);

  const handleChange = (filename: string, vol: number) => {
    const wasZero = !wasActive.current;
    wasActive.current = vol > 0;
    onChange(filename, vol);
    // Show credit when first activating
    if (wasZero && vol > 0 && bar.sound.credit) {
      showCreditToast(bar.sound.name, bar.sound.credit);
    }
  };

  const volumeFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleChange(bar.sound.filename, volumeFromPointer(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    handleChange(bar.sound.filename, volumeFromPointer(e));
  };

  const handlePointerUp = () => { dragging.current = false; };

  return (
    <Box
      style={{ position: 'relative', width: '100%', aspectRatio: '1.8', borderRadius: 6, overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', margin: '4px 0' }}
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

      {/* Name label at top */}
      <Box style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '6px 8px',
        background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
        pointerEvents: 'none',
      }}>
        <Text size="sm" c="white" fw={600} truncate style={{ fontSize: 12, lineHeight: 1.3, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {bar.sound.name}
        </Text>
      </Box>


      {/* Drag handle bottom-left (only when enabled) */}
      {showDragHandle && (
        <Box 
          style={{ 
            position: 'absolute', 
            bottom: 4, 
            left: 4, 
            zIndex: 10,
            cursor: 'grab'
          }}
          {...dragHandleProps}
        >
          <IconGripVertical size={16} color="rgba(255,255,255,0.8)" />
        </Box>
      )}
      
      {/* Mute icon bottom-right */}
      {!isActive && (
        <Box style={{ position: 'absolute', bottom: 6, right: 6, pointerEvents: 'none' }}>
          <IconVolumeOff size={14} color="rgba(255,255,255,0.7)" />
        </Box>
      )}


    </Box>
  );
}
