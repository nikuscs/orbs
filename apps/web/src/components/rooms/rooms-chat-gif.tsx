import { gifEmojiUrl } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { useState } from 'react';
import { match } from 'ts-pattern';
import type { GifToolDetails } from '@repo/contracts/universal';

interface RoomsChatGifProps {
  gif: GifToolDetails
}

export function RoomsChatGif({ gif }: RoomsChatGifProps) {
  const [isFailed, setIsFailed] = useState(false);

  if (isFailed) {
    return <span className="text-7xl leading-none">{gif.emoji}</span>;
  }

  return match(gif)
    .with({ provider: 'anime' }, ({ url, emoji }) => (
      <img
        alt={m.rooms_gif_label({ emoji })}
        className="max-h-64 w-64 max-w-full rounded-3xl border border-input bg-muted object-cover"
        loading="lazy"
        src={url}
        onError={() => setIsFailed(true)}
      />
    ))
    .with({ provider: 'emoji' }, ({ emoji }) => (
      <img
        alt={m.rooms_gif_label({ emoji })}
        className="size-28"
        height={112}
        loading="lazy"
        src={gifEmojiUrl(emoji)}
        title={m.rooms_gif_credit()}
        width={112}
        onError={() => setIsFailed(true)}
      />
    ))
    .exhaustive();
}
