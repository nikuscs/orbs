import { arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSidebarSections } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import IconArrowDown from '~icons/lucide/arrow-down';
import IconArrowUp from '~icons/lucide/arrow-up';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconPencil from '~icons/lucide/pencil';
import IconTrash from '~icons/lucide/trash-2';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import * as Sidebar from '../sidebar';
import type { RoomsSidebarSection } from '@repo/client/client';
import type { ReactNode } from 'react';

interface RoomsSidebarSectionGroupProps {
  section: RoomsSidebarSection
  children: ReactNode
  onCollapsedChange: (isCollapsed: boolean) => void
}

export function RoomsSidebarSectionGroup({ section, children, onCollapsedChange }: RoomsSidebarSectionGroupProps) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `section:${section.id}` });
  const { onKeyDown: _keyboardDrag, ...pointerDrag } = listeners ?? {};
  const sidebarSections = useSidebarSections();
  const sectionIds = sidebarSections.sections.map((item) => item.id);
  const index = sectionIds.indexOf(section.id);

  const { setOpenMobile } = Sidebar.useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const count = section.chats.length;

  const move = (offset: number) => sidebarSections.arrange({ sectionIds: arrayMove(sectionIds, index, index + offset) });

  return (
    <Collapsible open={!section.isCollapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
      <Sidebar.SidebarGroup
        className="py-1 data-[dragging=true]:opacity-40"
        data-dragging={isDragging}
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
      >
        <Sidebar.SidebarGroupLabel
          className="group/section-label relative data-[empty=true]:mb-0"
          data-empty={count === 0}
          onContextMenu={(event) => {
            event.preventDefault();
            setIsMenuOpen(true);
          }}
        >
          <CollapsibleTrigger asChild>
            <button
              className="group/section-trigger -mx-2 flex h-7 min-w-0 flex-1 touch-none items-center gap-1 rounded-md px-2 text-left ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2"
              type="button"
              {...pointerDrag}
            >
              <span className="truncate">{section.name}</span>
              <span className="ml-auto flex w-4 shrink-0 justify-center">
                {section.isCollapsed && count > 0 ? <span className="tabular-nums group-hover/section-trigger:hidden">{count}</span> : null}
                <IconChevronDown className="hidden size-3.5 transition-transform group-hover/section-trigger:block group-data-[state=closed]/section-trigger:-rotate-90" />
              </span>
            </button>
          </CollapsibleTrigger>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <span aria-hidden="true" className="absolute top-1/2 right-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  search={(previous: object) => ({ ...previous, section: section.id })}
                  to="."
                  onClick={() => setOpenMobile(false)}
                >
                  <IconPencil className="size-4" />
                  {m.rooms_section_rename()}
                </Link>
              </DropdownMenuItem>
              {index > 0 ? (
                <DropdownMenuItem onSelect={() => move(-1)}>
                  <IconArrowUp className="size-4" />
                  {m.rooms_section_move_up()}
                </DropdownMenuItem>
              ) : null}
              {index < sectionIds.length - 1 ? (
                <DropdownMenuItem onSelect={() => move(1)}>
                  <IconArrowDown className="size-4" />
                  {m.rooms_section_move_down()}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild variant="destructive">
                <Link
                  search={(previous: object) => ({ ...previous, sectionDelete: section.id })}
                  to="."
                  onClick={() => setOpenMobile(false)}
                >
                  <IconTrash className="size-4" />
                  {m.rooms_section_delete()}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Sidebar.SidebarGroupLabel>
        <CollapsibleContent>
          <Sidebar.SidebarMenu>{children}</Sidebar.SidebarMenu>
        </CollapsibleContent>
      </Sidebar.SidebarGroup>
    </Collapsible>
  );
}
