import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { SoundBar } from './SoundBar';

interface DraggableSoundBarProps {
  bar: any;
  index: number;
  onChange: (filename: string, volume: number) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  showDragHandle: boolean;
}

export function DraggableSoundBar({ 
  bar, 
  index, 
  onChange, 
  moveItem, 
  showDragHandle 
}: DraggableSoundBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'SOUND_BAR',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
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
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        width: '150px',
        minWidth: '150px',
        maxWidth: '150px',
        cursor: 'move',
        transform: isDragging ? 'scale(0.95)' : 'none',
        transition: 'transform 0.1s ease, opacity 0.1s ease',
        zIndex: isDragging ? 1000 : 'auto'
      }}
    >
      <SoundBar
        key={bar.sound.filename}
        bar={bar}
        onChange={onChange}
        showDragHandle={showDragHandle}
      />
    </div>
  );
}