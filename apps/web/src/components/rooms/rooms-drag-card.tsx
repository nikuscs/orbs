import { RoomAvatar } from '@/components/rooms/room-avatar';
import { tenantRoomTitle } from '@/services/tenant/tenant.utils';
import type { Bot, TenantRoomListItem } from '@orbs/server/client';

export function RoomsDragCard({ room, members }: { room: TenantRoomListItem; members: Bot[] }) {
  const { title } = tenantRoomTitle({ room, members });

  return (
    <div className="flex w-56 cursor-grabbing items-center gap-2.5 rounded-xl border bg-sidebar p-2 text-sm shadow-sm">
      <RoomAvatar
        animate={false}
        leaderId={room.leaderBotId}
        members={members}
        size={32}
      />
      <span className="truncate font-medium">{title}</span>
    </div>
  );
}
