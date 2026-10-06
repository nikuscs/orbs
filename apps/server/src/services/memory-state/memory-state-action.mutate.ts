import { Errors } from '@orbs/errors/universal';
import { sql } from 'kysely';
import { match } from 'ts-pattern';
import { memorySources } from '#/types/memory.types';
import { memoryStateActionRefresh } from './memory-state-action.refresh';
import { memoryStateQueryOwner } from './memory-state-query.owner';
import { memoryStateQuerySources } from './memory-state-query.sources';
import type { MemoryStateActionMutateParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateActionMutate(deps: MemoryStateServiceDeps, params: MemoryStateActionMutateParams) {
  const { mutation } = params;
  const { scope } = mutation.input;
  await memoryStateQueryOwner(deps, { scope });

  if (params.roomId && (scope.scope !== 'room' || scope.ownerId !== params.roomId || mutation.action === 'share')) {
    throw new Errors.FORBIDDEN();
  }

  if (mutation.action === 'save' && mutation.input.subject.kind === 'room') {
    await memoryStateQueryOwner(deps, { scope: { scope: 'room', ownerId: mutation.input.subject.id } });
  }

  const sourceIds = mutation.action === 'save' || mutation.action === 'update' ? mutation.input.sourceMessageIds : [];
  const sources = memoryStateQuerySources(deps, { roomId: params.roomId ?? (scope.scope === 'room' ? scope.ownerId : ''), ids: sourceIds });

  let subject = mutation.action === 'save' ? mutation.input.subject : undefined;

  if (mutation.action === 'update') {
    const row = await deps.memory.queries.get({ organizationId: deps.organizationId, id: mutation.input.id });
    subject = row ? { kind: row.subjectKind, id: row.subjectId } : undefined;
  }

  if (
    params.roomId &&
    subject &&
    (sources.length === 0 || (subject.kind === 'user' && sources.some((source) => source.authorId !== subject.id)))
  ) {
    throw new Errors.FORBIDDEN();
  }

  if (
    params.roomId &&
    sourceIds.length &&
    (await deps.memory.queries.suppressed({ organizationId: deps.organizationId, sourceIds })).length
  ) {
    throw new Errors.FORBIDDEN();
  }

  if (mutation.action === 'share') {
    await memoryStateQueryOwner(deps, { scope: mutation.input.destination });
  }

  const scopes = mutation.action === 'share' ? [scope, mutation.input.destination] : [scope];

  await Promise.all(
    scopes.map(async (target) => {
      deps.database.run(
        deps.database.db
          .insertInto('memorySnapshot')
          .values({
            ...target,
            text: '',
            dirty: 1,
            dueAt: Date.now(),
          })
          .onConflict((conflict) => conflict.columns(['scope', 'ownerId']).doUpdateSet({ dirty: 1, dueAt: Date.now() })),
      );
    }),
  );

  deps.alarm.set(Date.now());

  const forgotten =
    mutation.action === 'forget'
      ? await deps.memory.queries.get({ organizationId: deps.organizationId, id: mutation.input.id })
      : undefined;

  const recapRooms = forgotten && forgotten.scope === scope.scope && forgotten.ownerId === scope.ownerId
    ? [...new Set(memorySources.parse(JSON.parse(forgotten.sources)).map((source) => source.roomId))]
    : [];

  if (mutation.action === 'forget' && scope.scope === 'room') {
    recapRooms.push(scope.ownerId);
  }

  if (recapRooms.length) {
    deps.database.run(
      deps.database.db
        .updateTable('memoryRoom')
        .set({
          recap: '',
          recapRevision: sql`recapRevision + 1`,
          recapThrough: 0,
        })
        .where('roomId', 'in', recapRooms),
    );
  }

  const result = await match(mutation)
    .with({ action: 'save' }, ({ input }) =>
      deps.memory.actions.save({
        ...input,
        organizationId: deps.organizationId,
        actorId: params.actorId,
        origin: params.automatic ? 'automatic' : 'manual',
        sources,
      }),
    )
    .with({ action: 'update' }, ({ input }) =>
      deps.memory.actions.update({
        ...input,
        organizationId: deps.organizationId,
        sources,
      }),
    )
    .with({ action: 'forget' }, ({ input }) => deps.memory.actions.forget({ ...input, organizationId: deps.organizationId }))
    .with({ action: 'share' }, ({ input }) => deps.memory.actions.share({ ...input, organizationId: deps.organizationId }))
    .exhaustive();

  if (!params.deferRefresh) {
    await Promise.all(scopes.map((target) => memoryStateActionRefresh(deps, { scope: target })));
  }

  deps.sockets.broadcast({ type: 'memory.updated' });

  return result;
}
