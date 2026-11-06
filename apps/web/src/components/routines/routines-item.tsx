import { routinesIsFailed, routinesLastRunText, routinesScheduleText } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { getLocale } from '@repo/i18n/runtime';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@repo/ui/hover-card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@repo/ui/item';
import { toasty } from '@repo/ui/sonner';
import { Switch } from '@repo/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useMatch } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { rpc } from '@/services/rpc/rpc.client';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconPencil from '~icons/lucide/pencil';
import IconRotateCw from '~icons/lucide/rotate-cw';
import IconTrash from '~icons/lucide/trash-2';
import IconTriangleAlert from '~icons/lucide/triangle-alert';
import type { Bot, Routine } from '@repo/contracts/universal';

interface RoutinesItemProps {
  bot: Bot
  routine: Routine
}

export function RoutinesItem({ bot, routine }: RoutinesItemProps) {
  const queryClient = useQueryClient();
  const title = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFailedOpen, setIsFailedOpen] = useState(false);
  const isFailed = routinesIsFailed(routine);

  const changeFailedOpen = (open: boolean) => {
    setIsFailedOpen(open);
    setIsOpen((current) => current && !open);
  };

  const params = { botId: bot.id, routineId: routine.id };
  const isInBotDialog = Boolean(useMatch({ from: '/_chat/bots', shouldThrow: false }));

  const settled = {
    onError: () => toasty(m.rooms_routines_action_failed(), '⚠️'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: rpc.routines.key() }),
  };

  const update = useMutation(rpc.routines.update.mutationOptions(settled));

  const run = useMutation(rpc.routines.run.mutationOptions({
    ...settled,
    onSuccess: () => toasty(m.rooms_routines_started({ name: routine.name }), '⏱️'),
  }));

  const pending = update.isPending || run.isPending;

  return (
    <HoverCard
      closeDelay={100}
      open={isOpen}
      openDelay={200}
      onOpenChange={(open) => setIsOpen(open && !isFailedOpen)}
    >
      <HoverCardTrigger
        asChild
        onFocus={(event) => {
          if (!title.current?.contains(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <Item size="sm">
          <ItemContent className="min-w-0">
            <ItemTitle className="w-full">
              {isFailed ? (
                <HoverCard
                  closeDelay={100}
                  open={isFailedOpen}
                  openDelay={200}
                  onOpenChange={changeFailedOpen}
                >
                  <HoverCardTrigger asChild>
                    <button
                      aria-label={m.rooms_routines_failed()}
                      className="shrink-0 rounded-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="button"
                      onClick={() => changeFailedOpen(true)}
                    >
                      <IconTriangleAlert aria-hidden className="size-3.5" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-auto" side="top">
                    <p className="text-xs">{m.rooms_routines_failed()}</p>
                  </HoverCardContent>
                </HoverCard>
              ) : null}
              <button
                className="min-w-0 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                ref={title}
                type="button"
                onClick={() => setIsOpen(true)}
              >
                {routine.name}
              </button>
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <Switch
              aria-label={m.rooms_routines_toggle({ name: routine.name })}
              checked={routine.isEnabled}
              disabled={pending}
              onCheckedChange={(isEnabled) => update.mutate({ ...params, isEnabled })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={m.rooms_routines_actions()}
                  disabled={pending}
                  size="icon-xs"
                  title={m.rooms_routines_actions()}
                  type="button"
                  variant="ghost"
                >
                  <IconEllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => run.mutate(params)}>
                  <IconRotateCw />
                  {m.rooms_routines_run()}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    params={params}
                    replace={isInBotDialog}
                    resetScroll={false}
                    to="/bots/$botId/routines/$routineId/edit"
                  >
                    <IconPencil />
                    {m.rooms_routines_edit()}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild variant="destructive">
                  <Link
                    params={params}
                    replace={isInBotDialog}
                    resetScroll={false}
                    to="/bots/$botId/routines/$routineId/delete"
                  >
                    <IconTrash />
                    {m.rooms_routines_delete()}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        </Item>
      </HoverCardTrigger>
      <HoverCardContent className="flex flex-col gap-1" side="top">
        <span className="text-sm font-medium wrap-break-word">{routine.name}</span>
        <span className="text-xs text-muted-foreground">{routinesScheduleText({ schedule: routine.schedule, locale: getLocale() })}</span>
        <span className={isFailed ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{routinesLastRunText(routine)}</span>
      </HoverCardContent>
    </HoverCard>
  );
}
