import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RoomItem } from '@/components/rooms/room-item';
import { RoomsDragCard } from '@/components/rooms/rooms-drag-card';
import { RoomsPinZone } from '@/components/rooms/rooms-pin-zone';
import { Button } from '@/components/ui/button';
import * as Sidebar from '@/components/ui/sidebar';
import { useRoomsArrange } from '@/hooks/use-rooms-arrange';
import { ROOMS_DRAG_PRESS } from '@/services/rooms/rooms.constants';
import { rpc } from '@/services/rpc/rpc.client';
import IconPlus from '~icons/lucide/plus';
import type { DragEndEvent } from '@dnd-kit/core';
import type { TenantRoomListItem } from '@orbs/server/client';

export function RoomsSidebarActions() {
  const { setOpenMobile } = Sidebar.useSidebar();

  return (
    <Button
      asChild
      className="ml-auto group-data-[collapsible=icon]:hidden"
      size="icon-sm"
      variant="outline"
    >
      <Link
        aria-label={m.rooms_new()}
        search={{ start: true }}
        title={m.rooms_new()}
        to="/rooms"
        onClick={() => setOpenMobile(false)}
      >
        <IconPlus className="size-4" />
      </Link>
    </Button>
  );
}

export function RoomsSidebar() {
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const arrange = useRoomsArrange();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: ROOMS_DRAG_PRESS }),
    useSensor(TouchSensor, { activationConstraint: ROOMS_DRAG_PRESS }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pinned = rooms.filter((room) => room.pinned === 1);
  const groups = rooms.filter((room) => room.pinned !== 1 && room.kind === 'group');
  const direct = rooms.filter((room) => room.pinned !== 1 && room.kind === 'direct');
  const others = [...groups, ...direct];
  const shown = [...pinned, ...others];
  const dragged = shown.find((room) => room.id === draggedId);
  const membersOf = (room: TenantRoomListItem) => bots.filter((bot) => room.botIds.includes(bot.id));
  const pinZone = 'pin';

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedId(null);
    const swallowClickThatEndsDrag = (event: Event) => event.stopPropagation();
    window.addEventListener('click', swallowClickThatEndsDrag, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallowClickThatEndsDrag, { capture: true }));

    if (!over || over.id === active.id) {
      return;
    }

    const toPinned = over.id === pinZone || pinned.some((room) => room.id === over.id);
    const ids = shown.map((room) => room.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), over.id === pinZone ? 0 : ids.indexOf(String(over.id)));
    const wasPinned = pinned.some((room) => room.id === active.id);
    const pinnedCount = pinned.length + Number(toPinned && !wasPinned) - Number(!toPinned && wasPinned);
    const rest = next.slice(pinnedCount);

    const lastPlacedIndex = rest.reduce(
      (last, id, index) => (id === active.id || others.some((room) => room.id === id && room.position !== null) ? index : last),
      -1,
    );

    arrange(next.slice(0, pinnedCount), rest.slice(0, lastPlacedIndex + 1));
  };

  const dragOverlayOnDocumentBody = dragged ? createPortal(
    <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
      <RoomsDragCard members={membersOf(dragged)} room={dragged} />
    </DragOverlay>,
    document.body,
  ) : null;

  return (
    <DndContext
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      sensors={sensors}
      onDragCancel={() => setDraggedId(null)}
      onDragEnd={onDragEnd}
      onDragStart={({ active }) => setDraggedId(String(active.id))}
    >
      <SortableContext items={shown.map((room) => room.id)} strategy={verticalListSortingStrategy}>
        {pinned.length > 0 ? (
          <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>{m.rooms_pinned()}</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarMenu>
              {pinned.map((room) => (
                <RoomItem
                  key={room.id}
                  members={membersOf(room)}
                  room={room}
                />
              ))}
            </Sidebar.SidebarMenu>
          </Sidebar.SidebarGroup>
        ) : null}
        {pinned.length > 0 && others.length > 0 ? <Sidebar.SidebarSeparator /> : null}
        {pinned.length === 0 && dragged ? <RoomsPinZone id={pinZone} /> : null}
        {groups.length > 0 ? (
          <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>{m.rooms_meta_title()}</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarMenu>
              {groups.map((room) => (
                <RoomItem
                  key={room.id}
                  members={membersOf(room)}
                  room={room}
                />
              ))}
            </Sidebar.SidebarMenu>
          </Sidebar.SidebarGroup>
        ) : null}
        {groups.length > 0 && direct.length > 0 ? <Sidebar.SidebarSeparator /> : null}
        {direct.length > 0 ? (
          <Sidebar.SidebarGroup>
            <Sidebar.SidebarGroupLabel>{m.rooms_dms()}</Sidebar.SidebarGroupLabel>
            <Sidebar.SidebarMenu>
              {direct.map((room) => (
                <RoomItem
                  key={room.id}
                  members={membersOf(room)}
                  room={room}
                />
              ))}
            </Sidebar.SidebarMenu>
          </Sidebar.SidebarGroup>
        ) : null}
      </SortableContext>
      {dragOverlayOnDocumentBody}
    </DndContext>
  );
}
