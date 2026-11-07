import { m } from '@repo/i18n/client';
import { Button } from '@repo/ui/button';
import { ButtonLoading } from '@repo/ui/button-loading';
import { Link } from '@tanstack/react-router';
import { match } from 'ts-pattern';
import IconMoon from '~icons/lucide/moon';
import IconPlay from '~icons/lucide/play';
import IconPower from '~icons/lucide/power';
import type { useComputer } from '@repo/client/react';

interface RoomsComputerActionsProps {
  computer: ReturnType<typeof useComputer>
  handle: string
  isInView: boolean
}

export function RoomsComputerActions({ computer, handle, isInView }: RoomsComputerActionsProps) {
  const state = computer.status?.state ?? 'off';

  return match(state)
    .with('off', 'sleeping', () => (
      <ButtonLoading
        loading={computer.isBusy}
        size="sm"
        onClick={() => void computer.start()}
      >
        <IconPlay className="size-3.5" />
        {m.rooms_computer_start()}
      </ButtonLoading>
    ))
    .with('running', () => (
      <>
        <ButtonLoading
          loading={computer.isBusy}
          size="sm"
          variant="secondary"
          onClick={() => void computer.sleep()}
        >
          <IconMoon className="size-3.5" />
          {m.rooms_computer_sleep()}
        </ButtonLoading>
        <Button
          asChild
          disabled={computer.isBusy}
          size="sm"
          variant="outline"
        >
          {isInView ? (
            <Link params={{ handle }} to="/rooms/direct/$handle/computer/shutdown">
              <IconPower className="size-3.5" />
              {m.rooms_computer_shutdown()}
            </Link>
          ) : (
            <Link params={{ handle }} to="/rooms/direct/$handle/computer-shutdown">
              <IconPower className="size-3.5" />
              {m.rooms_computer_shutdown()}
            </Link>
          )}
        </Button>
      </>
    ))
    .exhaustive();
}
