import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { CHAT_MEDIA } from '@/services/chat/chat.constants';
import type { ChatPlayback } from '@/types/chat.types';

export function useChatPlayback(player: ChatPlayback) {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(CHAT_MEDIA.playbackEvent, (current: ChatPlayback) => {
      if (current !== player) {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [player]);
}
