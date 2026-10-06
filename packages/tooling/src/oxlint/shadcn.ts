import { defineConfig } from 'oxlint';

export const shadcnConfig = defineConfig({
  settings: {
    shadcn: { ui: '@/components/ui', componentImports: ['^@/components/'] },
  },
  overrides: [
    {
      files: ['apps/web/src/**/*.{ts,tsx}'],
      excludeFiles: ['apps/web/src/components/ui/**'],
      rules: {
        'shadcn/no-restyle': ['error', {
          allow: ['layout', 'opacity'],
          contracts: [
            { pattern: '^(Card|CardContent|DropdownMenuLabel)$', allow: ['layout', 'opacity', 'p-0'] },
            { pattern: '^PopoverContent$', allow: ['layout', 'opacity', 'p'] },
            { pattern: '^HoverCardContent$', allow: ['layout', 'opacity', 'gap', 'p'] },
            { pattern: '^SidebarHeader$', allow: ['layout', 'opacity', 'gap', 'pb'] },
            { pattern: '^TabsContent$', allow: ['layout', 'opacity', 'gap', 'px', 'py'] },
            { pattern: '^MessageScrollerContent$', allow: ['layout', 'opacity', 'gap', 'p', 'pt'] },
            { pattern: '^MessageScrollerItem$', allow: ['layout', 'opacity', 'gap', 'py'] },
            { pattern: '^(Tabs|EmptyContent|BreadcrumbList|FormItem)$', allow: ['layout', 'opacity', 'gap'] },
            { pattern: '^BreadcrumbPage$', allow: ['layout', 'opacity', 'truncate'] },
            { pattern: '^SidebarProvider$', allow: ['layout', 'opacity', 'py', 'pr', 'pl', 'pt-[env(safe-area-inset-top)]', 'pb-[env(safe-area-inset-bottom)]'] },
            { pattern: '^SidebarInset$', allow: ['layout', 'opacity', 'md:rounded-xl', 'md:shadow-sm'] },
            { pattern: '^MessageScrollerViewport$', allow: ['layout', 'opacity', 'scroll-fade-b-2', 'scroll-fade-t-10'] },
          ],
        }],
        'shadcn/no-arbitrary-values': ['error', { allow: ['layout', 'pt-[env(safe-area-inset-top)]', 'pb-[env(safe-area-inset-bottom)]', 'pb-[max(1rem,env(safe-area-inset-bottom))]'] }],
        'shadcn/require-static-classes': 'error',
      },
    },
    {
      files: ['apps/web/src/**/*.{ts,tsx}'],
      rules: { 'shadcn/no-unknown-classes': ['error', { allow: [] }] },
    },
    {
      files: ['apps/web/src/components/rooms/rooms-bot-picker.tsx'],
      rules: {
        'shadcn/no-restyle': ['error', {
          allow: ['layout', 'opacity'],
          contracts: [{ pattern: '^Label$', allow: ['layout', 'opacity', 'font-normal'] }],
        }],
      },
    },
    {
      files: ['apps/web/src/components/settings/settings-daemon-key-dialog.tsx'],
      rules: {
        'shadcn/no-restyle': ['error', {
          allow: ['layout', 'opacity'],
          contracts: [{ pattern: '^Input$', allow: ['layout', 'opacity', 'font-mono'] }],
        }],
      },
    },
    {
      files: ['apps/web/src/components/rooms/rooms-chat-message.tsx'],
      rules: {
        'shadcn/no-restyle': ['error', {
          allow: ['layout', 'opacity'],
          contracts: [{ pattern: '^UserAvatar$', allow: ['layout', 'opacity', 'ring-1', 'ring-input'] }],
        }],
      },
    },
    {
      files: ['apps/web/src/components/ui/sonner.tsx'],
      rules: { 'shadcn/no-unknown-classes': ['error', { allow: ['toaster', 'toast'] }] },
    },
  ],
});
