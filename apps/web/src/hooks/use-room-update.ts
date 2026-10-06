import { m } from '@orbs/i18n/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toasty } from '@/components/ui/sonner';
import { useRoomsRefresh } from '@/hooks/use-rooms-refresh';
import { rpc } from '@/services/rpc/rpc.client';

export function useRoomUpdateMutation() {
  const queryClient = useQueryClient();
  const refresh = useRoomsRefresh();

  return useMutation(rpc.rooms.update.mutationOptions({
    onSuccess: async (room) => {
      queryClient.setQueryData(rpc.rooms.timeline.queryKey({ input: { roomId: room.id } }), (timeline) => (timeline ? { ...timeline, room } : timeline));
      await refresh();
    },
  }));
}

export function useRoomUpdate(roomId: string) {
  const update = useRoomUpdateMutation();

  return async (fields: { name?: string; description?: string }) => {
    await update.mutateAsync({ roomId, ...fields }).catch(() => toasty(m.rooms_update_failed(), '⚠️'));
  };
}
