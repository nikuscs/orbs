import { m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { match } from 'ts-pattern';
import { COMPUTER } from '../services/computer/computer.constants';
import { useRpc } from './use-rpc';
import type { ComputerStatus, ComputerViewerMode } from '@repo/contracts/universal';

export function useComputer(botId: string) {
  const queryClient = useQueryClient();
  const { rpc } = useRpc();
  const input = { botId };

  const status = useQuery(rpc.computers.status.queryOptions({
    input,
    refetchInterval: COMPUTER.statusRefetchMs,
  }));

  const isRunning = status.data?.state === 'running';

  const thumbnail = useQuery(rpc.computers.thumbnail.queryOptions({
    input,
    refetchInterval: isRunning ? COMPUTER.thumbnailRefetchMs : false,
    refetchOnWindowFocus: isRunning,
    staleTime: isRunning ? 0 : Infinity,
  }));

  const sync = async (next: ComputerStatus) => {
    queryClient.setQueryData(rpc.computers.status.queryKey({ input }), next);
    await queryClient.invalidateQueries({ queryKey: rpc.computers.thumbnail.queryKey({ input }) });
  };

  const start = useMutation(rpc.computers.start.mutationOptions({ onSuccess: sync }));
  const sleep = useMutation(rpc.computers.sleep.mutationOptions({ onSuccess: sync }));
  const shutdown = useMutation(rpc.computers.shutdown.mutationOptions({ onSuccess: sync }));
  const release = useMutation(rpc.computers.release.mutationOptions({ onSuccess: sync }));
  const touch = useMutation(rpc.computers.touch.mutationOptions({ onSuccess: sync }));
  const viewer = useMutation(rpc.computers.viewer.mutationOptions());
  const answer = useMutation(rpc.conversation.answerQuestion.mutationOptions({ meta: { invalidates: [rpc.conversation.questions.key()] } }));
  const handoff = status.data?.handoff ?? null;

  const actionError = match({
    start: start.isError,
    sleep: sleep.isError,
    shutdown: shutdown.isError,
    release: release.isError || answer.isError,
    takeOver: viewer.isError && viewer.variables.mode === 'control',
  })
    .with({ start: true }, () => m.rooms_computer_start_failed())
    .with({ sleep: true }, () => m.rooms_computer_sleep_failed())
    .with({ shutdown: true }, () => m.rooms_computer_shutdown_failed())
    .with({ takeOver: true }, () => m.rooms_computer_take_over_failed())
    .with({ release: true }, () => m.rooms_computer_release_failed())
    .otherwise(() => null);

  const { mutate: touchMutate } = touch;
  const { mutateAsync: viewerMutate } = viewer;
  const sendTouch = useCallback(() => touchMutate({ botId }), [touchMutate, botId]);
  const openViewer = useCallback((mode: ComputerViewerMode) => viewerMutate({ botId, mode }), [viewerMutate, botId]);

  return {
    status: status.data ?? null,
    thumbnail: thumbnail.data ?? null,
    isLoading: status.isPending,
    isError: status.isError,
    isBusy: start.isPending || sleep.isPending || shutdown.isPending || release.isPending || answer.isPending,
    actionError,
    start: () => start.mutateAsync(input),
    sleep: () => sleep.mutateAsync(input),
    shutdown: () => shutdown.mutateAsync(input),
    release: () => release.mutateAsync(input),
    answerHandoff: async () => {
      await match(handoff)
        .with(null, () => undefined)
        .otherwise(({ conversationId, questionId, choice }) => answer.mutateAsync({
          botId,
          conversationId,
          id: questionId,
          answer: { kind: 'choices', choices: [choice] },
        }));
    },
    touch: sendTouch,
    openViewer,
    hasViewerFailed: viewer.isError && viewer.variables.mode !== 'control',
    isShuttingDown: shutdown.isPending,
    hasShutdownFailed: shutdown.isError,
  };
}
