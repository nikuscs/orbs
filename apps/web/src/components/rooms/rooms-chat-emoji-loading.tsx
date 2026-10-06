import { m } from '@orbs/i18n/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROOMS } from '@/services/rooms/rooms.constants';

export function RoomsChatEmojiLoading({ onRetry }: { onRetry: () => void }) {
  const [offerRetry, setOfferRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOfferRetry(true), ROOMS.emojiSlowMs);

    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="flex flex-col gap-2 p-2">
      {offerRetry ? (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {m.rooms_reaction_slow()}
          <Button
            size="xs"
            variant="outline"
            onClick={onRetry}
          >{m.rooms_chat_retry()}</Button>
        </span>
      ) : null}
      <span className="grid grid-cols-8">
        {Array.from({ length: ROOMS.emojiSkeletonCells }, (_, index) => <Skeleton className="m-0.5 size-8" key={index} />)}
      </span>
    </span>
  );
}
