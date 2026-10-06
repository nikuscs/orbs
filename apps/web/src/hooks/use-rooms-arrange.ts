import { m } from '@orbs/i18n/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toasty } from '@/components/ui/sonner';
import { useRoomsRefresh } from '@/hooks/use-rooms-refresh';
import { rpc } from '@/services/rpc/rpc.client';
import { roomOrder } from '@orbs/server/client';

export function useRoomsArrange() {
  const queryClient = useQueryClient();
  const refresh = useRoomsRefresh();

  const arrange = useMutation(rpc.rooms.arrange.mutationOptions({
    onError: () => toasty(m.rooms_arrange_failed(), '⚠️'),
    onSettled: refresh,
  }));

  return (pinned: string[], placed: string[]) => {
    queryClient.setQueryData(rpc.rooms.list.queryKey(), (rooms) => rooms?.map((room) => {
      const pin = pinned.indexOf(room.id);
      const place = placed.indexOf(room.id);

      if (pin !== -1) {
        return { ...room, pinned: 1, position: pin };
      }

      return { ...room, pinned: 0, position: place === -1 ? null : place };
    }).sort(roomOrder));
    arrange.mutate({ pinned, placed });
  };
}
