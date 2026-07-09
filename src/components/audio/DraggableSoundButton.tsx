import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import type { Sound } from '../../types/sound';

function contextToHue(context: string): number {
  let hash = 0;
  for (let i = 0; i < context.length; i += 1) {
    hash = (hash * 31 + context.charCodeAt(i)) % 360;
  }
  return Math.abs(hash);
}

interface DraggableSoundButtonProps {
  sound: Sound;
  index: number;
  onPlay: (filename: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  showDragHandle: boolean;
  isActive: boolean;
}

export function DraggableSoundButton({
  sound,
  index,
  onPlay,
  moveItem,
  onDragEnd,
  showDragHandle,
  isActive,
}: Readonly<DraggableSoundButtonProps>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const primaryContext = (sound.contexts?.[0] ?? 'all').toLowerCase();
  const contextKey = primaryContext.replace(/\s+/g, '-');
  const contextHue = contextToHue(primaryContext);

  const [{ isDragging }, drag] = useDrag({
    type: 'SOUND_BUTTON',
    item: { index },
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        const dropResult = monitor.getDropResult();
        if (
          dropResult &&
          typeof dropResult === 'object' &&
          dropResult !== null &&
          'droppedOn' in dropResult &&
          typeof dropResult.droppedOn === 'number'
        ) {
          onDragEnd(item.index, dropResult.droppedOn);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: Boolean(monitor.isDragging()),
    }),
  });

  const [, drop] = useDrop({
    accept: 'SOUND_BUTTON',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    drop: () => ({
      droppedOn: index,
    }),
  });

  const combinedRef = (node: HTMLDivElement | null) => {
    drop(node);
    ref.current = node;
  };

  return (
    <div
      ref={combinedRef}
      className={`soundboard-draggable-item ${isActive ? 'soundboard-draggable-item-active' : ''}`}
      data-context={contextKey}
      style={
        {
          '--soundboard-context-hue': `${contextHue}`,
          opacity: isDragging ? 0.5 : 1,
          width: '100%',
          cursor: 'default',
          transform: isDragging ? 'scale(0.95)' : 'none',
          transition: 'transform 0.1s ease, opacity 0.1s ease',
          zIndex: isDragging ? 1000 : 'auto',
          position: 'relative',
          aspectRatio: '1 / 1',
        } as React.CSSProperties
      }
    >
      {showDragHandle && (
        <div
          ref={(node) => {
            drag(node);
          }}
          className="soundboard-drag-handle"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.08)',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <IconGripVertical size={16} color="#8b8b8b" />
        </div>
      )}
      <div
        className="soundboard-button-wrap"
        style={{
          pointerEvents: isDragging ? 'none' : 'auto',
          marginTop: showDragHandle ? '28px' : '0',
          height: showDragHandle ? 'calc(100% - 28px)' : '100%',
          width: '100%',
        }}
      >
        <Button
          className="soundboard-button"
          style={{
            width: '100%',
            cursor: 'pointer',
            height: '100%',
            padding: '8px 12px',
            textAlign: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}
          size="compact-xs"
          variant="default"
          onClick={() => onPlay(sound.filename ?? '')}
          title={sound.name}
        >
          {sound.name}
        </Button>
      </div>
    </div>
  );
}
