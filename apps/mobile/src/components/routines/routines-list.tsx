import { ROOMS, routinesIsFailed, routinesLastRunText, routinesScheduleText, routinesSections } from '@repo/client/client';
import { getLocale, m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CalendarClock, EllipsisVertical, TriangleAlert } from 'lucide-react-native';
import { Switch, View } from 'react-native';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { Card } from '@/components/ui/card';
import { Empty, EmptyLink } from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Item, ItemTitle } from '@/components/ui/item';
import { ContextMenu, Menu } from '@/components/ui/menu';
import { Text } from '@/components/ui/text';
import { useToast } from '@/hooks/use-toast';
import type { BotDetailsSectionProps } from '@/types/bot-details.types';
import type { RpcSession } from '@/types/rpc.types';

interface RoutinesListProps extends BotDetailsSectionProps {
  session: RpcSession;
}

export function RoutinesList({ session, bot, onPrefill }: RoutinesListProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const list = useQuery(session.rpc.routines.list.queryOptions({ input: { botId: bot.id }, refetchInterval: ROOMS.routinesRefreshMs }));

  const update = useMutation(session.rpc.routines.update.mutationOptions({
    onError: () => toast.show({ message: m.rooms_routines_action_failed() }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: session.rpc.routines.key() }),
  }));

  const run = useMutation(session.rpc.routines.run.mutationOptions({
    onError: () => toast.show({ message: m.rooms_routines_action_failed() }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: session.rpc.routines.key() }),
  }));

  const routines = list.data ?? [];
  const isBusy = update.isPending || run.isPending;
  const sections = routinesSections(routines);

  return (
    <View className="gap-2">
      {list.isError ? <Text tone="destructive" variant="small">{m.rooms_routines_error()}</Text> : null}
      {list.isSuccess && routines.length === 0 ? (
        <Empty
          description={(
            <>
              {`${m.rooms_routines_empty_hint({ bot: bot.name })} `}
              <EmptyLink onPress={() => onPrefill(m.rooms_routines_prefill())}>{m.rooms_prefill_create_inline()}</EmptyLink>
              {` ${m.rooms_prefill_by_asking({ bot: bot.name })}`}
            </>
          )}
          icon={(
            <Icon
              icon={CalendarClock}
              size="lg"
              tone="muted"
            />
          )}
          size="sm"
          title={m.rooms_routines_empty_title()}
        />
      ) : null}
      {sections.map((section) => (
        <BotDetailsSection key={section.title} title={section.title}>
          <Card className="overflow-hidden">
            {section.routines.map((routine) => (
              <Item key={routine.id} size="sm">
                {routinesIsFailed(routine) ? (
                  <Menu items={[{ label: m.rooms_routines_failed(), systemImage: 'exclamationmark.triangle' }]}>
                    <View
                      accessibilityLabel={m.rooms_routines_failed()}
                      accessibilityRole="button"
                      className="size-8 items-center justify-center"
                    >
                      <Icon
                        icon={TriangleAlert}
                        size="sm"
                        tone="destructive"
                      />
                    </View>
                  </Menu>
                ) : null}
                <View className="min-w-0 flex-1">
                  <ContextMenu
                    isFullWidth
                    items={[
                      { label: routinesScheduleText({ schedule: routine.schedule, locale: getLocale() }), systemImage: 'calendar' },
                      { label: routinesLastRunText(routine), systemImage: routinesIsFailed(routine) ? 'exclamationmark.triangle' : 'clock' },
                    ]}
                    title={routine.name}
                  >
                    <ItemTitle numberOfLines={1}>{routine.name}</ItemTitle>
                  </ContextMenu>
                </View>
                <View className="h-8 justify-center">
                  <Switch
                    accessibilityLabel={m.rooms_routines_toggle({ name: routine.name })}
                    disabled={isBusy}
                    value={routine.isEnabled}
                    onValueChange={(isEnabled) => update.mutate({
                      botId: bot.id,
                      routineId: routine.id,
                      isEnabled,
                    })}
                  />
                </View>
                <Menu
                  isDisabled={isBusy}
                  items={[
                    {
                      label: m.rooms_routines_run(),
                      systemImage: 'arrow.clockwise',
                      onSelect: () => run.mutate({ botId: bot.id, routineId: routine.id }, {
                        onSuccess: () => toast.show({ message: m.rooms_routines_started({ name: routine.name }) }),
                      }),
                    },
                    {
                      label: m.rooms_routines_edit(),
                      systemImage: 'pencil',
                      onSelect: () => router.push({ pathname: '/bots/[botId]/routines/[routineId]/edit', params: { botId: bot.id, routineId: routine.id } }),
                    },
                    {
                      label: m.rooms_routines_delete(),
                      systemImage: 'trash',
                      isDestructive: true,
                      hasDividerBefore: true,
                      onSelect: () => router.push({ pathname: '/bots/[botId]/routines/[routineId]/delete', params: { botId: bot.id, routineId: routine.id } }),
                    },
                  ]}
                >
                  <View
                    accessibilityLabel={m.rooms_routines_actions()}
                    accessibilityRole="button"
                    className="size-8 items-center justify-center"
                  >
                    <Icon icon={EllipsisVertical} tone="muted" />
                  </View>
                </Menu>
              </Item>
            ))}
          </Card>
        </BotDetailsSection>
      ))}
      {routines.length > 0 ? (
        <Text tone="muted" variant="small">
          <EmptyLink onPress={() => onPrefill(m.rooms_routines_prefill())}>{m.rooms_prefill_create()}</EmptyLink>
        </Text>
      ) : null}
    </View>
  );
}
