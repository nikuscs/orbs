import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const BOT_CHEER = { hoverDelayMs: 1200, pressMs: 1600, settleMs: 600 } as const;

export function useBotCheer() {
  const [moving, setMoving] = useState(false);
  const [happy, setHappy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const later = (delayMs: number, step: () => void) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(step, delayMs);
  };

  const settle = () => {
    setHappy(false);
    later(BOT_CHEER.settleMs, () => setMoving(false));
  };

  const cheer = (thenSettleAfterMs?: number) => {
    setMoving(true);
    requestAnimationFrame(() => setHappy(true));

    if (thenSettleAfterMs) {
      later(thenSettleAfterMs, settle);
    } else {
      clearTimeout(timer.current);
    }
  };

  return {
    moving,
    happy,
    handlers: {
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') {
          later(BOT_CHEER.hoverDelayMs, () => cheer());
        }
      },
      onPointerLeave: settle,
      onPointerDown: () => cheer(BOT_CHEER.pressMs),
    },
  };
}
