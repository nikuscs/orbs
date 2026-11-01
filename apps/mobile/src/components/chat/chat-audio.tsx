import { roomsMediaTime } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { useEventListener } from 'expo';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { messageSurface } from '@/components/ui/message';
import { Text } from '@/components/ui/text';
import { useChatPlayback } from '@/hooks/use-chat-playback';
import { cn } from '@/lib/cn';
import { CHAT_MEDIA } from '@/services/chat/chat.constants';
import { chatPlaybackStart } from '@/services/chat/chat.utils';
import type { ImageURISource } from 'react-native';

interface ChatAudioProps {
  source: ImageURISource;
  name: string;
}

export function ChatAudio({ source, name }: ChatAudioProps) {
  const player = useAudioPlayer(null);
  const [isRequested, setIsRequested] = useState(false);
  const status = useAudioPlayerStatus(player);
  const [width, setWidth] = useState(0);
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  useChatPlayback(player);

  useEventListener(player, 'playbackStatusUpdate', ({ playing }) => {
    if (playing) {
      chatPlaybackStart(player);
    }
  });

  const seek = (seconds: number) => void player.seekTo(Math.min(status.duration, Math.max(0, seconds)));

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    await setAudioModeAsync({ playsInSilentMode: true });

    if (!isRequested) {
      setIsRequested(true);
      player.replace({ uri: source.uri, headers: source.headers });
    }

    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <View className={cn(messageSurface, 'h-11 w-64 flex-row items-center gap-2 rounded-full pr-4 pl-1.5')} style={{ borderCurve: 'continuous' }}>
      <Button
        accessibilityLabel={status.playing ? m.rooms_media_pause({ name }) : m.rooms_media_play({ name })}
        size="icon-sm"
        variant="default"
        onPress={() => void toggle()}
      >
        <Icon
          className={status.playing ? undefined : 'ml-0.5'}
          fill="currentColor"
          icon={status.playing ? Pause : Play}
          tone="on-primary"
        />
      </Button>
      <Pressable
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={m.rooms_media_seek({ name })}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: roomsMediaTime(status.currentTime) }}
        className="h-8 flex-1 justify-center"
        disabled={!isRequested}
        onAccessibilityAction={(event) => seek(status.currentTime + (event.nativeEvent.actionName === 'increment' ? CHAT_MEDIA.seekStepSeconds : -CHAT_MEDIA.seekStepSeconds))}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => (width > 0 ? seek((event.nativeEvent.locationX / width) * status.duration) : undefined)}
      >
        <View className="h-1 overflow-hidden rounded-full bg-foreground/15">
          <View className="h-full rounded-full bg-foreground" style={{ width: `${String(progress * 100)}%` }} />
        </View>
      </Pressable>
      {status.duration > 0 ? <Text tone="muted" variant="caption">{roomsMediaTime(status.playing || status.currentTime > 0 ? status.currentTime : status.duration)}</Text> : null}
    </View>
  );
}
