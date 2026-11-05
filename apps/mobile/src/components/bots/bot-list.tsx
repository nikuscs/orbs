import { chatQueries, useChatSearch, useSidebarSections } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bot, LayoutDashboard, Plus, Star, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { match, P } from 'ts-pattern';
import { ChatSearchResults } from '@/components/chat/chat-search-results';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyIcons, EmptyTitle } from '@/components/ui/empty';
import { FloatingBar } from '@/components/ui/floating-bar';
import { GlassButton } from '@/components/ui/glass-button';
import { Icon } from '@/components/ui/icon';
import { Item, ItemContent } from '@/components/ui/item';
import { KeyboardSticky } from '@/components/ui/keyboard-sticky';
import { Menu } from '@/components/ui/menu';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SectionHeading } from '@/components/ui/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useConnection } from '@/hooks/use-connection';
import { useServerReachable } from '@/hooks/use-server-reachable';
import { BOT_HOME } from '@/services/bot/bot-home.constants';
import { botHomeSections } from '@/services/bot/bot-home.utils';
import { BotActionsMenu } from './bot-actions-menu';
import { BotHomeRow } from './bot-home-row';
import { BotListOffline } from './bot-list-offline';
import { BotSectionHeading } from './bot-section-heading';
import type { BotHomeGroup } from '@/types/bot-home.types';
import type { ConnectionContextValue } from '@/types/connection-context.types';

export function BotList() {
  const { session } = useConnection();
  return match(session)
    .with(P.nonNullable, (current) => <BotListContent session={current} />)
    .otherwise(() => null);
}

interface BotListContentProps {
  session: NonNullable<ConnectionContextValue['session']>;
}

