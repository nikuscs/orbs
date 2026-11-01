import { useChatAttachmentUrl } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useRef, useState } from 'react';
import { match } from 'ts-pattern';
import IconLucideChevronLeft from '~icons/lucide/chevron-left';
import IconLucideChevronRight from '~icons/lucide/chevron-right';
import IconLucideDownload from '~icons/lucide/download';
import IconLucideX from '~icons/lucide/x';
import IconLucideZoomIn from '~icons/lucide/zoom-in';
import IconLucideZoomOut from '~icons/lucide/zoom-out';
import { cn } from '../../lib/cn';
import { Button } from '../button';
import type { RoomsFilePart } from '@repo/client/client';
import type { KeyboardEvent, PointerEvent } from 'react';

const VIEWER = { closeDragPx: 120, zoomStep: 0.5, zoomMax: 4 } as const;

interface RoomsChatViewerThumbProps {
  botId: string
  file: RoomsFilePart
  isCurrent: boolean
  onSelect: () => void
}

function RoomsChatViewerThumb({ botId, file, isCurrent, onSelect }: RoomsChatViewerThumbProps) {
  const url = useChatAttachmentUrl(botId, file.url);

  return (
    <button
      aria-current={isCurrent}
      aria-label={m.rooms_media_open({ name: file.filename ?? '' })}
      className={cn('size-12 shrink-0 overflow-hidden rounded-lg opacity-50 transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none', isCurrent && 'opacity-100 ring-2 ring-white')}
      type="button"
      onClick={onSelect}
    >
      <img alt="" className="size-full object-cover" src={url} />
    </button>
  );
}

interface RoomsChatViewerProps {
  botId: string
  images: RoomsFilePart[]
  index: number
  caption?: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function RoomsChatViewer({ botId, images, index, caption, onIndexChange, onClose }: RoomsChatViewerProps) {
  const file = images[index];
  const url = useChatAttachmentUrl(botId, file.url);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ x: number, y: number } | null>(null);
  const name = file.filename ?? '';

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const show = (next: number) => {
    if (next < 0 || next >= images.length || next === index) {
      return;
    }

    reset();
    onIndexChange(next);
  };

  const zoomBy = (step: number) => {
    const next = Math.min(VIEWER.zoomMax, Math.max(1, zoom + step));
    setZoom(next);
    setOffset(next === 1 ? { x: 0, y: 0 } : offset);
  };

  const handleKeyDown = (event: KeyboardEvent) => match(event.key)
    .with('ArrowLeft', () => show(index - 1))
    .with('ArrowRight', () => show(index + 1))
    .with('+', '=', () => zoomBy(VIEWER.zoomStep))
    .with('-', () => zoomBy(-VIEWER.zoomStep))
    .with('0', reset)
    .otherwise(() => undefined);

  const handlePointerDown = (event: PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag.current) {
      return;
    }

    const y = event.clientY - drag.current.y;
    setOffset(zoom > 1 ? { x: event.clientX - drag.current.x, y } : { x: 0, y: Math.max(0, y) });
  };

  const handlePointerUp = () => {
    drag.current = null;
    setIsDragging(false);

    if (zoom === 1) {
      if (offset.y > VIEWER.closeDragPx) {
        onClose();
      } else {
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">{name}</DialogPrimitive.Title>
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="px-2 text-sm text-white/70 tabular-nums">{m.rooms_media_viewer_count({ index: index + 1, total: images.length })}</span>
            <div className="flex items-center gap-1">
              <Button asChild className="text-white hover:bg-white/10 hover:text-white" size="icon-sm" variant="ghost">
                <a aria-label={m.rooms_media_viewer_download()} download={name} href={url}>
                  <IconLucideDownload className="size-4" />
                </a>
              </Button>
              <Button aria-label={m.rooms_media_viewer_zoom_out()} className="text-white hover:bg-white/10 hover:text-white" disabled={zoom === 1} size="icon-sm" variant="ghost" onClick={() => zoomBy(-VIEWER.zoomStep)}>
                <IconLucideZoomOut className="size-4" />
              </Button>
              <Button aria-label={m.rooms_media_viewer_zoom_in()} className="text-white hover:bg-white/10 hover:text-white" disabled={zoom === VIEWER.zoomMax} size="icon-sm" variant="ghost" onClick={() => zoomBy(VIEWER.zoomStep)}>
                <IconLucideZoomIn className="size-4" />
              </Button>
              <DialogPrimitive.Close asChild>
                <Button aria-label={m.ui_close()} className="text-white hover:bg-white/10 hover:text-white" size="icon-sm" variant="ghost">
                  <IconLucideX className="size-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 sm:px-16">
            <div
              className={cn('flex size-full touch-none items-center justify-center select-none', !isDragging && 'transition-transform duration-200 motion-reduce:transition-none', zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in')}
              style={{ transform: `translate(${String(offset.x)}px, ${String(offset.y)}px) scale(${String(zoom)})`, opacity: zoom === 1 ? 1 - Math.min(offset.y / 400, 0.5) : 1 }}
              onDoubleClick={() => (zoom === 1 ? zoomBy(1) : reset())}
              onPointerCancel={handlePointerUp}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img alt={name} className="max-h-full max-w-full object-contain" draggable={false} src={url} />
            </div>
            {index > 0 ? (
              <Button aria-label={m.rooms_media_viewer_previous()} className="absolute left-3 bg-white/10 text-white hover:bg-white/20 hover:text-white" size="icon" variant="ghost" onClick={() => show(index - 1)}>
                <IconLucideChevronLeft className="size-5" />
              </Button>
            ) : null}
            {index < images.length - 1 ? (
              <Button aria-label={m.rooms_media_viewer_next()} className="absolute right-3 bg-white/10 text-white hover:bg-white/20 hover:text-white" size="icon" variant="ghost" onClick={() => show(index + 1)}>
                <IconLucideChevronRight className="size-5" />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-3 p-4">
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="max-w-[80vw] truncate text-sm font-medium">{name}</span>
              {caption ? <span className="text-xs text-white/60">{caption}</span> : null}
            </div>
            {images.length > 1 ? (
              <div className="flex max-w-full gap-2 overflow-x-auto p-1">
                {images.map((image, position) => (
                  <RoomsChatViewerThumb
                    botId={botId}
                    file={image}
                    isCurrent={position === index}
                    key={image.url}
                    onSelect={() => show(position)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
