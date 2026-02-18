import { ActionIcon, Group, Slider, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { AmbianceBar } from '../../hooks/useAmbianceSounds';

interface SoundBarProps {
  bar: AmbianceBar;
  onChange: (filename: string, volume: number) => void;
  isAdmin?: boolean;
  onDelete?: (filename: string) => void;
}

export function SoundBar({ bar, onChange, isAdmin, onDelete }: SoundBarProps) {
  return (
    <Group gap="sm" align="center" wrap="nowrap">
      <Text size="xs" w={120} truncate>
        {bar.sound.name}
      </Text>
      <Slider
        size="xs"
        style={{ flex: 1 }}
        min={0}
        max={1}
        step={0.01}
        value={bar.volume}
        onChange={(v) => onChange(bar.sound.filename, v)}
        label={(v) => `${Math.round(v * 100)}%`}
        color="teal"
      />
      {isAdmin && (
        <ActionIcon
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => onDelete?.(bar.sound.filename)}
          title={`Delete ${bar.sound.name}`}
        >
          <IconTrash size={12} />
        </ActionIcon>
      )}
    </Group>
  );
}
