import { m } from '@orbs/i18n/client';
import { useMessageScrollerScrollable } from '@shadcn/react/message-scroller';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { rpc } from '@/services/rpc/rpc.client';
import type { RoomUIMessage } from '@orbs/server/client';

export function RoomsChatOlder({ roomId, before, onLoaded }: { roomId: string; before: string | null; onLoaded: (messages: RoomUIMessage[]) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const loaded = useEffectEvent(onLoaded);
  const { end: scrolledUp } = useMessageScrollerScrollable();

  useEffect(() => {
    const node = ref.current;

    if (!node || !before || !scrolledUp) {
      return;
    }

    let active = true;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      observer.disconnect();
      setLoading(true);
      void rpc.rooms.history.call({ roomId, before }).then((messages) => {
        if (active) {
          loaded(messages);
        }
      }).catch(() => undefined).finally(() => setLoading(false));
    });

    observer.observe(node);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [roomId, before, scrolledUp]);

  return <div className="h-6 text-center text-xs text-muted-foreground" ref={ref}>{loading ? m.rooms_chat_loading_older() : null}</div>;
}
