import { m } from '@orbs/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { generateId } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { toasty } from '@/components/ui/sonner';
import { rpc } from '@/services/rpc/rpc.client';
import { ROOM, STORAGE } from '@orbs/server/client';
import type * as RoomsTypes from '@/types/rooms.types';
import type * as ReactTypes from 'react';

export function useRoomAttachments(roomId: string) {
  const [state, setState] = useState<RoomsTypes.RoomsAttachmentsState>({ roomId, items: [] });
  const upload = useMutation(rpc.rooms.upload.mutationOptions());
  const discard = useMutation(rpc.rooms.removeFile.mutationOptions());
  const previews = useRef(new Map<string, string>());

  useEffect(() => () => {
    for (const preview of previews.current.values()) {
      URL.revokeObjectURL(preview);
    }

    previews.current.clear();
  }, [roomId]);
  const attachments = state.roomId === roomId ? state.items : [];

  const update = (change: (items: RoomsTypes.RoomsAttachment[]) => RoomsTypes.RoomsAttachment[]) => {
    setState((current) => ({ roomId, items: change(current.roomId === roomId ? current.items : []) }));
  };

  const add = (files: File[]) => {
    const typed = files.filter((file) => [...STORAGE.imageTypes, ...STORAGE.documentTypes].some((type) => type === file.type));
    const sized = typed.filter((file) => file.size > 0 && file.size <= STORAGE.maxBytes);
    const accepted = sized.slice(0, Math.max(0, STORAGE.maxFilesPerMessage - attachments.length));

    if (typed.length < files.length) {
      toasty(m.rooms_files_type(), '⚠️');
    }

    if (sized.length < typed.length) {
      toasty(m.rooms_files_too_big(), '⚠️');
    }

    if (accepted.length < sized.length) {
      toasty(m.rooms_files_too_many({ count: STORAGE.maxFilesPerMessage }), '⚠️');
    }

    for (const file of accepted) {
      const key = generateId();
      const preview = URL.createObjectURL(file);

      previews.current.set(key, preview);
      update((items) => [...items, { key, id: null, name: file.name, mediaType: file.type, preview, status: 'uploading' }]);
      void upload.mutateAsync({ roomId, file }).then(
        (saved) => {
          if (!previews.current.has(key)) {
            discard.mutate({ roomId, fileId: saved.id });
            return;
          }

          setState((current) => current.roomId !== roomId ? current : {
            ...current,
            items: current.items.map((item) => (item.key === key ? { ...item, id: saved.id, name: saved.name, status: 'ready' } : item)),
          });
        },
        () => {
          setState((current) => current.roomId !== roomId ? current : {
            ...current,
            items: current.items.map((item) => (item.key === key ? { ...item, status: 'failed' } : item)),
          });
        },
      );
    }
  };

  const remove = (key: string) => {
    for (const item of attachments.filter((attachment) => attachment.key === key)) {
      URL.revokeObjectURL(item.preview);

      previews.current.delete(key);

      if (item.id) {
        discard.mutate({ roomId, fileId: item.id });
      }
    }

    update((items) => items.filter((item) => item.key !== key));
  };

  const clear = (fileIds: string[]) => {
    setState((current) => {
      if (current.roomId !== roomId) {
        return current;
      }

      const sent = new Set(fileIds);

      const items = current.items.filter((item) => {
        if (!item.id || !sent.has(item.id)) {
          return true;
        }

        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.key);

        return false;
      });

      return { ...current, items };
    });
  };

  const onDragOver = (event: ReactTypes.DragEvent) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
    }
  };

  const onDrop = (event: ReactTypes.DragEvent) => {
    if (event.dataTransfer.files.length === 0) {
      return;
    }

    event.preventDefault();
    add([...event.dataTransfer.files]);
  };

  const onPaste = (event: ReactTypes.ClipboardEvent) => {
    if (event.clipboardData.files.length === 0) {
      return;
    }

    event.preventDefault();
    add([...event.clipboardData.files]);
  };

  const ready = attachments.flatMap((item) => (item.id && item.status === 'ready' ? [item] : []));

  return {
    attachments,
    add,
    remove,
    clear,
    onDragOver,
    onDrop,
    onPaste,
    uploading: attachments.some((item) => item.status === 'uploading'),
    failed: attachments.some((item) => item.status === 'failed'),
    readyIds: ready.flatMap((item) => (item.id ? [item.id] : [])),
    readyParts: ready.map((item): RoomsTypes.RoomsFilePart => ({ type: 'file', mediaType: item.mediaType, filename: item.name, url: `${ROOM.fileUrlPrefix}${item.id ?? ''}` })),
  };
}
