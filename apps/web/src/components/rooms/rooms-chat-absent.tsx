import { m } from '@orbs/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rpc } from '@/services/rpc/rpc.client';
import type { Bot, RoomMessageRoute, TenantRoomSummary } from '@orbs/server/client';

export function RoomsChatAbsent({ pick, room, bots }: { pick: RoomMessageRoute['picks'][number]; room: TenantRoomSummary; bots: Bot[] }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: rooms = [] } = useQuery(rpc.rooms.list.queryOptions());
  const bot = bots.find((item) => item.id === pick.botId);
  const team = [...room.botIds, pick.botId];
  const teamNames = team.map((botId) => bots.find((item) => item.id === botId)?.name ?? pick.botName).join(', ');
  const withBot = rooms.filter((item) => item.kind === 'group' && item.botIds.includes(pick.botId));

  const openTeam = useMutation(rpc.rooms.openTeam.mutationOptions({
    onSuccess: async (opened) => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: rpc.rooms.list.key() });
      await navigate({ to: '/rooms/$roomId', params: { roomId: opened.id } });
    },
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="underline underline-offset-2 hover:text-foreground" type="button">{pick.botName}</button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-2 text-xs">
          <p className="font-medium">{m.rooms_absent_title({ bot: pick.botName })}</p>
          <p className="text-muted-foreground">{withBot.length > 0 ? m.rooms_absent_rooms({ bot: pick.botName }) : m.rooms_absent_none({ bot: pick.botName })}</p>
          {withBot.map((item) => (
            <Link
              className="truncate hover:underline"
              key={item.id}
              params={{ roomId: item.id }}
              to="/rooms/$roomId"
              onClick={() => setOpen(false)}
            >
              # {item.name}
            </Link>
          ))}
          {bot ? (
            <Link
              className="hover:underline"
              params={{ handle: bot.handle }}
              to="/rooms/direct/$handle"
              onClick={() => setOpen(false)}
            >
              {m.rooms_absent_direct({ bot: bot.name })}
            </Link>
          ) : null}
          <Button
            className="h-auto min-h-9 whitespace-normal"
            disabled={openTeam.isPending}
            size="sm"
            variant="outline"
            onClick={() => openTeam.mutate({ name: `${room.name} + ${pick.botName}`, botIds: team })}
          >
            {m.rooms_absent_team({ bots: teamNames })}
          </Button>
          {openTeam.isError ? <p className="text-destructive" role="alert">{m.rooms_absent_team_error()}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
