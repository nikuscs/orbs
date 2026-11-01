import { useChatViewer } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { match, P } from 'ts-pattern';
import { GlassButton } from '@/components/ui/glass-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useConnection } from '@/hooks/use-connection';
import { cn } from '@/lib/cn';
import { CHAT_MEDIA } from '@/services/chat/chat.constants';
import { chatFileSource } from '@/services/chat/chat.utils';
import type { RpcSession } from '@/types/rpc.types';
import type { RoomsFilePart } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';

interface ChatViewerScreenProps {
  botId: string;
  attachmentId: string;
  entryId?: number;
}

export function ChatViewerScreen(props: ChatViewerScreenProps) {
  const { session } = useConnection();

  return match(session)
    .with(P.nonNullable, (current) => <ChatViewerBot {...props} session={current} />)
    .otherwise(() => null);
}

interface ChatViewerBotProps extends ChatViewerScreenProps {
  session: RpcSession;
}

function ChatViewerBot({ session, botId, ...props }: ChatViewerBotProps) {
  const bots = useQuery(session.rpc.bots.list.queryOptions());

  const bot = bots.data?.find((item) => item.id === botId);

  if (!bot) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <ChatViewerGallery
      {...props}
      bot={bot}
      session={session}
    />
  );
}

interface ChatViewerGalleryProps extends Omit<ChatViewerScreenProps, 'botId'> {
  session: RpcSession;
  bot: Bot;
}

function ChatViewerGallery({ session, bot, attachmentId, entryId }: ChatViewerGalleryProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const viewer = useChatViewer({
    bot,
    entryId,
    attachmentId,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const list = useRef<FlatList<RoomsFilePart>>(null);
  const start = useSharedValue({ x: 0, y: 0 });
  const drag = useSharedValue(0);
  const found = viewer.images.findIndex((image) => image.url === selected);
  const index = found === -1 ? viewer.index : found;
  const file = viewer.images[index];

  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(drag.get(), [0, 400], [1, 0.4], 'clamp') }));
  const page = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));

  const show = (next: number) => {
    setSelected(viewer.images[next]?.url ?? null);
    list.current?.scrollToIndex({ index: next, animated: true });
  };

  const settle = () => {
    if (drag.get() > CHAT_MEDIA.closeDragPx) {
      router.back();
      return;
    }

    drag.set(withSpring(0));
  };

  return (
    <Animated.View
      className="flex-1 bg-black"
      style={backdrop}
      onMoveShouldSetResponderCapture={(event) => {
        const dx = event.nativeEvent.pageX - start.get().x;
        const dy = event.nativeEvent.pageY - start.get().y;

        return !isZoomed && dy > 10 && dy > Math.abs(dx) * 1.5;
      }}
      onResponderMove={(event) => {
        drag.set(Math.max(0, event.nativeEvent.pageY - start.get().y));
      }}
      onResponderRelease={settle}
      onResponderTerminate={settle}
      onTouchStart={(event) => {
        start.set({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
      }}
    >
      <Animated.View className="flex-1" style={page}>
        <FlatList
          horizontal
          pagingEnabled
          data={viewer.images}
          getItemLayout={(_data, position) => ({ length: width, offset: width * position, index: position })}
          initialScrollIndex={viewer.index}
          key={viewer.images.length}
          keyExtractor={(item) => item.url}
          ref={list}
          renderItem={({ item }) => (
            <ScrollView
              bouncesZoom
              centerContent
              contentContainerStyle={{ width, height }}
              maximumZoomScale={CHAT_MEDIA.maxZoom}
              minimumZoomScale={1}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={{ width, height }}
              onScroll={(event) => setIsZoomed((event.nativeEvent.zoomScale ?? 1) > 1)}
            >
              <Image
                accessibilityLabel={item.filename}
                resizeMode="contain"
                source={chatFileSource(session, bot.id, item)}
                style={{ width, height }}
              />
            </ScrollView>
          )}
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setSelected(viewer.images[Math.round(event.nativeEvent.contentOffset.x / width)]?.url ?? null)}
        />
      </Animated.View>
      <View
        className="absolute inset-x-0 flex-row items-center justify-between px-4"
        pointerEvents="box-none"
        style={{ top: insets.top + 8 }}
      >
        <Text className="text-white/70" variant="small">{m.rooms_media_viewer_count({ index: index + 1, total: viewer.images.length })}</Text>
        <GlassButton accessibilityLabel={m.ui_close()} onPress={() => router.back()}>
          <Icon icon={X} />
        </GlassButton>
      </View>
      <View
        className="absolute inset-x-0 items-center gap-3 px-4"
        pointerEvents="box-none"
        style={{ bottom: insets.bottom + 12 }}
      >
        <View className="items-center gap-0.5">
          <Text
            className="text-white"
            numberOfLines={1}
            variant="label"
          >{file.filename ?? ''}</Text>
          {viewer.caption ? <Text className="text-white/60" variant="caption">{viewer.caption}</Text> : null}
        </View>
        {viewer.images.length > 1 ? (
          <ScrollView
            horizontal
            contentContainerClassName="gap-2 px-1"
            showsHorizontalScrollIndicator={false}
          >
            {viewer.images.map((image, position) => (
              <Pressable
                accessibilityLabel={m.rooms_media_open({ name: image.filename ?? '' })}
                accessibilityRole="imagebutton"
                accessibilityState={{ selected: position === index }}
                className={cn('size-12 overflow-hidden rounded-lg opacity-50', position === index && 'border-2 border-white opacity-100')}
                key={image.url}
                onPress={() => show(position)}
              >
                <Image
                  className="size-full"
                  resizeMode="cover"
                  source={chatFileSource(session, bot.id, image)}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <Text className="text-white/50" variant="caption">{m.rooms_media_viewer_hint()}</Text>
      </View>
    </Animated.View>
  );
}
