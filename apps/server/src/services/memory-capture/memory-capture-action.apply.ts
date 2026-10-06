import { Errors, isAppError } from '@orbs/errors/universal';
import { memoryExtractionResult, memoryExtractionSources } from '#/types/memory-extraction.types';
import { MEMORY } from '#services/memory/memory.constants';
import { memoryCaptureActionFail } from './memory-capture-action.fail';
import type { MemoryCaptureQueryStatusParams, MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export async function memoryCaptureActionApply(deps: MemoryCaptureServiceDeps, params: MemoryCaptureQueryStatusParams): Promise<void> {
  const { db } = deps.database;
  const job = deps.database.all(db.selectFrom('memoryRoom').selectAll().where('roomId', '=', params.roomId)).at(0);

  if (!job?.result || !job.source || !job.requestId || !job.enabled) {
    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({
          status: 'paused',
          dueAt: null,
          error: 'invalid_job',
        })
        .where('roomId', '=', params.roomId),
    );
    return;
  }

  try {
    const result = memoryExtractionResult.parse(JSON.parse(job.result));
    const sources = memoryExtractionSources.parse(JSON.parse(job.source));

    const blocked = new Set(
      await deps.memory.queries.suppressed({ organizationId: deps.organizationId, sourceIds: sources.map((source) => source.id) }),
    );

    const rejected = await (job.captureFacts ? result.changes : []).reduce(async (previous, candidate, index) => {
      const count = await previous;

      try {
        const evidence = sources.filter((source) => candidate.sourceIds.includes(source.id));

        if (
          (!candidate.id && candidate.merge?.length) ||
          (candidate.id === null) !== (candidate.expectedRevision === null) ||
          evidence.some((source) => source.role !== 'user') ||
          evidence.length !== new Set(candidate.sourceIds).size ||
          evidence.some((source) => blocked.has(source.id)) ||
          (candidate.subject.kind === 'user' && evidence.some((source) => source.authorId !== candidate.subject.id)) ||
          (candidate.subject.kind === 'room' && candidate.subject.id !== job.roomId) ||
          candidate.subject.kind === 'bot'
        ) {
          throw new Errors.FORBIDDEN();
        }

        if (candidate.id) {
          const current = await deps.memory.queries.get({ organizationId: deps.organizationId, id: candidate.id });

          if (!current || current.subjectKind !== candidate.subject.kind || current.subjectId !== candidate.subject.id) {
            throw new Errors.FORBIDDEN();
          }
        }

        const input = {
          operationId: `${job.generation}:${job.requestId}:${index}`,
          scope: { scope: 'room' as const, ownerId: job.roomId },
          text: candidate.text,
          sourceMessageIds: candidate.sourceIds,
          merge: candidate.merge,
        };

        await deps.memoryState.actions.mutate({
          actorId: evidence[0]?.authorId ?? '',
          roomId: job.roomId,
          automatic: true,
          deferRefresh: true,
          mutation: candidate.id && candidate.expectedRevision
            ? { action: 'update', input: { ...input, id: candidate.id, expectedRevision: candidate.expectedRevision } }
            : { action: 'save', input: { ...input, subject: candidate.subject } },
        });
      } catch (error) {
        if (isAppError(error) && ['FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'VALIDATION_ERROR'].includes(error.code)) {
          return count + 1;
        }
        throw error;
      }

      return count;
    }, Promise.resolve(0));

    await deps.memoryState.actions.refresh({ scope: { scope: 'room', ownerId: job.roomId } });
    if (!result.complete && job.captureFacts) {
      const paused = job.attempt + 1 >= MEMORY.retryMs.length;
      deps.database.run(
        db
          .updateTable('memoryRoom')
          .set({
            status: paused ? 'paused' : 'pending',
            result: null,
            requestId: null,
            attempt: job.attempt + 1,
            dueAt: paused ? null : Date.now() + MEMORY.debounceMs,
            error: 'candidate_budget',
          })
          .where('roomId', '=', job.roomId),
      );
      deps.sockets.broadcast({ type: 'memory.updated' });

      return;
    }

    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({
          status: 'pending',
          cursor: sources.at(-1)?.endOffset ? job.throughSeq - 1 : job.throughSeq,
          offset: sources.at(-1)?.endOffset ?? 0,
          source: null,
          result: null,
          requestId: null,
          attempt: 0,
          error: rejected ? `rejected_candidates:${rejected}` : null,
          dueAt: Date.now() + MEMORY.debounceMs,
          recap: blocked.size || job.baseRecapRevision !== job.recapRevision ? '' : result.recap,
          recapFrom: job.recapFrom || job.fromSeq,
          recapThrough: job.throughSeq,
          recapRevision: job.recapRevision + 1,
        })
        .where('roomId', '=', job.roomId)
        .where('generation', '=', job.generation),
    );
    deps.sockets.broadcast({ type: 'memory.updated' });
  } catch (error) {
    memoryCaptureActionFail(deps, { roomId: job.roomId, error: error instanceof Errors.CONFLICT ? 'revision_conflict' : 'apply_failed' });
  }
}
