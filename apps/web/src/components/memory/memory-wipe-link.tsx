import { m } from '@orbs/i18n/client';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import IconEraser from '~icons/lucide/eraser';
import type { MemoryWipeInput } from '@orbs/server/client';
import type { ReactNode } from 'react';

export function MemoryWipeLink({
  scope,
  disabled,
  directHandle,
  from = 'settings',
}: {
  scope: MemoryWipeInput['scope'];
  disabled?: boolean;
  directHandle?: string;
  from?: 'settings' | 'room';
}) {
  let link: ReactNode;

  if (scope.scope === 'bot') {
    link = (
      <Link
        disabled={disabled}
        params={{ botId: scope.ownerId }}
        resetScroll={false}
        to="/bots/$botId/wipe-memory"
      >
        <IconEraser />
        {m.memory_wipe()}
      </Link>
    );
  } else if (directHandle) {
    link = (
      <Link
        disabled={disabled}
        params={{ handle: directHandle }}
        resetScroll={false}
        to="/rooms/direct/$handle/wipe-memory"
      >
        <IconEraser />
        {m.memory_wipe()}
      </Link>
    );
  } else {
    link = (
      <Link
        disabled={disabled}
        params={{ roomId: scope.ownerId }}
        resetScroll={false}
        search={{ from }}
        to="/rooms/$roomId/wipe-memory"
      >
        <IconEraser />
        {m.memory_wipe()}
      </Link>
    );
  }

  return (
    <Button
      asChild
      className="self-start"
      size="xs"
      variant="link-muted"
    >
      {link}
    </Button>
  );
}
