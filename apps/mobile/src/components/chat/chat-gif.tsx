import { gifEmojiUrl, roomsImageFrame } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { useState } from 'react';
import { Image, Text } from 'react-native';
import { match } from 'ts-pattern';
import type { GifToolDetails } from '@repo/contracts/universal';

interface ChatGifProps {
  gif: GifToolDetails;
}

export function ChatGif({ gif }: ChatGifProps) {
  const [isFailed, setIsFailed] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number }>();

  if (isFailed) {
    return <Text className="text-7xl leading-none">{gif.emoji}</Text>;
  }

  return match(gif)
    .with({ provider: 'anime' }, ({ url, emoji }) => (
      <Image
        accessibilityLabel={m.rooms_gif_label({ emoji })}
        className="max-w-full rounded-3xl bg-muted"
        source={{ uri: url }}
        style={roomsImageFrame(size)}
        onError={() => setIsFailed(true)}
        onLoad={(event) => setSize(event.nativeEvent.source)}
      />
    ))
    .with({ provider: 'emoji' }, ({ emoji }) => (
      <Image
        accessibilityLabel={m.rooms_gif_label({ emoji })}
        className="size-28"
        source={{ uri: gifEmojiUrl(emoji) }}
        onError={() => setIsFailed(true)}
      />
    ))
    .exhaustive();
}
