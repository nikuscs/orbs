import { m } from '@orbs/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { ConfirmationDialog } from '@/components/ui/alert-dialog';
import { toasty } from '@/components/ui/sonner';
import { rpc } from '@/services/rpc/rpc.client';
import type { Bot } from '@orbs/server/client';

export function RoomsResetDialog({ roomId, bots, onOpenChange }: { roomId: string; bots: Bot[]; onOpenChange: (open: boolean) => void }) {
  const reset = useMutation(rpc.rooms.reset.mutationOptions({
    onSuccess: () => toasty(m.rooms_fresh_done(), '✨'),
    onError: () => toasty(m.rooms_fresh_failed(), '⏳'),
  }));

  const only = bots.length === 1 ? bots[0] : null;

  return (
    <ConfirmationDialog
      confirmLabel={m.rooms_member_reset()}
      pending={reset.isPending}
      title={only ? m.rooms_reset_title({ bot: only.name }) : m.rooms_reset_all_title()}
      onConfirm={() => reset.mutate({ roomId, botIds: bots.map((bot) => bot.id) })}
      onOpenChange={onOpenChange}
    >
      {only ? m.rooms_reset_description({ bot: only.name }) : m.rooms_reset_all_description()}
    </ConfirmationDialog>
  );
}
