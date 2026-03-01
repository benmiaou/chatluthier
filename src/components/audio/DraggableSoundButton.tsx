import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';

interface DraggableSoundButtonProps {
  sound: any;
  index: number;
  onPlay: (filename: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  showDragHandle: boolean;
}

export function DraggableSoundButton({
  sound,
  index,
  onPlay,
  moveItem,
  onDragEnd,
  showDragHandle,
}: Readonly<DraggableSoundButtonProps>) {
  const ref = useRef<HTMLDivElement>(null);

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
      isDragging: !!monitor.isDragging(),
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
      style={{
        opacity: isDragging ? 0.5 : 1,
        width: '100%',
        cursor: 'default',
        transform: isDragging ? 'scale(0.95)' : 'none',
        transition: 'transform 0.1s ease, opacity 0.1s ease',
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
        height: '40px', // Fixed height to match button
      }}
    >
      {showDragHandle && (
        <div
          ref={drag as any}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px 0 0 4px',
          }}
        >
          <IconGripVertical size={16} color="#666" />
        </div>
      )}
      <div
        style={{
          pointerEvents: isDragging ? 'none' : 'auto',
          marginLeft: showDragHandle ? '24px' : '0',
          width: showDragHandle ? 'calc(100% - 24px)' : '100%',
        }}
      >
        <Button
          className="soundboard-button"
          style={{
            width: '100%',
            cursor: 'pointer',
            height: '40px',
            padding: '8px 12px',
            textAlign: 'left',
            justifyContent: 'flex-start',
            fontSize: '14px',
          }}
          size="compact-xs"
          variant="default"
          onClick={() => onPlay(sound.filename)}
          title={sound.name}
        >
          {sound.name}
        </Button>
      </div>
    </div>
  );
}
