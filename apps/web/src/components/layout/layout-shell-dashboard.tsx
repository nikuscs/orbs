import { useLocation } from '@tanstack/react-router';
import * as Sidebar from '@/components/ui/sidebar';
import { LayoutAppSidebar } from './layout-app-sidebar';
import type { ReactNode } from 'react';

interface LayoutShellDashboardProps {
  children: ReactNode
  aside?: ReactNode
}

export function LayoutShellDashboard({ children, aside }: LayoutShellDashboardProps) {
  const { pathname } = useLocation();

  return (
    <Sidebar.SidebarProvider className="h-svh overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" pathname={pathname}>
      <LayoutAppSidebar collapsible="icon" variant="inset" />
      {aside ? (
        <>
          <Sidebar.SidebarTrigger className="fixed top-3 left-3 z-20 md:hidden" />
          <Sidebar.SidebarProvider
            className="min-h-0 min-w-0 flex-1 md:py-2 md:pr-2 md:peer-data-[state=collapsed]:pl-2 md:has-[[data-side=right][data-state=expanded]]:pr-0"
            defaultOpen={false}
            defaultWidth={320}
            pathname={pathname}
            shortcut={null}
          >
            <Sidebar.SidebarInset className="min-h-0 min-w-0 overflow-hidden md:rounded-xl md:shadow-sm">{children}</Sidebar.SidebarInset>
            {aside}
          </Sidebar.SidebarProvider>
        </>
      ) : (
        <Sidebar.SidebarInset className="min-h-0 min-w-0 overflow-hidden">{children}</Sidebar.SidebarInset>
      )}
    </Sidebar.SidebarProvider>
  );
}

