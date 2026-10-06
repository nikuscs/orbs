import { useDroppable } from '@dnd-kit/core';
import { m } from '@orbs/i18n/client';
import { cn } from '@/lib/cn';

export function RoomsPinZone({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      className={cn(
        'mx-2 mb-2 flex-center h-16 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors motion-reduce:transition-none',
        isOver && 'border-foreground/40 bg-sidebar-accent text-foreground',
      )}
      ref={setNodeRef}
    >
      {m.rooms_pin_drop()}
    </div>
  );
}
