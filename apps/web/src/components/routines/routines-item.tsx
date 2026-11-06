import { routinesScheduleText } from '@repo/client/client';
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
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@repo/ui/item';
import { toasty } from '@repo/ui/sonner';
import { Switch } from '@repo/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useHydrated, useMatch } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useState } from 'react';
import { rpc } from '@/services/rpc/rpc.client';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconPencil from '~icons/lucide/pencil';
import IconRotateCw from '~icons/lucide/rotate-cw';
import IconTrash from '~icons/lucide/trash-2';
import type { Bot, Routine } from '@repo/contracts/universal';

interface RoutinesItemProps {
  bot: Bot
  routine: Routine
}

export function RoutinesItem({ bot, routine }: RoutinesItemProps) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const title = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const node = title.current;

    if (!node) {
      return undefined;
    }

    const observer = new ResizeObserver(() => setIsTruncated(node.scrollWidth > node.clientWidth));
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

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
  const when = hydrated ? routinesScheduleText({ schedule: routine.schedule, locale: getLocale() }) : routine.name;

  return (
    <Item size="sm">
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate" ref={title}>{routine.name}</span>
            </TooltipTrigger>
            {isTruncated ? <TooltipContent className="max-w-64 wrap-break-word">{routine.name}</TooltipContent> : null}
          </Tooltip>
        </ItemTitle>
        <ItemDescription className="truncate">{when}</ItemDescription>
        {routine.lastRun?.status === 'unanswered' ? (
          <p className="text-xs text-destructive" role="alert">{m.rooms_routines_failed()}</p>
        ) : null}
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
  );
}
