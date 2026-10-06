import { index, layout, rootRoute, route } from '@tanstack/virtual-file-routes';

export const routes = rootRoute('root.tsx', [
  index('index.tsx'),

  layout('chat', 'chat.layout.tsx', [
    route('/rooms', [
      index('rooms/rooms.index.tsx'),
      route('/create', 'rooms/rooms.create.tsx'),
      route('/$roomId', 'rooms/rooms.$roomId.tsx', [
        route('/reset', 'rooms/rooms.$roomId.reset.tsx'),
        route('/wipe-memory', 'rooms/rooms.$roomId.wipe-memory.tsx'),
        route('/delete', 'rooms/rooms.$roomId.delete.tsx'),
        route('/settings', 'rooms/rooms.$roomId.settings.tsx'),
      ]),
      route('/direct/$handle', 'rooms/rooms.direct.$handle.tsx', [
        route('/edit', 'rooms/rooms.direct.$handle.edit.tsx'),
        route('/reset', 'rooms/rooms.direct.$handle.reset.tsx'),
        route('/wipe-memory', 'rooms/rooms.direct.$handle.wipe-memory.tsx'),
      ]),
    ]),
    route('/bots/create', 'bots/bots.create.tsx'),
    route('/bots/$botId/edit', 'bots/bots.$botId.edit.tsx'),
    route('/bots/$botId/delete', 'bots/bots.$botId.delete.tsx'),
    route('/bots/$botId/wipe-memory', 'bots/bots.$botId.wipe-memory.tsx'),
    route('/settings/daemon-key', 'settings/settings.daemon-key.tsx'),
    route('/settings/organization', 'settings/settings.organization.tsx'),
  ]),
  route('/rooms/sign-out', 'auth/auth.sign-out.tsx'),
  route('/lab/avatars', 'lab/lab.avatars.tsx'),

  route('/auth', 'auth/auth.layout.tsx', [
    route('/sign-in', 'auth/auth.sign-in.tsx'),
    route('/sign-up', 'auth/auth.sign-up.tsx'),
    route('/forgot-password', 'auth/auth.forgot-password.tsx'),
    route('/reset-password', 'auth/auth.reset-password.tsx'),
    route('/verify-email', 'auth/auth.verify-email.tsx'),
  ]),

  route('/api/auth/$', 'handlers/handler.auth.ts'),
  route('/rpc/$', 'handlers/handler.rpc.ts'),
  route('/t/ingest', 'handlers/handler.ingest.ts'),
  route('/robots[.]txt', 'handlers/handler.robots.ts'),
  route('/sitemap[.]xml', 'handlers/handler.sitemap.ts'),
]);
