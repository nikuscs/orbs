import { CHAT, roomsAttachmentPath, roomsMediaTime } from '@repo/client/client';
import { useChatAttachmentUrl } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { useRef, useState } from 'react';
import { match } from 'ts-pattern';
import IconLucideDownload from '~icons/lucide/download';
import IconLucideLoaderCircle from '~icons/lucide/loader-circle';
import IconLucidePause from '~icons/lucide/pause';
import IconLucidePlay from '~icons/lucide/play';
import { cn } from '../../lib/cn';
import { messageSurface } from '../ai/message';
import { Button } from '../button';
import type { RoomsFilePart } from '@repo/client/client';
import type { ReactNode, SyntheticEvent } from 'react';

interface RoomsChatMediaProps {
  botId: string
  file: RoomsFilePart
}

function roomsChatMediaSolo(event: SyntheticEvent<HTMLMediaElement>) {
  for (const media of document.querySelectorAll<HTMLMediaElement>('audio, video')) {
    if (media !== event.currentTarget) {
      media.pause();
    }
  }
}

function RoomsChatMediaProblem({ name }: { name: string }) {
  return (
    <p className={cn(messageSurface, 'flex h-8 max-w-full items-center rounded-full px-3 text-sm text-muted-foreground')} role="alert">
      {m.rooms_media_unavailable({ name })}
    </p>
  );
}

interface RoomsChatVideoProps extends RoomsChatMediaProps {
  fallback: ReactNode
}

export function RoomsChatVideo({ botId, file, fallback }: RoomsChatVideoProps) {
  const [isFailed, setIsFailed] = useState(false);
  const [hasPoster, setHasPoster] = useState(file.url.startsWith(CHAT.attachmentScheme));
  const name = file.filename ?? '';
  const src = roomsAttachmentPath(botId, file.url);

  if (isFailed && !hasPoster) {
    return fallback;
  }

  return (
    <div className="relative aspect-video w-72 max-w-full overflow-hidden rounded-3xl border border-input bg-black">
      {isFailed ? (
        <a
          aria-label={m.rooms_media_download({ name })}
          className="group/play absolute inset-0 flex-center outline-none"
          download={name}
          href={src}
        >
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={roomsAttachmentPath(botId, file.url, true)}
            onError={() => setHasPoster(false)}
          />
          <span className="relative flex-center size-11 rounded-full bg-background/90 text-foreground shadow-sm transition-transform group-hover/play:scale-105 group-focus-visible/play:ring-2 group-focus-visible/play:ring-ring motion-reduce:transition-none">
            <IconLucideDownload className="size-5" />
          </span>
          <span className="absolute inset-x-4 bottom-3 truncate text-left text-xs text-white/80">{m.rooms_media_unplayable({ name })}</span>
        </a>
      ) : (
        <video
          aria-label={name}
          className="size-full object-contain"
          controls
          playsInline
          preload="metadata"
          src={`${src}${CHAT.videoFirstFrame}`}
          onError={() => setIsFailed(true)}
          onPlay={roomsChatMediaSolo}
        >
          <track kind="captions" />
        </video>
      )}
    </div>
  );
}

export function RoomsChatAudio({ botId, file }: RoomsChatMediaProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [isRequested, setIsRequested] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const loaded = useChatAttachmentUrl(botId, file.url, isRequested);
  const url = isRequested ? loaded : undefined;
  const name = file.filename ?? '';
  const isLoading = isRequested && !url;

  if (isFailed) {
    return <RoomsChatMediaProblem name={name} />;
  }

  const toggle = () => {
    if (!url) {
      setIsRequested(true);
      return;
    }

    if (isPlaying) {
      audio.current?.pause();
    } else {
      void audio.current?.play();
    }
  };

  return (
    <div className={cn(messageSurface, 'flex h-11 w-72 max-w-full items-center gap-2 rounded-full pr-4 pl-1.5')}>
      {url ? (
        <audio
          autoPlay
          ref={audio}
          src={url}
          onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsFailed(true)}
          onPause={() => setIsPlaying(false)}
          onPlay={(event) => {
            roomsChatMediaSolo(event);
            setIsPlaying(true);
          }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        >
          <track kind="captions" />
        </audio>
      ) : null}
      <Button
        aria-label={isPlaying ? m.rooms_media_pause({ name }) : m.rooms_media_play({ name })}
        disabled={isLoading}
        size="icon-sm"
        variant="default"
        onClick={toggle}
      >
        {match({ isLoading, isPlaying })
          .with({ isLoading: true }, () => <IconLucideLoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />)
          .with({ isPlaying: true }, () => <IconLucidePause className="size-4 fill-current" />)
          .otherwise(() => <IconLucidePlay className="ml-0.5 size-4 fill-current" />)}
      </Button>
      <input
        aria-label={m.rooms_media_seek({ name })}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-foreground disabled:cursor-default"
        disabled={!url}
        max={duration || 0}
        min={0}
        step={0.1}
        type="range"
        value={time}
        onChange={(event) => {
          if (audio.current) {
            audio.current.currentTime = Number(event.currentTarget.value);
          }
        }}
      />
      {duration > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{roomsMediaTime(isPlaying || time > 0 ? time : duration)}</span> : null}
    </div>
  );
}
