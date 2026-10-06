import { m } from '@orbs/i18n/client';
import { RoomAvatar } from '@/components/rooms/room-avatar';
import { useSidebar } from '@/components/ui/sidebar';
import { tenantRoomTitle } from '@/services/tenant/tenant.utils';
import type { BotActivity } from '@/types/bot.types';
import type { Bot, TenantRoomSummary } from '@orbs/server/client';

export function RoomsChatPill({ room, members, activities }: { room: TenantRoomSummary; members: Bot[]; activities: Map<string, BotActivity> }) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const { title } = tenantRoomTitle({ room, members });

  return (
    <button
      aria-expanded={isMobile ? openMobile : open}
      className="flex h-9 max-w-44 min-w-0 items-center gap-2 rounded-full border bg-background pr-4 pl-1.5 text-left shadow-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      title={m.rooms_details()}
      type="button"
      onClick={toggleSidebar}
    >
      <RoomAvatar
        activities={activities}
        leaderId={room.leaderBotId}
        members={members}
        size={24}
      />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-sm/4 font-medium">{title}</span>
      </span>
    </button>
  );
}
