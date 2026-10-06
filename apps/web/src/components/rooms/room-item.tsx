import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { m } from '@orbs/i18n/client';
import { Link, useMatch } from '@tanstack/react-router';
import { useState } from 'react';
import { RoomAvatar } from '@/components/rooms/room-avatar';
import { RoomsSettingsMenu } from '@/components/rooms/rooms-settings-menu';
import { EditableText } from '@/components/ui/editable-text';
import * as Sidebar from '@/components/ui/sidebar';
import { useRoomUpdate } from '@/hooks/use-room-update';
import { tenantRoomTitle } from '@/services/tenant/tenant.utils';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import type { Bot, TenantRoomListItem } from '@orbs/server/client';

export function RoomItem({ room, members }: { room: TenantRoomListItem; members: Bot[] }) {
  const currentRoom = useMatch({ from: '/_chat/rooms/$roomId', shouldThrow: false });
  const currentDirect = useMatch({ from: '/_chat/rooms/direct/$handle', shouldThrow: false });
  const [renaming, setRenaming] = useState(false);
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: room.id, disabled: renaming });
  const update = useRoomUpdate(room.id);
  const { title } = tenantRoomTitle({ room, members });
  const directHandle = room.kind === 'direct' ? members[0]?.handle : undefined;

  const avatar = (
    <RoomAvatar
      animate={false}
      leaderId={room.leaderBotId}
      members={members}
      size={32}
      variant="secondary"
    />
  );

  const label = (
    <span className="grid min-w-0 flex-1 leading-tight">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{title}</span>
        {directHandle ? <span className="shrink-0 rounded-sm bg-foreground/5 px-1 text-xxs text-muted-foreground">{m.rooms_dm()}</span> : null}
      </span>
      <span className="truncate text-xs text-muted-foreground">{room.lastMessage?.text ?? m.rooms_last_activity_none()}</span>
    </span>
  );

  return (
    <Sidebar.SidebarMenuItem
      className="touch-manipulation select-none [-webkit-touch-callout:none] data-[dragging=true]:opacity-40"
      data-dragging={isDragging}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onContextMenuCapture={(event) => {
        if (!isDragging) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }}
      {...listeners}
    >
      <RoomsSettingsMenu
        align="end"
        button={(
          <Sidebar.SidebarMenuAction
            showOnHover
            aria-label={m.rooms_actions()}
          >
            <IconEllipsisVertical />
          </Sidebar.SidebarMenuAction>
        )}
        directHandle={directHandle}
        room={room}
        onRename={room.kind === 'group' ? () => setRenaming(true) : undefined}
      >
        {renaming ? (
          <div className="group/room-item flex h-11 items-center gap-2.5 rounded-md bg-sidebar-accent px-2 text-sm" data-active="true">
            {avatar}
            <EditableText
              required
              startEditing
              aria-label={m.rooms_create_name()}
              maxLength={80}
              value={room.name}
              onEditEnd={() => setRenaming(false)}
              onSave={(name) => update({ name })}
            />
          </div>
        ) : (
          <Sidebar.SidebarMenuButton
            asChild
            className="group/room-item h-11"
            isActive={currentRoom?.params.roomId === room.id || Boolean(directHandle && currentDirect?.params.handle === directHandle)}
            size="lg"
          >
            {directHandle ? (
              <Link params={{ handle: directHandle }} to="/rooms/direct/$handle">
                {avatar}
                {label}
              </Link>
            ) : (
              <Link params={{ roomId: room.id }} to="/rooms/$roomId">
                {avatar}
                {label}
              </Link>
            )}
          </Sidebar.SidebarMenuButton>
        )}
      </RoomsSettingsMenu>
    </Sidebar.SidebarMenuItem>
  );
}
