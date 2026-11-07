import { useComputer } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { ConfirmationDialog } from '@repo/ui/alert-dialog';
import type { Bot } from '@repo/contracts/universal';

interface RoomsComputerShutdownDialogProps {
  bot: Bot
  onOpenChange: (open: boolean) => void
}

export function RoomsComputerShutdownDialog({ bot, onOpenChange }: RoomsComputerShutdownDialogProps) {
  const computer = useComputer(bot.id);

  return (
    <ConfirmationDialog
      confirmLabel={m.rooms_computer_shutdown()}
      error={computer.hasShutdownFailed ? m.rooms_computer_shutdown_failed() : null}
      pending={computer.isShuttingDown}
      title={m.rooms_computer_shutdown_title({ bot: bot.name })}
      variant="destructive"
      onConfirm={() => void computer.shutdown().then(() => onOpenChange(false), () => undefined)}
      onOpenChange={onOpenChange}
    >
      {m.rooms_computer_shutdown_description({ bot: bot.name })}
    </ConfirmationDialog>
  );
}
