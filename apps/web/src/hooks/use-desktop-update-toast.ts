import { env } from '@repo/env/client';
import { m } from '@repo/i18n/client';
import { toasty } from '@repo/ui/sonner';
import { createElement, useEffect } from 'react';
import { DESKTOP } from '@/services/desktop/desktop.constants';
import { useDesktopUpdate } from './use-desktop-update';

export function useDesktopUpdateToast() {
  const update = useDesktopUpdate();
  const available = update?.status === 'ready' ? update.available : undefined;

  useEffect(() => {
    if (!available) {
      return;
    }

    toasty(createElement('span', { className: 'flex items-center gap-3' }, m.desktop_update_ready({ name: env.VITE_APP_NAME, version: available }), createElement('button', {
      className: 'font-medium underline underline-offset-2',
      type: 'button',
      onClick: () => window.__electrobunSendToHost?.({ update: 'apply' }),
    }, m.desktop_update_restart_action())), '⬆️', { id: DESKTOP.updateToastId, duration: Infinity });
  }, [available]);
}
