import { m } from '@orbs/i18n/client';
import { ORPCError } from '@orpc/client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { rpc } from '@/services/rpc/rpc.client';

export function RoomsChatApproval({ approvalId }: { approvalId: string }) {
  const answer = useMutation(rpc.rooms.approve.mutationOptions());
  const gone = answer.error instanceof ORPCError && answer.error.code === 'NOT_FOUND';
  const answered = answer.isPending || answer.isSuccess;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground">{m.rooms_chat_approval_question()}</span>
        <Button
          disabled={answered}
          size="xs"
          onClick={() => answer.mutate({ approvalId, approved: true })}
        >
          {m.rooms_chat_approval_allow()}
        </Button>
        <Button
          disabled={answered}
          size="xs"
          variant="outline"
          onClick={() => answer.mutate({ approvalId, approved: false })}
        >
          {m.rooms_chat_approval_deny()}
        </Button>
      </div>
      {answer.isError ? <p className="text-xs text-destructive" role="alert">{gone ? m.rooms_chat_approval_gone() : m.rooms_chat_approval_error()}</p> : null}
    </div>
  );
}
