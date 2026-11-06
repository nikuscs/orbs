import { ROOMS, routinesSections } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { EmptyCompact } from '@repo/ui/empty';
import { FormErrors } from '@repo/ui/forms/form';
import { ItemGroup } from '@repo/ui/item';
import { RoomsDetailsSection } from '@repo/ui/rooms/rooms-details-section';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { RoomsPrefillLink } from '@/components/rooms/rooms-prefill-link';
import { RoutinesItem } from '@/components/routines/routines-item';
import { rpc } from '@/services/rpc/rpc.client';
import IconCalendarClock from '~icons/lucide/calendar-clock';
import type { Bot } from '@repo/contracts/universal';

interface RoutinesListProps {
  bot: Bot
}

export function RoutinesList({ bot }: RoutinesListProps) {
  const list = useQuery(rpc.routines.list.queryOptions({ input: { botId: bot.id }, refetchInterval: ROOMS.routinesRefreshMs }));
  const sections = routinesSections(list.data ?? []);

  return (
    <div className="flex flex-col gap-3">
      <FormErrors error={list.isError ? m.rooms_routines_error() : null} />
      {list.isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((key) => (
            <div className="flex flex-col gap-1.5" key={key}>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : null}
      {sections.map((section) => (
        <RoomsDetailsSection key={section.title} title={section.title}>
          <ItemGroup variant="outline">
            {section.routines.map((routine) => (
              <RoutinesItem
                bot={bot}
                key={routine.id}
                routine={routine}
              />
            ))}
          </ItemGroup>
        </RoomsDetailsSection>
      ))}
      {list.isSuccess && list.data.length === 0 ? (
        <EmptyCompact
          description={(
            <>
              {m.rooms_routines_empty_hint({ bot: bot.name })}
              {' '}
              <RoomsPrefillLink bot={bot} prompt={m.rooms_routines_prefill()}>{m.rooms_prefill_create_inline()}</RoomsPrefillLink>
              {' '}
              {m.rooms_prefill_by_asking({ bot: bot.name })}
            </>
          )}
          icon={<IconCalendarClock />}
          title={m.rooms_routines_empty_title()}
        />
      ) : null}
      {(list.data ?? []).length > 0 ? (
        <p className="text-xs text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary">
          <RoomsPrefillLink bot={bot} prompt={m.rooms_routines_prefill()}>{m.rooms_prefill_create()}</RoomsPrefillLink>
        </p>
      ) : null}
    </div>
  );
}
