import { getLocale } from '@orbs/i18n/runtime';
import { HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { ContextProviders } from '@/components/context/context-providers';
import { ContextThemeScript } from '@/components/context/context-theme';
import type { ErrorComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export function LayoutRoot() {
  return (
    <LayoutRootDocument>
      <Outlet />
    </LayoutRootDocument>
  );
}

export function LayoutRootError({ error }: ErrorComponentProps) {
  return (
    <LayoutRootDocument>
      <main className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-3xl font-medium tracking-tight">{error instanceof Error ? error.message : String(error)}</h1>
      </main>
    </LayoutRootDocument>
  );
}

export function LayoutRootNotFound() {
  return (
    <LayoutRootDocument>
      <main className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-3xl font-medium tracking-tight">404</h1>
      </main>
    </LayoutRootDocument>
  );
}

function LayoutRootDocument({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning lang={getLocale()}>
      <head>
        <HeadContent />
        <ContextThemeScript />
      </head>
      <body className="relative">
        <ContextProviders>{children}</ContextProviders>
        <Scripts />
      </body>
    </html>
  );
}
