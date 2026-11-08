import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MENTION } from '@repo/client/client';
import { useChatDraft } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { Link, useMatch } from '@tanstack/react-router';
import { useState } from 'react';
import { match } from 'ts-pattern';
import IconBellOff from '~icons/lucide/bell-off';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconPin from '~icons/lucide/pin';
import { BotAvatar } from '../bots/bot-avatar';
import * as Sidebar from '../sidebar';
import { RoomsSettingsMenu } from './rooms-settings-menu';
import type { RoomsChat } from '@repo/client/client';

interface RoomItemProps {
  chat: RoomsChat
  isSortable?: boolean
}

export function RoomItem({ chat, isSortable = true }: RoomItemProps) {
  const current = useMatch({ from: '/_chat/rooms/direct/$handle', shouldThrow: false });
  const { isMobile, state } = Sidebar.useSidebar();
  const [buttonSize, setButtonSize] = useState<number>();

  const measure = (node: HTMLAnchorElement | null) => {
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setButtonSize(Math.min(entry.contentRect.width, entry.contentRect.height)));
    observer.observe(node);

    return () => observer.disconnect();
  };

  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chat.botId, disabled: !isSortable });
  const isActive = current?.params.handle === chat.handle;
  const { draft } = useChatDraft(chat.botId);
  const lastActivity = chat.lastMessage?.preview ?? m.rooms_last_activity_none();

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
        chat={chat}
      >
        <Sidebar.SidebarMenuButton
          asChild
          className="group/room-item"
          isActive={isActive}
          size="chat"
          tooltip={chat.name}
        >
          <Link
            params={{ handle: chat.handle }}
            ref={measure}
            to="/rooms/direct/$handle"
          >
            <span className="relative shrink-0">
              <BotAvatar
                animate={false}
                bot={{ name: chat.name, avatar: chat.avatar ?? undefined }}
                cheer={false}
                size={state === 'collapsed' && !isMobile && buttonSize ? buttonSize : 32}
                variant="row"
              />
              {match({
                isWaiting: chat.isWaiting,
                isWorking: chat.isWorking,
                isUnread: chat.hasUnread && !isActive,
              })
                .with({ isWaiting: true }, () => (
                  <>
                    <span aria-hidden="true" className="absolute inset-e-0 top-0 size-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
                    <span className="sr-only">{m.rooms_waiting()}</span>
                  </>
                ))
                .with({ isWorking: true }, () => (
                  <>
                    <span aria-hidden="true" className="absolute inset-e-0 top-0 size-2 rounded-full bg-green-500 ring-2 ring-sidebar" />
                    <span className="sr-only">{m.rooms_working()}</span>
                  </>
                ))
                .with({ isUnread: true }, () => (
                  <>
                    <span aria-hidden="true" className="absolute inset-e-0 top-0 size-2 rounded-full bg-orange-400 ring-2 ring-sidebar" />
                    <span className="sr-only">{m.rooms_unread()}</span>
                  </>
                ))
                .otherwise(() => null)}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[13px] font-medium">{chat.name}</span>
                {chat.isPinned ? (
                  <>
                    <IconPin aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                    <span className="sr-only">{m.rooms_pinned()}</span>
                  </>
                ) : null}
                {chat.isMuted ? (
                  <>
                    <IconBellOff aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                    <span className="sr-only">{m.rooms_muted()}</span>
                  </>
                ) : null}
              </span>
              <span className="truncate text-xxs text-muted-foreground">{draft && !isActive ? m.rooms_draft_preview({ text: draft.replaceAll(MENTION.link, '$1') }) : lastActivity}</span>
            </span>
          </Link>
        </Sidebar.SidebarMenuButton>
      </RoomsSettingsMenu>
    </Sidebar.SidebarMenuItem>
  );
}
