import { daemonHarness } from '#/types/daemon.types';
import type { DaemonHarness } from '#/types/daemon.types';
import type { HarnessServiceDeps } from '#/types/harness.types';

export function harnessQueryList(deps: HarnessServiceDeps): DaemonHarness[] {
  const rows = deps.database.all(deps.database.db
    .selectFrom('harness')
    .select('catalogue')
    .orderBy('id'));

  return rows.flatMap((row) => {
    const harness = daemonHarness.safeParse(JSON.parse(row.catalogue));

    return harness.success ? [harness.data] : [];
  });
}
