import type { RunDraft, RunQueryDraftsParams, RunServiceDeps } from '#/types/run.types';

export function runQueryDrafts(deps: RunServiceDeps, params: RunQueryDraftsParams): RunDraft[] {
  const { db } = deps.database;

  const rows = deps.database.all(db
    .selectFrom('chunk')
    .innerJoin('run', 'run.id', 'chunk.runId')
    .select(['chunk.id', 'chunk.runId', 'chunk.body'])
    .where('run.roomId', '=', params.roomId)
    .where('run.status', '=', 'running')
    .orderBy('chunk.id'));

  const drafts = new Map<string, RunDraft>();

  for (const row of rows) {
    const draft = drafts.get(row.runId) ?? { runId: row.runId, chunks: [] };

    draft.chunks.push({ id: row.id, body: row.body });
    drafts.set(row.runId, draft);
  }

  return [...drafts.values()];
}