function BotListContent({ session }: BotListContentProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<BotHomeGroup[]>(['hidden']);
  const sidebarSections = useSidebarSections();
  const router = useRouter();
  const isReachable = useServerReachable(session);

  const query = useQuery(chatQueries.list(session));

  const isFetching = query.fetchStatus === 'fetching';

  useEffect(() => {
    if (isReachable || !isFetching) {
      return;
    }

    const timer = setTimeout(() => void session.queryClient.cancelQueries({ queryKey: session.rpc.conversation.list.queryKey() }), BOT_HOME.reconnectTimeoutMs);

    return () => clearTimeout(timer);
  }, [isReachable, isFetching, session]);

  const { featured, sections } = botHomeSections({
    chats: query.data ?? [],
    sections: sidebarSections.sections,
    search,
  });

  const isSearching = search.trim().length > 0;
  const messages = useChatSearch(search, isSearching);
  const hasHits = isSearching && (messages.isPending || messages.results.groups.length > 0);
  const hasSectionHeaders = sections.length > 1 || sections.some((section) => section.section);

  const emptyCopy = match(isSearching)
    .with(true, () => ({ title: m.mobile_home_search_empty(), hint: m.mobile_home_search_hint(), action: m.mobile_home_search_clear() }))
    .with(false, () => ({ title: m.mobile_bots_empty(), hint: m.mobile_home_empty_hint(), action: m.mobile_bots_refresh() }))
    .exhaustive();

  const visibleSections = sections.map((section) => ({
    ...section,
    data: match(hasSectionHeaders && (section.section?.isCollapsed ?? collapsed.includes(section.key)) && !isSearching)
      .with(true, () => [])
      .with(false, () => section.data)
      .exhaustive(),
  }));

  function handleEmptyAction() {
    match(isSearching)
      .with(true, () => setSearch(''))
      .with(false, () => {
        void query.refetch();
      })
      .exhaustive();
  }

  const emptyContent = match(Boolean(featured) || sections.length > 0 || hasHits)
    .with(true, () => undefined)
    .with(false, () => (
      <Empty>
        <EmptyHeader>
          <EmptyIcons><Icon
            icon={Bot}
            size="lg"
            tone="muted"
          /></EmptyIcons>
          <EmptyTitle>{emptyCopy.title}</EmptyTitle>
          <EmptyDescription>{emptyCopy.hint}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onPress={handleEmptyAction}>{emptyCopy.action}</Button>
        </EmptyContent>
      </Empty>
    ))
    .exhaustive();

  const header = match(featured)
    .with(P.nonNullable, (chat) => (
      <View className="items-center py-8">
        <BotActionsMenu botId={chat.botId} mode="longPress">
          <Pressable
            accessibilityLabel={chat.name}
            accessibilityRole="button"
            className="items-center gap-2"
            onPress={() => router.push({ pathname: '/chat/[botId]', params: { botId: chat.botId } })}
          >
            <View>
              <Avatar
                avatar={chat.avatar}
                name={chat.name}
                size="featured"
              />
              <Badge
                accessibilityLabel={m.rooms_pinned()}
                className="absolute -right-1 bottom-0"
                variant="pinned"
              >
                <Icon
                  fill="currentColor"
                  icon={Star}
                  size="sm"
                />
              </Badge>
            </View>
            <Text tone="muted" variant="featured-name">{chat.name}</Text>
          </Pressable>
        </BotActionsMenu>
      </View>
    ))
    .with(undefined, () => undefined)
    .exhaustive();

  return (
    <Screen
      padding="none"
      scroll={false}
    >
      <View className="flex-1">
        {match({ status: query.status, isReachable })
          .with({ status: 'pending', isReachable: false }, () => (
            <BotListOffline
              host={new URL(session.address().url).host}
              isRetrying={isFetching}
              onRetry={() => void query.refetch()}
            />
          ))
          .with({ status: 'pending' }, () => (
            <View accessibilityLabel={m.mobile_bots_loading()} className="pt-24">
              {[0, 1, 2, 3].map((row) => (
                <Item key={row} size="chat">
                  <Skeleton size="portrait" />
                  <ItemContent>
                    <Skeleton size="title" />
                    <Skeleton size="description" />
                  </ItemContent>
                </Item>
              ))}
            </View>
          ))
          .with({ status: 'error' }, () => (
            <View className="gap-4 px-5 pt-24">
              <Alert variant="destructive">
                <AlertTitle>{m.mobile_bots_error_title()}</AlertTitle>
                <AlertDescription>{m.mobile_bots_failed()}</AlertDescription>
              </Alert>
              <Button onPress={() => void query.refetch()}>{m.mobile_retry()}</Button>
            </View>
          ))
          .with({ status: 'success' }, () => (
            <SectionList
              contentContainerClassName="grow pt-16 pb-32"
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              keyExtractor={(chat) => chat.botId}
              ListEmptyComponent={emptyContent}
              ListFooterComponent={isSearching ? (
                <ChatSearchResults
                  isPending={messages.isPending}
                  query={messages.typed}
                  results={messages.results}
                />
              ) : undefined}
              ListHeaderComponent={header}
              renderItem={({ item }) => <BotHomeRow chat={item} />}
              renderSectionHeader={({ section }) => match({ hasSectionHeaders, sidebarSection: section.section })
                .with({ hasSectionHeaders: false }, () => null)
                .with({ sidebarSection: P.nonNullable }, ({ sidebarSection }) => <BotSectionHeading isSearching={isSearching} section={sidebarSection} />)
                .otherwise(() => (
                  <SectionHeading
                    disabled={isSearching}
                    expanded={!collapsed.includes(section.key) || isSearching}
                    label={section.title}
                    onPress={() => setCollapsed((previous) => match(previous.includes(section.key))
                      .with(true, () => previous.filter((key) => key !== section.key))
                      .with(false, () => [...previous, section.key])
                      .exhaustive())}
                  />
                ))}
              sections={visibleSections}
              stickySectionHeadersEnabled={false}
            />
          ))
          .exhaustive()}
        <FloatingBar edge="top">
          <GlassButton accessibilityLabel={m.settings_title()} onPress={() => router.push('/settings')}>
            <Icon icon={UserRound} size="action" />
          </GlassButton>
          <View className="flex-row gap-3">
            <GlassButton accessibilityLabel={m.artifacts_title()} onPress={() => router.push('/artifacts')}>
              <Icon icon={LayoutDashboard} size="action" />
            </GlassButton>
            <Menu
              items={[
                { label: m.rooms_bot_title(), systemImage: 'person.badge.plus', onSelect: () => router.push('/bots/create') },
                { label: m.rooms_section_create(), systemImage: 'folder.badge.plus', onSelect: () => router.push('/sections/create') },
              ]}
            >
              <GlassButton accessibilityLabel={m.mobile_home_create()}>
                <Icon icon={Plus} size="action" />
              </GlassButton>
            </Menu>
          </View>
        </FloatingBar>
        <KeyboardSticky>
          <FloatingBar edge="bottom">
            <SearchField
              accessibilityLabel={m.rooms_search()}
              className="flex-1"
              placeholder={m.mobile_home_search()}
              testID="bots-search"
              value={search}
              onChangeText={setSearch}
            />
          </FloatingBar>
        </KeyboardSticky>
      </View>
    </Screen>
  );
}
