import { m } from '@orbs/i18n/client';
import { Fragment } from 'react';
import { RoomsChatAbsent } from '@/components/rooms/rooms-chat-absent';
import type { Bot, RoomMessageRoute, TenantRoomSummary } from '@orbs/server/client';

export function RoomsChatRoute({ title, route, room, bots }: { title: string; route: RoomMessageRoute; room: TenantRoomSummary; bots: Bot[] }) {
  const absent = route.absent ?? [];

  const explanations = {
    mention: m.rooms_route_mention(),
    direct: m.rooms_route_direct(),
    vision: m.rooms_route_vision(),
    lead: m.rooms_route_lead(),
    jev: m.rooms_route_jev(),
    none: m.rooms_route_none(),
    budget: m.rooms_route_budget(),
    error: route.picks.length > 0 ? m.rooms_route_error() : m.rooms_route_error_none(),
    steer: m.rooms_route_steer(),
    reaction: m.rooms_route_reaction(),
    reply: m.rooms_route_reply(),
    roundtable: m.rooms_route_roundtable(),
    judge: m.rooms_route_judge(),
  } satisfies Record<RoomMessageRoute['via'], string>;

  return (
    <section className="flex flex-col gap-1.5">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{explanations[route.via]}</p>
      {route.picks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {route.picks.map((pick) => (
            <li className="flex items-center justify-between gap-3" key={pick.botId}>
              <span className="truncate">{pick.botName}</span>
              {pick.score === null ? null : <span className="shrink-0 text-muted-foreground tabular-nums">{m.rooms_route_score({ score: Math.round(pick.score * 100) })}</span>}
            </li>
          ))}
        </ul>
      ) : null}
      {absent.length > 0 ? (
        <p className="text-muted-foreground">
          {`${m.rooms_route_absent()} `}
          {absent.map((pick, index) => (
            <Fragment key={pick.botId}>
              {index > 0 ? ', ' : null}
              <RoomsChatAbsent
                bots={bots}
                pick={pick}
                room={room}
              />
            </Fragment>
          ))}
        </p>
      ) : null}
    </section>
  );
}
