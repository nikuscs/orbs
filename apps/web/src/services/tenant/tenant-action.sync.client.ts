import { match, P } from 'ts-pattern';
import { rpc } from '@/services/rpc/rpc.client';
import { tenantTimelinePatch } from '@/services/tenant/tenant.utils';
import { ROOM, roomOrder } from '@orbs/server/client';
import type * as TenantTypes from '@/types/tenant.types';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

export function tenantActionSync(queryClient: QueryClient, tenantSubscribe: TenantTypes.TenantSubscribe): TenantTypes.TenantUnsubscribe {
  const cache = queryClient.getQueryCache();
  const snapshots = new Map<string, Promise<TenantTypes.TenantCacheUpdate>[]>();
  let updates = Promise.resolve();
  let closed = false;

  const tenantApply = (patch: Promise<TenantTypes.TenantCacheUpdate>) => {
    updates = updates
      .then(() => patch)
      .then((update) => {
        if (!closed) {
          update();
        }
      })
      .catch(() => {
        if (!closed) {
          void queryClient.invalidateQueries({ queryKey: rpc.rooms.key() });
        }
      });
  };

  const tenantPatchQuery = (key: QueryKey, patch: Promise<TenantTypes.TenantCacheUpdate>) => {
    const query = cache.find({ queryKey: key, exact: true });

    const guarded = patch.then((update) => () => {
      const stale = queryClient.getQueryState(key)?.isInvalidated;
      update();

      if (stale) {
        void queryClient.invalidateQueries({
          queryKey: key,
          exact: true,
          refetchType: 'none',
        });
      }
    });

    if (query?.state.fetchStatus === 'fetching') {
      const pending = snapshots.get(query.queryHash) ?? [];
      pending.push(guarded);
      snapshots.set(query.queryHash, pending);
    }

    tenantApply(guarded);
  };

  const stopCache = cache.subscribe((event) => {
    if (event.type === 'removed' || (event.type === 'updated' && event.action.type === 'error')) {
      snapshots.delete(event.query.queryHash);
      return;
    }

    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) {
      return;
    }

    const pending = snapshots.get(event.query.queryHash) ?? [];
    snapshots.delete(event.query.queryHash);

    for (const patch of pending) {
      tenantApply(patch);
    }
  });

  const tenantPatchTimeline = (event: TenantTypes.TenantTimelineEvent) => {
    const key = rpc.rooms.timeline.queryKey({ input: { roomId: event.roomId } });

    const patch = tenantTimelinePatch(event).then((update) => () => {
      const active = cache.find({ queryKey: key, exact: true })?.isActive();

      queryClient.setQueryData(key, (cached) => {
        if (!cached) {
          return cached;
        }

        const next = update(cached);

        return active ? next : { ...next, messages: next.messages.slice(-ROOM.timelineLimit) };
      });
    });

    tenantPatchQuery(key, patch);
  };

  const tenantPatchPreview = (event: TenantTypes.TenantMessageCreated) => {
    const key = rpc.rooms.list.queryKey();

    tenantPatchQuery(
      key,
      Promise.resolve(() => {
        queryClient.setQueryData(key, (rooms) =>
          rooms
            ?.map((room) => {
              const newer = !room.lastMessage || room.lastMessage.createdAt <= event.preview.createdAt;

              return room.id === event.roomId && newer ? { ...room, lastMessage: event.preview } : room;
            })
            .sort(roomOrder),
        );
      }),
    );
  };

  const unsubscribe = tenantSubscribe((event) => {
    match(event)
      .with({ type: 'memory.updated' }, () => {
        void queryClient.invalidateQueries({ queryKey: rpc.memory.key() });
      })
      .with({ type: 'tenant.connected' }, () => {
        void queryClient.invalidateQueries({ queryKey: rpc.memory.key() });
        void queryClient.invalidateQueries({ queryKey: rpc.rooms.key() });
        void queryClient.invalidateQueries({ queryKey: rpc.bots.list.key() });
      })
      .with({ type: 'bot.deleted' }, { type: 'bot.updated' }, () => {
        void queryClient.invalidateQueries({ queryKey: rpc.bots.list.key() });
      })
      .with({ type: P.union('room.updated', 'room.deleted') }, ({ roomId }) => {
        void queryClient.invalidateQueries({ queryKey: rpc.rooms.list.key() });
        void queryClient.invalidateQueries({ queryKey: rpc.rooms.timeline.key({ input: { roomId } }) });
      })
      .with({ type: 'rooms.arranged' }, () => {
        void queryClient.invalidateQueries({ queryKey: rpc.rooms.list.key() });
      })
      .with({ type: 'reaction.updated' }, ({ roomId }) => {
        void queryClient.invalidateQueries({ queryKey: rpc.rooms.reactions.key({ input: { roomId } }) });
      })
      .with({ type: 'message.created' }, (created) => {
        tenantPatchTimeline(created);
        tenantPatchPreview(created);
      })
      .with({ type: P.union('message.routed', 'run.updated', 'run.activity') }, tenantPatchTimeline)
      .with({ type: 'run.chunk' }, () => undefined)
      .exhaustive();
  });

  return () => {
    closed = true;
    stopCache();
    unsubscribe();
  };
}
