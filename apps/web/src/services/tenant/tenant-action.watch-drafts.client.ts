import { readUIMessageStream } from 'ai';
import { rpc } from '../rpc/rpc.client';
import { tenantActionSubscribe } from './tenant-action.subscribe.client';
import type * as TenantTypes from '@/types/tenant.types';
import type { RoomUIMessage } from '@orbs/server/client';
import type { UIMessageChunk } from 'ai';

export function tenantActionWatchDrafts(
  state: TenantTypes.TenantState,
  { roomId, onDraft }: TenantTypes.TenantWatchDraftsParams,
): TenantTypes.TenantUnsubscribe {
  function tenantDraftWriter(runId: string): WritableStreamDefaultWriter<UIMessageChunk> {
    const pipe = new TransformStream<UIMessageChunk, UIMessageChunk>();

    void (async () => {
      for await (const message of readUIMessageStream<RoomUIMessage>({ stream: pipe.readable })) {
        onDraft(runId, message);
      }
    })();

    return pipe.writable.getWriter();
  }

  const writers = new Map<string, WritableStreamDefaultWriter<UIMessageChunk>>();
  const applied = new Map<string, number>();
  let waiting: TenantTypes.TenantRunChunk[] | undefined = [];
  let seeding = false;
  let reseed = false;
  let closed = false;

  const tenantApply = (runId: string, chunkId: number, chunk: UIMessageChunk) => {
    if ((applied.get(runId) ?? 0) >= chunkId) {
      return;
    }

    applied.set(runId, chunkId);
    const writer = writers.get(runId) ?? tenantDraftWriter(runId);
    writers.set(runId, writer);
    void writer.write(chunk);

    if (chunk.type === 'finish') {
      void writer.close();
      writers.delete(runId);
    }
  };

  const tenantSeed = () => {
    if (seeding) {
      reseed = true;
      return;
    }

    seeding = true;

    for (const writer of writers.values()) {
      void writer.close();
    }

    writers.clear();
    applied.clear();
    waiting = [];
    void rpc.rooms.drafts.call({ roomId }).catch(() => []).then((drafts) => {
      if (closed) {
        return;
      }

      for (const draft of drafts) {
        for (const item of draft.chunks) {
          tenantApply(draft.runId, item.id, item.chunk);
        }
      }

      const live = waiting ?? [];
      waiting = undefined;

      for (const item of live) {
        tenantApply(item.runId, item.chunkId, item.chunk);
      }
    }).finally(() => {
      seeding = false;

      if (reseed && !closed) {
        reseed = false;
        tenantSeed();
      }
    });
  };

  const unsubscribe = tenantActionSubscribe(state, (event) => {
    if (event.type === 'tenant.connected') {
      tenantSeed();
    } else if (event.type === 'run.chunk' && event.roomId === roomId) {
      if (waiting) {
        waiting.push({
          runId: event.runId,
          chunkId: event.chunkId,
          chunk: event.chunk,
        });
      } else {
        tenantApply(event.runId, event.chunkId, event.chunk);
      }
    }
  });

  if (state.socket?.readyState === WebSocket.OPEN) {
    tenantSeed();
  }

  return () => {
    closed = true;
    unsubscribe();

    for (const writer of writers.values()) {
      void writer.close();
    }
  };
}
