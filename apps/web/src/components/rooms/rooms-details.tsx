import { m } from '@orbs/i18n/client';
import { getLocale } from '@orbs/i18n/runtime';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useHydrated, useMatch } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import { MemoryPanel } from '@/components/memory/memory-panel';
import { MemoryWipeLink } from '@/components/memory/memory-wipe-link';
import { RoomAvatar } from '@/components/rooms/room-avatar';
import { RoomsForm } from '@/components/rooms/rooms-form';
import { RoomsSettingsMenu } from '@/components/rooms/rooms-settings-menu';
import { Button } from '@/components/ui/button';
import { EditableText } from '@/components/ui/editable-text';
import { Empty, EmptyDescription, EmptyHeader, EmptyIcons, EmptyTitle } from '@/components/ui/empty';
import * as Sidebar from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoomUpdate } from '@/hooks/use-room-update';
import { botRoomActivities } from '@/services/bot/bot.client';
import { routingDriverLabels } from '@/services/routing/routing.client';
import { rpc } from '@/services/rpc/rpc.client';
import { tenantRoomTitle } from '@/services/tenant/tenant.utils';
import IconImages from '~icons/lucide/images';
import IconPanelRight from '~icons/lucide/panel-right';
import type { Bot, TenantRoomSummary } from '@orbs/server/client';

export function RoomsDetails() {
  const roomId = useMatch({ from: '/_chat/rooms/$roomId', shouldThrow: false })?.params.roomId;
  const direct = useMatch({ from: '/_chat/rooms/direct/$handle', shouldThrow: false });
  const [tabAcrossRooms, setTabAcrossRooms] = useState('details');
  const id = roomId ?? direct?.loaderData?.roomId;

  return id ? (
    <RoomsDetailsPanel
      directHandle={direct?.params.handle}
      key={id}
      roomId={id}
      tab={tabAcrossRooms}
      onTabChange={setTabAcrossRooms}
    />
  ) : null;
}

function RoomsDetailsPanel({
  roomId,
  directHandle,
  tab,
  onTabChange,
}: {
  roomId: string;
  directHandle?: string;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());

  const {
    data: { room, runs, messages },
  } = useSuspenseQuery(rpc.rooms.timeline.queryOptions({ input: { roomId } }));

  const { isMobile, toggleSidebar } = Sidebar.useSidebar();
  const update = useRoomUpdate(roomId);
  const [editableTitleMounts, setEditableTitleMounts] = useState(0);
  const members = bots.filter((bot) => room.botIds.includes(bot.id));
  const activities = botRoomActivities({ runs });
  const { title, subtitle } = tenantRoomTitle({ room, members });
  const lastAt = messages.at(-1)?.metadata?.createdAt;
  const leader = members.find((bot) => bot.id === room.leaderBotId);

  return (
    <Sidebar.Sidebar side="right" variant="inset">
      <Sidebar.SidebarHeader className="items-center gap-1 pb-3 text-center">
        {isMobile ? null : (
          <Button
            aria-label={m.rooms_details_close()}
            className="self-end"
            size="icon-sm"
            title={m.rooms_details_close()}
            variant="outline"
            onClick={toggleSidebar}
          >
            <IconPanelRight className="size-4" />
          </Button>
        )}
        <RoomsSettingsMenu
          align="center"
          directHandle={directHandle}
          room={room}
          onRename={() => setEditableTitleMounts((count) => count + 1)}
        >
          <span className="mb-1">
            <RoomAvatar
              activities={activities}
              leaderId={room.leaderBotId}
              members={members}
              size={56}
              variant="secondary"
            />
          </span>
        </RoomsSettingsMenu>
        {room.kind === 'group' ? (
          <EditableText
            required
            aria-label={m.rooms_create_name()}
            key={editableTitleMounts}
            maxLength={80}
            startEditing={editableTitleMounts > 0}
            value={room.name}
            onSave={(name) => update({ name })}
          />
        ) : (
          <h2 className="max-w-full truncate font-medium">{title}</h2>
        )}
        {subtitle ? <p className="max-w-full truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </Sidebar.SidebarHeader>
      <Tabs
        className="min-h-0 flex-1 gap-0"
        value={tab}
        onValueChange={onTabChange}
      >
        <TabsList
          className="mx-auto mb-2"
          columns={3}
          variant="muted"
        >
          <TabsTrigger value="details" variant="muted">
            {m.rooms_tab_details()}
          </TabsTrigger>
          <TabsTrigger value="media" variant="muted">
            {m.rooms_tab_media()}
          </TabsTrigger>
          <TabsTrigger value="settings" variant="muted">
            {m.rooms_tab_settings()}
          </TabsTrigger>
        </TabsList>
        <Sidebar.SidebarContent>
          <TabsContent className="flex flex-col gap-3 px-4 py-2" value="details">
            <EditableText
              multiline
              aria-label={m.rooms_description_label()}
              maxLength={2000}
              placeholder={m.rooms_description_placeholder()}
              value={room.description}
              onSave={(description) => update({ description })}
            />
            <RoomsDetailsFacts
              lastAt={lastAt}
              leader={leader}
              room={room}
            />
          </TabsContent>
          <TabsContent className="px-4 py-2" value="settings">
            <MemoryPanel scope={{ scope: 'room', ownerId: roomId }} />
            <RoomsForm bots={bots} room={room} />
            <MemoryWipeLink
              directHandle={directHandle}
              from="room"
              scope={{ scope: 'room', ownerId: roomId }}
            />
          </TabsContent>
          <TabsContent value="media">
            <Empty size="sm">
              <EmptyHeader>
                <EmptyIcons>
                  <IconImages />
                </EmptyIcons>
                <EmptyTitle>{m.rooms_media_empty_title()}</EmptyTitle>
                <EmptyDescription>{m.rooms_media_empty_hint()}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>
        </Sidebar.SidebarContent>
      </Tabs>
      <Sidebar.SidebarRail />
    </Sidebar.Sidebar>
  );
}

function RoomsDetailsFacts({ room, leader, lastAt }: { room: TenantRoomSummary; leader?: Bot; lastAt?: string }) {
  const hydrated = useHydrated();
  const { data: settings } = useQuery(rpc.organization.settings.queryOptions());
  const labels = routingDriverLabels();
  const date = hydrated ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const inherited = settings ? m.routing_driver_inherit({ driver: labels[settings.routing.driver] }) : null;
  const mode = room.driver ? labels[room.driver] : inherited;
  const group = room.kind === 'group';

  const facts = [
    { label: m.rooms_last_activity(), value: lastAt ? date?.format(new Date(lastAt)) : m.rooms_last_activity_none() },
    ...(group
      ? [
        { label: m.rooms_details_mode(), value: mode },
        { label: m.rooms_leader(), value: leader?.name },
      ]
      : []),
    { label: m.rooms_details_created(), value: date?.format(new Date(room.createdAt)) },
  ];

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
      {facts.map((fact) => (
        <Fragment key={fact.label}>
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="truncate text-right">{fact.value ?? '—'}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
