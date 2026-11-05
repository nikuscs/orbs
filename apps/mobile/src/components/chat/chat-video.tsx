import { m } from '@repo/i18n/client';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { messageOutline } from '@/components/ui/message';
import { Text } from '@/components/ui/text';
import { useChatPlayback } from '@/hooks/use-chat-playback';
import { cn } from '@/lib/cn';
import { chatPlaybackStart } from '@/services/chat/chat.utils';
import type { ImageURISource } from 'react-native';

interface ChatVideoProps {
  source: ImageURISource;
  poster?: ImageURISource;
  name: string;
}

export function ChatVideo({ source, poster, name }: ChatVideoProps) {
  const player = useVideoPlayer({ uri: source.uri, headers: source.headers });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [isStarted, setIsStarted] = useState(false);
  const [hasPoster, setHasPoster] = useState(Boolean(poster));

  useChatPlayback(player);

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) {
      chatPlaybackStart(player);
    }
  });

  if (status === 'error' && poster && hasPoster) {
    return (
      <View
        className={cn('aspect-video w-64 overflow-hidden rounded-3xl bg-black', messageOutline)}
        style={{ borderCurve: 'continuous' }}
      >
        <Image
          accessibilityIgnoresInvertColors
          className="size-full"
          resizeMode="cover"
          source={poster}
          onError={() => setHasPoster(false)}
        />
        <View className="absolute inset-x-4 bottom-3">
          <Text
            className="text-white/80"
            numberOfLines={1}
            variant="caption"
          >{m.rooms_media_unplayable({ name })}</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View className="rounded-full bg-secondary px-3 py-1.5">
        <Text tone="muted" variant="small">{m.rooms_media_unavailable({ name })}</Text>
      </View>
    );
  }

  return (
    <View
      className={cn('aspect-video w-64 overflow-hidden rounded-3xl bg-black', messageOutline)}
      style={{ borderCurve: 'continuous' }}
    >
      <VideoView
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls={isStarted}
        player={player}
        style={{ flex: 1 }}
      />
      {isStarted ? null : (
        <Pressable
          accessibilityLabel={m.rooms_media_play({ name })}
          accessibilityRole="button"
          className="absolute inset-0 items-center justify-center"
          onPress={() => {
            setIsStarted(true);
            player.play();
          }}
        >
          <View className="size-11 items-center justify-center rounded-full bg-background/90">
            <Icon
              className="ml-0.5"
              fill="currentColor"
              icon={Play}
            />
          </View>
          <View className="absolute inset-x-4 bottom-3">
            <Text
              className="text-white/80"
              numberOfLines={1}
              variant="caption"
            >{name}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
