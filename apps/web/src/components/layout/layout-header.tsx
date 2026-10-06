import { LayoutBreadcrumbs } from '@/components/layout/layout-breadcrumbs';
import { Separator } from '@/components/ui/separator';
import * as Sidebar from '@/components/ui/sidebar';
import { cn } from '@/lib/cn';
import type { ComponentProps } from 'react';

export function LayoutHeader({ className, children, ...props }: ComponentProps<'header'>) {
  return (
    <LayoutHeaderWrapper className={className} {...props}>
      <div className="flex w-full flex-wrap items-center gap-1 px-2">
        <LayoutHeaderTriggerAndBreadcrumbs />
        {children}
      </div>
    </LayoutHeaderWrapper>
  );
}

function LayoutHeaderWrapper({ children, className, ...props }: ComponentProps<'header'>) {
  return (
    <header className={cn('sticky top-0 z-50 flex h-auto shrink-0 items-center gap-2 border-b border-border/60 bg-background py-1.5 md:rounded-t-2xl', className)} {...props}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(100%+0.5px)] h-4 bg-linear-to-b from-background to-transparent md:hidden" />
    </header>
  );
}

function LayoutHeaderTriggerAndBreadcrumbs({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-header-trigger-and-breadcrumbs
      className={cn('flex min-w-8 flex-1 items-center justify-start gap-0.5', className)}
      {...props}
    >
      <Sidebar.SidebarTrigger className="-ml-1 shrink-0 opacity-70" />
      <Separator className="mr-2 shrink-0 data-[orientation=vertical]:h-3" orientation="vertical" />
      <LayoutBreadcrumbs
        skipRoot
        className="min-w-0"
        showOnlyLast={false}
      />
    </div>
  );
}
