import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toasty } from '@/components/ui/sonner';
import { useRoomsArrange } from '@/hooks/use-rooms-arrange';
import { rpc } from '@/services/rpc/rpc.client';
import IconCopy from '~icons/lucide/copy';
import IconPencilLine from '~icons/lucide/pencil-line';
import IconPin from '~icons/lucide/pin';
import IconPinOff from '~icons/lucide/pin-off';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconSettings2 from '~icons/lucide/settings-2';
import IconTrash2 from '~icons/lucide/trash-2';
import type { TenantRoomSummary } from '@orbs/server/client';

export function RoomsActions({ room, directHandle, onRename }: { room: TenantRoomSummary; directHandle?: string; onRename?: () => void }) {
  const params = { roomId: room.id };
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const arrange = useRoomsArrange();
  const others = rooms.filter((item) => item.id !== room.id);

  const togglePin = () =>
    arrange(
      [...others.filter((item) => item.pinned === 1).map((item) => item.id), ...(room.pinned === 1 ? [] : [room.id])],
      others.filter((item) => item.pinned !== 1 && item.position !== null).map((item) => item.id),
    );

  return (
    <>
      {directHandle ? (
        <DropdownMenuItem asChild>
          <Link
            mask={{ to: '/bots/$botId/edit', params: { botId: room.botIds[0] }, unmaskOnReload: true }}
            params={{ handle: directHandle }}
            resetScroll={false}
            to="/rooms/direct/$handle/edit"
          >
            <IconPencilLine className="size-4" />
            {m.rooms_action_edit_bot()}
          </Link>
        </DropdownMenuItem>
      ) : null}

      <DropdownMenuItem asChild>
        <Link
          params={params}
          resetScroll={false}
          to="/rooms/$roomId/settings"
        >
          <IconSettings2 className="size-4" />
          {m.rooms_action_settings()}
        </Link>
      </DropdownMenuItem>

      {room.kind === 'group' && onRename ? (
        <DropdownMenuItem onSelect={onRename}>
          <IconPencilLine className="size-4" />
          {m.rooms_action_rename()}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onSelect={togglePin}>
        {room.pinned === 1 ? <IconPinOff className="size-4" /> : <IconPin className="size-4" />}
        {room.pinned === 1 ? m.rooms_action_unpin() : m.rooms_action_pin()}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void navigator.clipboard.writeText(room.id);
          toasty(m.rooms_action_copied(), '📋');
        }}
      >
        <IconCopy className="size-4" />
        {m.rooms_action_copy_id()}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        {directHandle ? (
          <Link
            params={{ handle: directHandle }}
            resetScroll={false}
            to="/rooms/direct/$handle/reset"
          >
            <IconRotateCcw className="size-4" />
            {m.rooms_member_reset()}
          </Link>
        ) : (
          <Link
            params={params}
            resetScroll={false}
            to="/rooms/$roomId/reset"
          >
            <IconRotateCcw className="size-4" />
            {m.rooms_reset_all()}
          </Link>
        )}
      </DropdownMenuItem>
      {room.kind === 'group' ? (
        <DropdownMenuItem asChild variant="destructive">
          <Link
            params={params}
            resetScroll={false}
            to="/rooms/$roomId/delete"
          >
            <IconTrash2 className="size-4" />
            {m.rooms_action_delete()}
          </Link>
        </DropdownMenuItem>
      ) : null}
      {room.kind === 'direct' && bots.length > 1 ? (
        <DropdownMenuItem asChild variant="destructive">
          <Link
            params={{ botId: room.botIds[0] }}
            resetScroll={false}
            to="/bots/$botId/delete"
          >
            <IconTrash2 className="size-4" />
            {m.rooms_bot_delete()}
          </Link>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}
