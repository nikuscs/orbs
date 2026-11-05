import { roomsFileRows, roomsImageFrame } from '@repo/client/client';
import { useChatAttachmentUrl } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { useInView } from 'motion/react';
import { useRef, useState } from 'react';
import { match } from 'ts-pattern';
import IconLucideFileText from '~icons/lucide/file-text';
import { cn } from '../../lib/cn';
import { messageSurface } from '../ai/message';
import { RoomsChatAudio, RoomsChatVideo } from './rooms-chat-media';
import type { RoomsFilePart } from '@repo/client/client';
import type { CSSProperties, ReactNode } from 'react';

const ROOMS_CHAT_FILES = { viewMargin: '200px' } as const;

interface RoomsChatImageProps {
  botId: string
  file: RoomsFilePart
  className?: string
  imageClassName?: string
  style?: CSSProperties
  children?: ReactNode
  onLoad?: (size: { width: number, height: number }) => void
  onOpen?: (file: RoomsFilePart) => void
}

function RoomsChatImage({ botId, file, className, imageClassName, style, children, onLoad, onOpen }: RoomsChatImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const isInView = useInView(ref, { once: true, margin: ROOMS_CHAT_FILES.viewMargin });
  const url = useChatAttachmentUrl(botId, file.url, isInView);
  const name = file.filename ?? '';

  const image = (
    <img
      alt={name}
      className={cn(imageClassName, !url && 'bg-muted')}
      ref={ref}
      src={url}
      onLoad={(event) => onLoad?.({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
    />
  );

  const frame = cn('relative block overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring', className);

  if (onOpen) {
    return (
      <button aria-label={m.rooms_media_open({ name })} className={cn(frame, 'cursor-zoom-in')} style={style} type="button" onClick={() => onOpen(file)}>
        {image}
        {children}
      </button>
    );
  }

  return (
    <a className={frame} href={url} rel="noreferrer" style={style} target="_blank">
      {image}
      {children}
    </a>
  );
}

interface RoomsChatGalleryProps {
  botId: string
  files: RoomsFilePart[]
  hidden: number
  onOpen?: (file: RoomsFilePart) => void
}

function RoomsChatGallery({ botId, files, hidden, onOpen }: RoomsChatGalleryProps) {
  const [first] = files;
  const [size, setSize] = useState<{ width: number, height: number }>();

  if (files.length === 1) {
    return (
      <RoomsChatImage
        botId={botId}
        className="max-w-full rounded-3xl border border-input"
        file={first}
        imageClassName="size-full bg-muted object-cover"
        style={roomsImageFrame(size)}
        onLoad={setSize}
        onOpen={onOpen}
      />
    );
  }

  return (
    <div className="grid w-64 max-w-full grid-cols-2 gap-1 overflow-hidden rounded-3xl border border-input">
      {files.map((file, index) => (
        <RoomsChatImage
          botId={botId}
          className={files.length === 3 && index === 0 ? 'col-span-2 aspect-2/1' : 'aspect-square'}
          file={file}
          imageClassName="size-full bg-muted object-cover"
          key={file.url}
          onOpen={onOpen}
        >
          {hidden > 0 && index === files.length - 1 ? (
            <span aria-label={m.rooms_media_more({ count: hidden })} className="absolute inset-0 flex-center bg-black/45 text-lg font-medium text-white">
              {`+${String(hidden)}`}
            </span>
          ) : null}
        </RoomsChatImage>
      ))}
    </div>
  );
}

function RoomsChatFile({ botId, file }: { botId: string, file: RoomsFilePart }) {
  const url = useChatAttachmentUrl(botId, file.url);

  return (
    <a
      className={cn(messageSurface, 'flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      download={file.filename}
      href={url}
    >
      <IconLucideFileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="max-w-56 truncate">{file.filename}</span>
    </a>
  );
}

interface RoomsChatFilesProps {
  botId: string
  files: RoomsFilePart[]
  onOpen?: (file: RoomsFilePart) => void
}

export function RoomsChatFiles({ botId, files, onOpen }: RoomsChatFilesProps) {
  return (
    <div className="flex flex-col items-end gap-1 group-data-[role=assistant]:items-start">
      {roomsFileRows(files).map((row) => match(row)
        .with({ kind: 'images' }, (images) => <RoomsChatGallery botId={botId} files={images.files} hidden={images.hidden} key={row.key} onOpen={onOpen} />)
        .with({ kind: 'video' }, ({ file }) => <RoomsChatVideo botId={botId} fallback={<RoomsChatFile botId={botId} file={file} />} file={file} key={row.key} />)
        .with({ kind: 'audio' }, ({ file }) => <RoomsChatAudio botId={botId} file={file} key={row.key} />)
        .with({ kind: 'file' }, ({ file }) => <RoomsChatFile botId={botId} file={file} key={row.key} />)
        .exhaustive())}
    </div>
  );
}
