import { useEffect, useState } from 'react';
import { CHAT } from '../services/chat/chat.constants';

export function useChatElapsed(startedAt: number | undefined, isActive: boolean): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const seconds = startedAt === undefined ? 0 : Math.floor((now - startedAt) / 1000);

  return isActive && seconds >= CHAT.activityElapsedMinSeconds ? seconds : null;
}
