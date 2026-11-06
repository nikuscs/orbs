import { LayoutBreadcrumbs } from '@repo/ui/layout/layout-breadcrumbs';
import type { ReactNode } from 'react';

interface LayoutPageHeaderProps {
  children?: ReactNode
}

export function LayoutPageHeader({ children }: LayoutPageHeaderProps) {
  return (
    <header className="relative z-20 flex h-12 shrink-0 cursor-default items-center justify-between gap-2 border-b pr-2 pl-14 electrobun-webkit-app-region-drag md:pl-6">
      <div className="min-w-0 electrobun-webkit-app-region-no-drag">
        <LayoutBreadcrumbs />
      </div>
      {children ? <div className="flex items-center gap-2 electrobun-webkit-app-region-no-drag">{children}</div> : null}
    </header>
  );
}
