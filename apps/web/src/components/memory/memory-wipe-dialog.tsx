import { m } from '@orbs/i18n/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormErrors } from '@/components/ui/forms/form';
import { rpc } from '@/services/rpc/rpc.client';
import type { MemoryWipeInput } from '@orbs/server/client';

export function MemoryWipeDialog({
  scope,
  name,
  onOpenChange,
}: {
  scope: MemoryWipeInput['scope'];
  name: string;
  onOpenChange: (open: boolean) => void;
}) {
  const operationId = useRef(crypto.randomUUID());
  const queryClient = useQueryClient();

  const wipe = useMutation(
    rpc.memory.wipe.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: rpc.memory.key() });
        onOpenChange(false);
      },
    }),
  );

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !wipe.isPending && onOpenChange(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.memory_wipe_title({ name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {scope.scope === 'room'
              ? m.memory_wipe_room_description()
              : m.memory_wipe_bot_description()}
          </AlertDialogDescription>
          <AlertDialogDescription>
            {m.memory_wipe_history_hint()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormErrors error={wipe.isError ? m.memory_wipe_error() : null} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={wipe.isPending}>
            {m.ui_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={wipe.isPending}
            variant="link-destructive"
            onClick={(event) => {
              event.preventDefault();
              wipe.mutate({ scope, operationId: operationId.current });
            }}
          >
            {wipe.isPending ? m.memory_wiping() : m.memory_wipe_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
