import { useRef } from 'react';
import { useDrag, useDrop} from 'react-dnd';
import { SoundBar } from './SoundBar';
import { IconGripVertical } from '@tabler/icons-react';

interface DraggableSoundBarProps {
  bar: any;
  index: number;
  onChange: (filename: string, volume: number) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  showDragHandle: boolean;
}

export function DraggableSoundBar({
  bar,
  index,
  onChange,
  moveItem,
  onDragEnd,
  showDragHandle
}: Readonly<DraggableSoundBarProps>) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'SOUND_BAR',
    item: { index },
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        const dropResult = monitor.getDropResult();
        if (dropResult && typeof dropResult === 'object' && dropResult !== null && 'droppedOn' in dropResult && typeof dropResult.droppedOn === 'number') {
          onDragEnd(item.index, dropResult.droppedOn);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'SOUND_BAR',
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
        width: '200px',
        minWidth: '175px',
        maxWidth: '175px',
        cursor: 'default',
        transform: isDragging ? 'scale(0.95)' : 'none',
        transition: 'transform 0.1s ease, opacity 0.1s ease',
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative'
      }}
    >
      {showDragHandle && (
        <div
          ref={drag as any}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '4px 4px 0 0'
          }}
        >
          <IconGripVertical size={18} color="#666" />
        </div>
      )}
      <div style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
        <SoundBar
          key={bar.sound.filename}
          bar={bar}
          onChange={onChange}
          showDragHandle={false}
        />
      </div>
    </div>
  );
}
