import { m } from '@orbs/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormErrors } from '@/components/ui/forms/form';
import { MEMORY_STATUS_LABELS } from '@/services/memory/memory.constants';
import { rpc } from '@/services/rpc/rpc.client';

export function MemoryCapture({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  const status = useQuery(rpc.memory.status.queryOptions({ input: { roomId } }));

  const control = useMutation(
    rpc.memory.control.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: rpc.memory.key() }) }),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">{m.memory_capture()}</p>
        <Checkbox
          aria-label={m.memory_capture()}
          checked={Boolean(status.data?.enabled)}
          disabled={control.isPending || status.isPending || status.isError}
          onCheckedChange={(enabled) => control.mutate({ roomId, action: enabled === true ? 'enable' : 'disable' })}
        />
      </div>
      <p className="text-xs text-muted-foreground">{m.memory_capture_hint()}</p>
      {status.data?.enabled ? <p>{MEMORY_STATUS_LABELS[status.data.status]()}</p> : null}
      {status.data?.status === 'paused' ? (
        <>
          <p className="text-sm">{m.memory_capture_reason()}</p>
          <div className="flex gap-2">
            <Button
              disabled={control.isPending}
              type="button"
              onClick={() => control.mutate({ roomId, action: 'retry' })}
            >
              {m.memory_retry()}
            </Button>
            <Button
              disabled={control.isPending || !status.data.canSkip}
              type="button"
              variant="outline"
              onClick={() => control.mutate({ roomId, action: 'skip' })}
            >
              {m.memory_skip()}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{m.memory_skip_hint()}</p>
        </>
      ) : null}
      <FormErrors error={status.isError || control.isError ? m.memory_error() : null} />
    </div>
  );
}
