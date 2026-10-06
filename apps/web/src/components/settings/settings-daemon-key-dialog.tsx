import { m } from '@orbs/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { rpc } from '@/services/rpc/rpc.client';

export function SettingsDaemonKeyDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const create = useMutation(rpc.apiKeys.create.mutationOptions());

  return (
    <Dialog open onOpenChange={(open) => !create.isPending && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.rooms_daemon_key()}</DialogTitle>
          <DialogDescription>{m.rooms_daemon_key_hint()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {create.data ? (
            <Input
              readOnly
              aria-label={m.rooms_daemon_key()}
              className="font-mono"
              value={`ORBS_API_KEY=${create.data.key}`}
              onFocus={(event) => event.target.select()}
            />
          ) : (
            <Button disabled={create.isPending} onClick={() => create.mutate({ name: m.rooms_daemon_key_name() })}>{m.rooms_daemon_key_create()}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
