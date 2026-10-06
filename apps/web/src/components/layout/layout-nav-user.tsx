import { m } from '@orbs/i18n/client';
import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import * as Sidebar from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { UserAvatar } from '@/components/users/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { LAYOUT_USER_MENU_GROUPS } from '@/services/layout/layout.constants';
import LucideChevronsUpDown from '~icons/lucide/chevrons-up-down';
import IconMoon from '~icons/lucide/moon';
import IconSun from '~icons/lucide/sun';
import type { AuthSession } from '@orbs/server/client';

export function LayoutNavUser({ user, organizationName }: { user: AuthSession['user']; organizationName: string }) {
  const { isMobile } = useSidebar();
  const menu = LAYOUT_USER_MENU_GROUPS;
  const { resolved, toggle } = useTheme();
  const ThemeIcon = resolved === 'dark' ? IconSun : IconMoon;

  return (
    <Sidebar.SidebarMenu>
      <Sidebar.SidebarMenuItem>
        <DropdownMenu.DropdownMenu>
          <DropdownMenu.DropdownMenuTrigger asChild>
            <Sidebar.SidebarMenuButton size="lg">
              <UserAvatar size="sm" user={user} />
              <div className="grid flex-1 text-left text-sm/tight group-data-[collapsible=icon]:sr-only">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xxs text-muted-foreground">{organizationName}</span>
              </div>
              <LucideChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </Sidebar.SidebarMenuButton>
          </DropdownMenu.DropdownMenuTrigger>
          <DropdownMenu.DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] max-w-48 min-w-32"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenu.DropdownMenuLabel className="p-0">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar size="sm" user={user} />
                <div className="grid flex-1 text-left text-sm/tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xxs text-muted-foreground">{organizationName}</span>
                </div>
              </div>
            </DropdownMenu.DropdownMenuLabel>
            {[menu.settings, menu.logout].map((group) => (
              <Fragment key={group[0].link}>
                {group === menu.logout && (
                  <>
                    <DropdownMenu.DropdownMenuSeparator />
                    <DropdownMenu.DropdownMenuItem onSelect={toggle}>
                      <ThemeIcon className="size-4" />
                      <span className="flex-1">{resolved === 'dark' ? m.layout_light_mode() : m.layout_dark_mode()}</span>
                    </DropdownMenu.DropdownMenuItem>
                  </>
                )}
                <DropdownMenu.DropdownMenuSeparator />
                <DropdownMenu.DropdownMenuGroup>
                  {group.map((item) => (
                    <DropdownMenu.DropdownMenuItem asChild key={item.link}>
                      <Link to={item.link}>
                        <item.icon className="size-4" />
                        <span className="flex-1">{item.label()}</span>
                      </Link>
                    </DropdownMenu.DropdownMenuItem>
                  ))}
                </DropdownMenu.DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenu.DropdownMenuContent>
        </DropdownMenu.DropdownMenu>
      </Sidebar.SidebarMenuItem>
    </Sidebar.SidebarMenu>
  );
}
