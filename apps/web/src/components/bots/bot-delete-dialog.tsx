import { m } from '@orbs/i18n/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRoomsRefresh } from '@/hooks/use-rooms-refresh';
import { rpc } from '@/services/rpc/rpc.client';
import type { Bot } from '@orbs/server/client';

export function BotDeleteDialog({ bot, onOpenChange, onDeleted }: { bot: Bot; onOpenChange: (open: boolean) => void; onDeleted: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const refresh = useRoomsRefresh();

  const remove = useMutation(rpc.bots.delete.mutationOptions({
    onSuccess: async () => {
      await onDeleted();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rpc.bots.list.key() }),
        refresh(),
      ]);
    },
  }));

  return (
    <AlertDialog open onOpenChange={(open) => !remove.isPending && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.rooms_bot_delete_title({ bot: bot.name })}</AlertDialogTitle>
          <AlertDialogDescription>{m.rooms_bot_delete_description()}</AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError ? <p className="text-sm text-destructive" role="alert">{m.rooms_bot_delete_error()}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{m.ui_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            variant="red"
            onClick={(event) => {
              event.preventDefault();
              remove.mutate({ botId: bot.id });
            }}
          >
            {m.rooms_bot_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
