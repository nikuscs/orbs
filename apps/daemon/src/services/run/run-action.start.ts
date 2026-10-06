import { isAppError } from '@orbs/errors/universal';
import { log } from '@orbs/logger/daemon';
import { readUIMessageStream } from 'ai';
import { daemonRunFailure } from '@orbs/server/daemon';
import { RUN } from './run.constants';
import type * as HarnessTypes from '#/types/harness.types';
import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonRunFailure, DaemonStartMessage } from '@orbs/server/daemon';
import type { UIMessage, UIMessageChunk } from 'ai';

export async function runActionStart(deps: RunServiceDeps, params: DaemonStartMessage): Promise<void> {
  async function runPartsFromChunks(inputChunks: UIMessageChunk[]): Promise<UIMessage['parts']> {
    const stream = new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        for (const chunk of inputChunks) {
          controller.enqueue(chunk);
        }

        controller.close();
      },
    });

    const messages = await Array.fromAsync(readUIMessageStream({ stream }));

    return messages.at(-1)?.parts ?? [];
  }

  function runDeltaBatcher(send: HarnessTypes.HarnessTurnParams['emit']) {
    let pending: UIMessageChunk | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const runFlush = () => {
      clearTimeout(timer);
      timer = undefined;

      if (pending) {
        send(pending);
        pending = undefined;
      }
    };

    const runPush = (chunk: UIMessageChunk) => {
      const isDelta = chunk.type === 'text-delta' || chunk.type === 'reasoning-delta';

      if (isDelta && pending?.type === chunk.type && pending.id === chunk.id) {
        pending = { ...pending, delta: pending.delta + chunk.delta };
        return;
      }

      runFlush();

      if (!isDelta) {
        send(chunk);
        return;
      }

      pending = chunk;
      timer = setTimeout(runFlush, RUN.deltaFlushMs);
    };

    return { push: runPush, flush: runFlush };
  }

  async function runTurn(
    serviceDeps: RunServiceDeps,
    adapter: HarnessTypes.HarnessAdapter | null,
    input: HarnessTypes.HarnessTurnParams,
  ): Promise<HarnessTypes.HarnessTurnResult> {
    const controller = new AbortController();
    const active = { adapter, controller, roomId: input.roomId, downloading: true, deleted: false };

    serviceDeps.turns.set(input.runId, active);
    serviceDeps.connection.actions.send({ type: 'run.accepted', runId: input.runId });

    try {
      const downloads = await Promise.allSettled(input.files.map((file) => serviceDeps.file.actions.download({ file, signal: controller.signal })));

      for (const [index, result] of downloads.entries()) {
        if (result.status === 'rejected' && !controller.signal.aborted) {
          log.warn({
            tag: 'file',
            message: 'file download failed',
            fileId: input.files[index]?.id,
            error: result.reason,
          });
        }
      }

      if (controller.signal.aborted) {
        return { status: 'cancelled', failure: null, resume: input.resume, steeredMessageIds: [], usage: null };
      }

      active.downloading = false;

      if (!adapter) {
        return unavailable;
      }

      const problem = await adapter.problem();

      if (problem) {
        return { ...unavailable, failure: problem };
      }

      return await adapter.startTurn({ ...input, mcpInternal: serviceDeps.mcpInternal.actions.open(input) });
    } catch (error) {
      log.error({
        tag: 'daemon',
        message: 'turn failed',
        runId: input.runId,
        error,
      });

      const tagged = daemonRunFailure.safeParse(isAppError(error) ? error.cause : null);
      const untagged: DaemonRunFailure = { code: 'turn_error', detail: isAppError(error) ? error.internal : String(error) };

      return {
        status: 'failed',
        failure: tagged.success ? tagged.data : untagged,
        resume: input.resume,
        steeredMessageIds: [],
        usage: null,
      };
    } finally {
      serviceDeps.mcpInternal.actions.close(input.runId);
      if (active.deleted) {
        await serviceDeps.file.actions.removeRoom({ roomId: input.roomId });
      }

      serviceDeps.turns.delete(input.runId);
    }
  }

  const adapter = deps.harness.queries.get({ harnessId: params.harnessId });
  const chunks: UIMessageChunk[] = [];

  const batcher = runDeltaBatcher((chunk) => deps.connection.actions.send({
    type: 'run.chunk',
    runId: params.runId,
    chunk,
  }));

  const runEmit = (chunk: UIMessageChunk) => {
    chunks.push(chunk);
    batcher.push(chunk);
  };

  const runRequestApproval = (request: HarnessTypes.HarnessApprovalRequest) => deps.connection.actions.send({
    type: 'run.approval',
    runId: params.runId,
    ...request,
  });

  const unavailable: HarnessTypes.HarnessTurnResult = {
    status: 'failed',
    failure: { code: 'turn_error', detail: `harness ${params.harnessId} is not available` },
    resume: params.resume,
    steeredMessageIds: [],
    usage: null,
  };

  if (!adapter) {
    log.warn({
      tag: 'daemon',
      message: 'harness not available',
      harnessId: params.harnessId,
    });
  }

  const turn: HarnessTypes.HarnessTurnParams = {
    ...params,
    emit: runEmit,
    requestApproval: runRequestApproval,
  };

  runEmit({ type: 'start' });
  const result = await runTurn(deps, adapter, turn);
  runEmit({ type: 'finish' });
  batcher.flush();

  deps.connection.actions.send({
    type: 'run.end',
    runId: params.runId,
    status: result.status,
    failure: result.failure,
    parts: await runPartsFromChunks(chunks),
    resume: result.resume,
    steeredMessageIds: result.steeredMessageIds,
    usage: result.usage,
  });
}
