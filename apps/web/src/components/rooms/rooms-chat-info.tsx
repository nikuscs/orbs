import { m } from '@orbs/i18n/client';
import { getLocale } from '@orbs/i18n/runtime';
import { useHydrated } from '@tanstack/react-router';
import { RoomsChatRoute } from '@/components/rooms/rooms-chat-route';
import { botUsageLabel } from '@/services/bot/bot.client';
import type { Bot, RoomUIMessage, TenantRoomSummary } from '@orbs/server/client';

export function RoomsChatInfo({ message, trigger, room, bots }: { message: RoomUIMessage; trigger?: RoomUIMessage; room: TenantRoomSummary; bots: Bot[] }) {
  const hydrated = useHydrated();
  const route = message.metadata?.route;
  const reply = message.role === 'assistant';
  const decision = reply ? trigger?.metadata?.route : route;
  const next = reply && route && route.via !== 'none' ? route : null;
  const usage = reply ? message.metadata?.usage : null;
  const sent = hydrated && message.metadata ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.metadata.createdAt)) : null;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {decision ? (
        <RoomsChatRoute
          bots={bots}
          room={room}
          route={decision}
          title={m.rooms_route_title()}
        />
      ) : null}
      {next ? (
        <RoomsChatRoute
          bots={bots}
          room={room}
          route={next}
          title={m.rooms_route_next()}
        />
      ) : null}
      {sent || usage ? (
        <div className="flex flex-col gap-0.5 text-muted-foreground">
          {sent ? <p>{m.rooms_chat_sent({ date: sent })}</p> : null}
          {usage ? <p className="tabular-nums">{botUsageLabel(usage)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
