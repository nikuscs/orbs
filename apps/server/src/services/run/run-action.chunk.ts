import { safeValidateTypes } from '@ai-sdk/provider-utils';
import { uiMessageChunkSchema } from 'ai';
import { roomMessageCompaction, roomMessageRetry } from '#/types/room.types';
import { runChunkSave, runClipChunk } from './run.utils';
import type { RunActionChunkParams, RunServiceDeps } from '#/types/run.types';

export async function runActionChunk(deps: RunServiceDeps, params: RunActionChunkParams): Promise<void> {
  const parsed = await safeValidateTypes({ value: params.chunk, schema: uiMessageChunkSchema });

  const run = deps.database.all(deps.database.db
    .selectFrom('run')
    .select(['id', 'roomId', 'status', 'activity', 'activeTools'])
    .where('id', '=', params.runId)).at(0);

  if (!parsed.success || run?.status !== 'running') {
    return;
  }

  const chunk = runClipChunk(parsed.value);
  let activity = run.activity;
  let activeTools = run.activeTools;

  if (chunk.type === 'data-compaction') {
    const compaction = roomMessageCompaction.safeParse(chunk.data);

    if (!compaction.success) {
      return;
    }

    const resumed = activeTools > 0 ? 'working' : 'thinking';
    activity = compaction.data.status === 'running' ? 'compacting' : resumed;
  } else if (chunk.type === 'data-retry') {
    const retry = roomMessageRetry.safeParse(chunk.data);

    if (!retry.success) {
      return;
    }

    activity = retry.data.status === 'running' ? 'retrying' : 'thinking';
  } else if (chunk.type.startsWith('data-')) {
    return;
  } else if (chunk.type === 'tool-input-available') {
    activeTools += 1;
    activity = run.activity === 'compacting' ? 'compacting' : 'working';
  } else if (chunk.type === 'tool-output-available' || chunk.type === 'tool-output-error' || chunk.type === 'tool-output-denied') {
    activeTools = Math.max(0, activeTools - 1);
    const resumed = activeTools > 0 ? 'working' : 'thinking';
    activity = run.activity === 'compacting' ? 'compacting' : resumed;
  } else if (run.activity !== 'compacting' && activeTools === 0) {
    if (chunk.type === 'text-start' || chunk.type === 'text-delta') {
      activity = 'writing';
    } else if (chunk.type === 'reasoning-start' || chunk.type === 'reasoning-delta' || chunk.type === 'start-step' || chunk.type === 'text-end') {
      activity = 'thinking';
    }
  }

  if (activity !== run.activity || activeTools !== run.activeTools) {
    deps.database.run(deps.database.db
      .updateTable('run')
      .set({ activity, activeTools })
      .where('id', '=', run.id));
  }

  if (activity !== run.activity) {
    deps.sockets.broadcast({
      type: 'run.activity',
      roomId: run.roomId,
      runId: run.id,
      activity,
    });
  }

  runChunkSave(deps, run, chunk);
}
