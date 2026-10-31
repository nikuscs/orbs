import { botUsageLabel } from '@repo/client/client';
import { useIsMobile } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { getLocale } from '@repo/i18n/runtime';
import { BotAvatar } from '@repo/ui/bots/bot-avatar';
import { Button } from '@repo/ui/button';
import { Item, ItemActions, ItemContent, ItemGroup, ItemLink, ItemMedia, ItemTitle, ItemValue } from '@repo/ui/item';
import { RoomsDetailsSection } from '@repo/ui/rooms/rooms-details-section';
import { RoomsSettingsMenu } from '@repo/ui/rooms/rooms-settings-menu';
import * as Sidebar from '@repo/ui/sidebar';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useHydrated, useMatch, useMatchRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { match, P } from 'ts-pattern';
import { RoomsChatContextItem } from '@/components/rooms/rooms-chat-context';
import { RoomsDetailsBot } from '@/components/rooms/rooms-details-bot';
import { RoomsDetailsMedia } from '@/components/rooms/rooms-details-media';
import { RoutinesList } from '@/components/routines/routines-list';
import { TodosList } from '@/components/todos/todos-list';
import { rpc } from '@/services/rpc/rpc.client';
import IconActivity from '~icons/lucide/activity';
import IconCalendarClock from '~icons/lucide/calendar-clock';
import IconChevronLeft from '~icons/lucide/chevron-left';
import IconChevronRight from '~icons/lucide/chevron-right';
import IconImages from '~icons/lucide/images';
import IconListTodo from '~icons/lucide/list-todo';
import IconX from '~icons/lucide/x';
import type { RoomsChat } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';
import type { RoomsDetailsPage } from '@repo/ui/rooms.types';

export function RoomsDetails() {
  const direct = useMatch({ from: '/_chat/rooms/direct/$handle', shouldThrow: false });
  const botId = direct?.loaderData?.botId;

  return botId ? <RoomsDetailsPanel botId={botId} key={botId} /> : null;
}

interface RoomsDetailsPanelProps {
  botId: string
}

