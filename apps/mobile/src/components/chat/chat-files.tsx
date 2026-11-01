import { CHAT, roomsFileRows } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { match } from 'ts-pattern';
import { MessageFile, MessageImage, messageOutline } from '@/components/ui/message';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { chatFileSource } from '@/services/chat/chat.utils';
import { ChatAudio } from './chat-audio';
import { ChatVideo } from './chat-video';
import type { ChatMediaRouteParams } from '@/types/chat.types';
import type { RpcSession } from '@/types/rpc.types';
import type { RoomsFilePart, RoomsFileRow } from '@repo/client/client';

interface ChatFilesTileProps {
  session: RpcSession;
  botId: string;
  file: RoomsFilePart;
  className?: string;
  hidden?: number;
  onOpen?: (file: RoomsFilePart) => void;
}

function ChatFilesTile({ session, botId, file, className, hidden = 0, onOpen }: ChatFilesTileProps) {
  return (
    <Pressable
      accessibilityLabel={m.rooms_media_open({ name: file.filename ?? '' })}
      accessibilityRole="imagebutton"
      className={cn('overflow-hidden bg-muted', className)}
      disabled={!onOpen}
      onPress={() => onOpen?.(file)}
    >
      <Image
        className="size-full"
        resizeMode="cover"
        source={chatFileSource(session, botId, file)}
      />
      {hidden > 0 ? (
        <View accessibilityLabel={m.rooms_media_more({ count: hidden })} className="absolute inset-0 items-center justify-center bg-black/45">
          <Text className="text-white" variant="heading">{`+${String(hidden)}`}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

interface ChatFilesGalleryProps {
  session: RpcSession;
  botId: string;
  files: RoomsFilePart[];
  hidden: number;
  onOpen?: (file: RoomsFilePart) => void;
}

function ChatFilesGallery({ session, botId, files, hidden, onOpen }: ChatFilesGalleryProps) {
  const [first, ...rest] = files;

  if (rest.length === 0) {
    return (
      <Pressable
        accessibilityLabel={m.rooms_media_open({ name: first.filename ?? '' })}
        accessibilityRole="imagebutton"
        disabled={!onOpen}
        onPress={() => onOpen?.(first)}
      >
        <MessageImage name={first.filename ?? ''} source={chatFileSource(session, botId, first)} />
      </Pressable>
    );
  }

  const rows = files.length === 3 ? [[first], rest] : [files.slice(0, 2), files.slice(2)];

  return (
    <View className={cn('w-64 gap-1 overflow-hidden rounded-3xl', messageOutline)} style={{ borderCurve: 'continuous' }}>
      {rows.filter((row) => row.length > 0).map((row) => (
        <View className="flex-row gap-1" key={row.map((file) => file.url).join()}>
          {row.map((file) => (
            <ChatFilesTile
              botId={botId}
              className={row.length === 1 ? 'aspect-2/1 flex-1' : 'aspect-square flex-1'}
              file={file}
              hidden={file === files.at(-1) ? hidden : 0}
              key={file.url}
              session={session}
              onOpen={onOpen}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface ChatFilesProps {
  session: RpcSession;
  botId: string;
  files: RoomsFilePart[];
  entryId?: number;
}

export function ChatFiles({ session, botId, files, entryId }: ChatFilesProps) {
  const router = useRouter();

  const open = (file: RoomsFilePart) => {
    if (!file.url.startsWith(CHAT.attachmentScheme)) {
      return;
    }

    const params: ChatMediaRouteParams = { botId, attachmentId: file.url.slice(CHAT.attachmentScheme.length) };

    if (entryId) {
      params.entryId = String(entryId);
    }

    router.push({ pathname: '/bots/[botId]/media/[attachmentId]', params });
  };

  function renderRow(row: RoomsFileRow) {
    return match(row)
      .with({ kind: 'images' }, (images) => (
        <ChatFilesGallery
          botId={botId}
          files={images.files}
          hidden={images.hidden}
          key={row.key}
          session={session}
          onOpen={open}
        />
      ))
      .with({ kind: 'video' }, ({ file }) => (
        <ChatVideo
          key={row.key}
          name={file.filename ?? ''}
          source={chatFileSource(session, botId, file)}
        />
      ))
      .with({ kind: 'audio' }, ({ file }) => (
        <ChatAudio
          key={row.key}
          name={file.filename ?? ''}
          source={chatFileSource(session, botId, file)}
        />
      ))
      .with({ kind: 'file' }, ({ file }) => <MessageFile key={row.key} name={file.filename ?? ''} />)
      .exhaustive();
  }

  return <>{roomsFileRows(files).map(renderRow)}</>;
}
