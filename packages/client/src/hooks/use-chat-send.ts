import { m } from '@repo/i18n/client';
import { useMutation, useMutationState } from '@tanstack/react-query';
import { generateId } from 'ai';
import { useEffect, useEffectEvent, useRef } from 'react';
import { chatResetCommand } from '../services/chat/chat.utils';
import { mentionSubmission } from '../services/mention/mention.utils';
import { useRpc } from './use-rpc';
import type { ChatSendInput, ChatSendParams, ChatSendResult } from '../types/chat.types';
import type { CommandExecuteInput, CommandExecuteResult } from '@repo/contracts/universal';
import type { MutationState } from '@tanstack/react-query';

export function useChatSend({ botId, conversationId, latestEntryId, onOutgoingChange, onResetDone }: ChatSendParams) {
  const { rpc } = useRpc();
  const pending = useRef<{ key: string; id: string } | null>(null);
  const submit = useMutation(rpc.conversation.submit.mutationOptions());
  const execute = useMutation(rpc.commands.execute.mutationOptions());
  const stop = useMutation(rpc.conversation.stop.mutationOptions({ meta: { error: m.rooms_chat_stop_failed() } }));

  const executed = useMutationState<MutationState<CommandExecuteResult, Error, CommandExecuteInput>>({
    filters: { mutationKey: rpc.commands.execute.mutationKey(), status: 'success' },
  });

  const resetAt = Math.max(0, ...executed
    .filter((command) => command.variables?.botId === botId && command.variables.name === 'reset')
    .map((command) => command.submittedAt));

  const clearedAt = useRef(resetAt);
  const resetDone = useEffectEvent(onResetDone);

  useEffect(() => {
    if (resetAt <= clearedAt.current) {
      return;
    }

    clearedAt.current = resetAt;
    resetDone();
  }, [resetAt]);

  async function send({ text, attachmentIds, replyToEntryId }: ChatSendInput): Promise<ChatSendResult> {
    submit.reset();
    execute.reset();

    const { content, skills, command } = mentionSubmission({ text });
    const reset = chatResetCommand(text);

    if (reset) {
      return { kind: 'reset', ...reset };
    }

    if (command) {
      await execute.mutateAsync({
        botId,
        conversationId,
        name: command.name,
        arguments: command.arguments || undefined,
      });

      return { kind: 'command' };
    }

    const key = JSON.stringify({
      content,
      skills,
      attachmentIds,
      replyToEntryId,
    });

    const request = pending.current?.key === key ? pending.current : { key, id: generateId() };
    pending.current = null;

    if (text.trim()) {
      onOutgoingChange((items) => [
        ...items.filter((item) => item.requestId !== request.id),
        { requestId: request.id, botId, text: text.trim(), afterEntryId: latestEntryId, createdAt: Date.now() },
      ]);
    }

    try {
      const { submissionId } = await submit.mutateAsync({
        botId,
        conversationId,
        requestId: request.id,
        content,
        attachmentIds,
        replyToEntryId,
        skills: skills.length > 0 ? skills : undefined,
      });

      onOutgoingChange((items) => items.map((item) => (item.requestId === request.id ? { ...item, submissionId } : item)));

      return { kind: 'sent' };
    } catch (error) {
      pending.current = request;
      onOutgoingChange((items) => items.filter((item) => item.requestId !== request.id));
      throw error;
    }
  }

  return {
    send,
    isSending: submit.isPending,
    problem: submit.isError || execute.isError ? m.rooms_chat_send_failed() : null,
    stop: () => stop.mutate({ botId, conversationId }),
  };
}
