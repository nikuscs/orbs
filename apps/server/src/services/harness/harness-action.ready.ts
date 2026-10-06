import { harnessActionSave } from './harness-action.save';
import type { HarnessActionReadyParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionReady(deps: HarnessServiceDeps, params: HarnessActionReadyParams): void {
  harnessActionSave(deps, params);

  const roomIds = deps.database.all(deps.database.db.selectFrom('room').select('id')).map((room) => room.id);

  deps.sockets.daemon()?.send({ type: 'rooms.alive', roomIds });
  deps.run.actions.dispatch();
}
