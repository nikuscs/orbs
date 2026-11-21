import { useComputer, useComputerLabel } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { FormErrors } from '@repo/ui/forms/form';
import { StatusDot } from '@repo/ui/status-dot';
import { Link } from '@tanstack/react-router';
import { match } from 'ts-pattern';
import { RoomsComputerActions } from '@/components/rooms/rooms-computer-actions';
import { RoomsComputerScreen } from '@/components/rooms/rooms-computer-screen';
import type { Bot } from '@repo/contracts/universal';

interface RoomsDetailsComputerProps {
  bot: Bot
}

export function RoomsDetailsComputer({ bot }: RoomsDetailsComputerProps) {
  const computer = useComputer(bot.id);
  const { label, tone } = useComputerLabel(computer.status);
  const state = computer.status?.state ?? 'off';

  const error = match(computer.isError)
    .with(true, () => m.rooms_computer_error())
    .otherwise(() => computer.actionError);

  return (
    <div className="flex flex-col gap-3">
      <Link
        aria-label={m.rooms_computer_open()}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        params={{ handle: bot.handle }}
        title={m.rooms_computer_open()}
        to="/rooms/direct/$handle/computer"
      >
        <RoomsComputerScreen
          isDimmed={state !== 'running'}
          label={state === 'running' ? null : label}
          thumbnail={computer.thumbnail}
        />
      </Link>
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <StatusDot label={label} variant={tone} />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RoomsComputerActions
          computer={computer}
          handle={bot.handle}
          isInView={false}
        />
      </div>
      <FormErrors error={error} />
    </div>
  );
}
