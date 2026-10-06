import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

const LONG_PRESS = { delayMs: 450, tolerancePx: 8 } as const;

export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const origin = useRef({ x: 0, y: 0 });
  const touching = useRef(false);

  const cancel = () => {
    touching.current = false;
    clearTimeout(timer.current);
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        return;
      }

      touching.current = true;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(onLongPress, LONG_PRESS.delayMs);
    },
    onPointerMove: (event: PointerEvent) => {
      if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > LONG_PRESS.tolerancePx) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: MouseEvent) => {
      if (touching.current) {
        event.preventDefault();
      }
    },
  };
}
