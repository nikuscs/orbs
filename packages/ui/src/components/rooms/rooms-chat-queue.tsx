import { botSkillName } from '@repo/client/client';
import { useChatQueue } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import IconArrowUp from '~icons/lucide/arrow-up';
import IconBox from '~icons/lucide/box';
import IconListOrdered from '~icons/lucide/list-ordered';
import IconX from '~icons/lucide/x';
import { cn } from '../../lib/cn';
import { PromptInputButton, PromptInputDrawer } from '../ai/prompt-input';
import { Mention } from '../mention';
import type { ChatQueued, ChatQueueParams } from '@repo/client/client';

interface RoomsChatQueueProps {
  botId: string
  botName: string
  conversationId: number
  queued: ChatQueued[]
  onOutgoingChange: ChatQueueParams['onOutgoingChange']
}

export function RoomsChatQueue({ botId, botName, conversationId, queued, onOutgoingChange }: RoomsChatQueueProps) {
  const queue = useChatQueue({
    botId,
    conversationId,
    onOutgoingChange,
  });

  if (queued.length === 0) {
    return null;
  }

  return (
    <PromptInputDrawer>
      <section aria-label={m.rooms_chat_queue()} aria-live="polite">
        <ol>
          {queued.map((item) => {
            const problem = queue.problem(item.submissionId);

            return (
              <li className="flex min-w-0 items-center gap-2 rounded-lg py-0.5 pr-0.5 pl-2 text-xs" key={item.submissionId}>
                <IconListOrdered aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                {problem
                  ? null
                  : item.skills.map((name) => (
                    <Mention className="my-0 shrink-0 text-xs" key={name} variant="skill">
                      <IconBox className="size-3.5 p-0.5" />
                      {botSkillName({ name })}
                    </Mention>
                  ))}
                <span className={cn('min-w-0 flex-1 truncate', problem ? 'text-destructive' : 'text-muted-foreground')} title={item.text}>
                  {problem ?? item.text}
                </span>
                <PromptInputButton
                  aria-label={m.rooms_chat_queue_send()}
                  disabled={queue.isPending}
                  size="icon-xs"
                  title={m.rooms_chat_queue_send_hint({ bot: botName })}
                  onClick={() => queue.sendNow(item.submissionId)}
                >
                  <IconArrowUp className="size-3.5" />
                </PromptInputButton>
                <PromptInputButton
                  aria-label={m.rooms_chat_queue_remove()}
                  disabled={queue.isPending}
                  size="icon-xs"
                  title={m.rooms_chat_queue_remove()}
                  onClick={() => queue.remove(item.submissionId)}
                >
                  <IconX className="size-3.5" />
                </PromptInputButton>
              </li>
            );
          })}
        </ol>
      </section>
    </PromptInputDrawer>
  );
}