function RoomsDetailsPanel({ botId }: RoomsDetailsPanelProps) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { data: chats } = useSuspenseQuery(rpc.conversation.list.queryOptions());
  const { toggleSidebar } = Sidebar.useSidebar();
  const bot = bots.find((item) => item.id === botId);
  const chat = chats.find((item) => item.botId === botId);
  const page = useRoomsDetailsPage(bot?.handle);

  if (!bot || !chat) {
    return null;
  }

  return (
    <Sidebar.Sidebar side="right" variant="panel">
      <div className="cursor-default electrobun-webkit-app-region-drag">
        <Sidebar.SidebarHeader className="items-center gap-1 text-center">
          <div className="flex w-full items-center justify-between">
            <span className="electrobun-webkit-app-region-no-drag">
              {page ? (
                <Button
                  asChild
                  aria-label={m.rooms_details_back()}
                  size="icon-sm"
                  title={m.rooms_details_back()}
                  variant="outline"
                >
                  <Link params={{ handle: bot.handle }} to="/rooms/direct/$handle">
                    <IconChevronLeft className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </span>
            <span className="electrobun-webkit-app-region-no-drag">
              <Button
                aria-label={m.rooms_details_close()}
                size="icon-sm"
                title={m.rooms_details_close()}
                variant="outline"
                onClick={toggleSidebar}
              >
                <IconX className="size-4" />
              </Button>
            </span>
          </div>
          <div className="contents electrobun-webkit-app-region-no-drag">
            <RoomsSettingsMenu align="center" chat={chat}>
              <span className="mb-1">
                <BotAvatar bot={bot} size={56} />
              </span>
            </RoomsSettingsMenu>
            <h2 className="max-w-full truncate font-medium">{bot.name}</h2>
            <p className="max-w-full truncate text-xs text-muted-foreground">@{bot.handle}</p>
          </div>
        </Sidebar.SidebarHeader>
      </div>
      <Sidebar.SidebarContent>
        <div className="flex flex-col gap-4 px-4 py-2">
          <RoomsDetailsContent
            bot={bot}
            chat={chat}
            page={page}
          />
        </div>
      </Sidebar.SidebarContent>
      <Sidebar.SidebarRail />
    </Sidebar.Sidebar>
  );
}

function useRoomsDetailsPage(handle: string | undefined): RoomsDetailsPage | undefined {
  const matchRoute = useMatchRoute();
  const params = { handle: handle ?? '' };

  if (matchRoute({
    to: '/rooms/direct/$handle/todos',
    params,
    fuzzy: true,
  })) {
    return 'todos';
  }

  if (matchRoute({ to: '/rooms/direct/$handle/routines', params })) {
    return 'routines';
  }

  return matchRoute({ to: '/rooms/direct/$handle/media', params }) ? 'media' : undefined;
}

interface RoomsDetailsContentProps {
  bot: Bot
  chat: RoomsChat
  page: RoomsDetailsPage | undefined
}

function RoomsDetailsContent({ bot, chat, page }: RoomsDetailsContentProps) {
  const handle = bot.handle;

  const pages = [
    { to: '/rooms/direct/$handle/todos', title: m.rooms_todos(), icon: <IconListTodo /> },
    { to: '/rooms/direct/$handle/routines', title: m.rooms_routines(), icon: <IconCalendarClock /> },
    { to: '/rooms/direct/$handle/media', title: m.rooms_tab_media(), icon: <IconImages /> },
    { to: '/rooms/direct/$handle/activity', title: m.rooms_activity(), icon: <IconActivity /> },
  ] as const;

  return match(page)
    .with('todos', () => (
      <RoomsDetailsSection title={m.rooms_todos()}>
        <TodosList bot={bot} handle={handle} />
      </RoomsDetailsSection>
    ))
    .with('routines', () => (
      <RoomsDetailsSection title={m.rooms_routines()}>
        <RoutinesList bot={bot} />
      </RoomsDetailsSection>
    ))
    .with('media', () => (
      <RoomsDetailsSection title={m.rooms_tab_media()}>
        <RoomsDetailsMedia botId={bot.id} />
      </RoomsDetailsSection>
    ))
    .with(undefined, () => (
      <>
        <RoomsDetailsBot bot={bot} chat={chat} />
        <ItemGroup variant="outline">
          {pages.map((item) => (
            <Item key={item.to} size="sm">
              <ItemMedia>{item.icon}</ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle>
                  <ItemLink asChild>
                    <Link params={{ handle }} to={item.to}>{item.title}</Link>
                  </ItemLink>
                </ItemTitle>
              </ItemContent>
              <ItemActions>
                <ItemValue><IconChevronRight /></ItemValue>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
        <RoomsDetailsFacts bot={bot} chat={chat} />
        <RoomsDetailsUsage bot={bot} chat={chat} />
      </>
    ))
    .exhaustive();
}

interface RoomsDetailsFactsProps {
  bot: Bot
  chat: RoomsChat
}

function RoomsDetailsFacts({ bot, chat }: RoomsDetailsFactsProps) {
  const hydrated = useHydrated();
  const isMobile = useIsMobile();
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
  const lastActivity = chat.lastMessage && hydrated ? date.format(new Date(chat.lastMessage.createdAt)) : '';

  const facts = [
    { label: m.rooms_last_activity(), value: chat.lastMessage ? lastActivity : m.rooms_last_activity_none() },
    { label: m.rooms_details_created(), value: hydrated ? date.format(new Date(bot.createdAt)) : '' },
  ];

  return (
    <RoomsDetailsSection title={m.rooms_details_general()}>
      <ItemGroup variant="outline">
        {isMobile ? <RoomsChatContextItem bot={bot} chat={chat} /> : null}
        {facts.map((fact) => (
          <Item key={fact.label} size="sm">
            <ItemContent>
              <ItemTitle>{fact.label}</ItemTitle>
            </ItemContent>
            <ItemActions className="min-w-0">
              <ItemValue>{fact.value}</ItemValue>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </RoomsDetailsSection>
  );
}

interface RoomsDetailsUsageProps {
  bot: Bot
  chat: RoomsChat
}

function RoomsDetailsUsage({ bot, chat }: RoomsDetailsUsageProps) {
  const { data: usage, isError, refetch } = useQuery(rpc.bots.usage.queryOptions({ input: { botId: bot.id } }));
  const lastEntryId = chat.lastMessage?.entryId;
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      void refetch();
    }

    isMounted.current = true;
  }, [refetch, lastEntryId, chat.isRunning]);

  const models = Object.entries(usage?.models ?? {}).map(([key, bucket]) => ({
    id: key,
    label: key.slice(key.indexOf('/') + 1),
    value: botUsageLabel(bucket),
  }));

  const total = [...Object.values(usage?.models ?? {}), ...Object.values(usage?.tools ?? {})].reduce((sum, bucket) => ({
    input: sum.input + bucket.input,
    output: sum.output + bucket.output,
    cacheRead: sum.cacheRead + bucket.cacheRead,
    cost: { total: sum.cost.total + bucket.cost.total },
  }), {
    input: 0,
    output: 0,
    cacheRead: 0,
    cost: { total: 0 },
  });

  const rows = match({
    usage,
    isError,
    count: models.length,
  })
    .with({ isError: true }, () => [{ id: 'error', label: m.rooms_details_usage_error(), value: '' }])
    .with({ usage: P.nullish }, () => null)
    .with({ count: 0 }, () => [{ id: 'none', label: m.rooms_details_usage_none(), value: '' }])
    .with({ count: 1 }, () => models)
    .otherwise(() => [...models, { id: 'total', label: m.rooms_details_usage_total(), value: botUsageLabel(total) }]);

  return rows ? (
    <RoomsDetailsSection title={m.rooms_details_usage()}>
      <ItemGroup variant="outline">
        {rows.map((row) => (
          <Item key={row.id} size="sm">
            <ItemContent className="min-w-0">
              <ItemTitle>{row.label}</ItemTitle>
            </ItemContent>
            <ItemActions className="min-w-0">
              <ItemValue>{row.value}</ItemValue>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </RoomsDetailsSection>
  ) : null;
}
