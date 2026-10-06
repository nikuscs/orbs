import { Link, useMatch } from '@tanstack/react-router';
import { RoomsSidebar, RoomsSidebarActions } from '@/components/rooms/rooms-sidebar';
import * as Sidebar from '@/components/ui/sidebar';
import BrandsOrbs from '~icons/brands/orbs';
import { LayoutBrand } from './layout-brand';
import { LayoutNavUser } from './layout-nav-user';
import type { ComponentProps } from 'react';

export function LayoutAppSidebar({ ...props }: ComponentProps<typeof Sidebar.Sidebar>) {
  const state = useMatch({ from: '__root__' });

  return (
    <Sidebar.Sidebar variant="inset" {...props}>
      <Sidebar.SidebarHeader className="flex-row items-center">
        <Link className="flex items-center gap-2 overflow-hidden px-2 outline-none group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" to="/rooms">
          <BrandsOrbs aria-hidden="true" className="size-5 shrink-0 text-black dark:text-white" />
          <LayoutBrand className="group-data-[collapsible=icon]:sr-only" />
        </Link>
        <RoomsSidebarActions />
      </Sidebar.SidebarHeader>
      <Sidebar.SidebarContent>
        <RoomsSidebar />
      </Sidebar.SidebarContent>
      <Sidebar.SidebarFooter>{state.context.user ? <LayoutNavUser organizationName={state.context.organization?.name ?? ''} user={state.context.user} /> : null}</Sidebar.SidebarFooter>
      <Sidebar.SidebarRail />
    </Sidebar.Sidebar>
  );
}
