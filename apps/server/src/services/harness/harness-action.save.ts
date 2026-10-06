import type { HarnessActionSaveParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionSave(deps: HarnessServiceDeps, params: HarnessActionSaveParams): void {
  const updatedAt = new Date().toISOString();
  const { db } = deps.database;

  deps.database.transaction(() => {
    deps.database.run(db.deleteFrom('harness'));

    if (params.harnesses.length > 0) {
      deps.database.run(db.insertInto('harness').values(params.harnesses.map((harness) => ({
        id: harness.harnessId,
        catalogue: JSON.stringify(harness),
        updatedAt,
      }))));
    }
  });
}
