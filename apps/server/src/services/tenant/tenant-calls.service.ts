import { tenantActionAlarm } from './tenant-action.alarm';
import { tenantActionDaemonMessage } from './tenant-action.daemon-message';
import type * as TenantCallsTypes from '#/types/tenant-calls.types';
import type { TenantCalls } from '#/types/tenant.types';

export function makeTenantCallsService(deps: TenantCallsTypes.TenantCallsServiceDeps) {
  const { enter, exclusive, harness, memoryCapture, memoryState, room, run, sockets } = deps;

  const calls: TenantCalls = {
    daemonHarnesses: () => enter(() => harness.queries.list()),
    daemonSkills: (params) => enter(() => harness.actions.listSkills(params)),
    daemonModels: (params) => enter(() => harness.actions.listModels(params)),
    memoryStatus: (params) => enter(() => memoryCapture.queries.status(params)),
    memoryControl: (params) => exclusive(() => memoryCapture.actions.control(params)),
    memoryList: (params) => enter(() => memoryState.queries.list(params)),
    memoryExport: (params) => enter(() => memoryState.queries.export(params)),
    memoryWipe: (params) => exclusive(() => memoryState.actions.wipe(params)),
    memoryMutate: (params) => exclusive(() => memoryState.actions.mutate(params)),
    roomList: () => enter(() => room.queries.list()),
    roomGet: (params) => enter(() => room.queries.get(params)),
    roomTimeline: (params) => enter(() => room.queries.timeline(params)),
    roomHistory: (params) => enter(() => room.queries.history(params)),
    roomReactions: (params) => enter(() => room.queries.reactions(params)),
    roomFile: (params) => enter(() => room.queries.file(params)),
    roomCreate: (params) => exclusive(() => room.actions.create(params)),
    roomOpenTeam: (params) => exclusive(() => room.actions.openTeam(params)),
    roomOpenDirect: (params) => exclusive(() => room.actions.openDirect(params)),
    roomReset: (params) => enter(() => room.actions.reset(params)),
    roomDelete: (params) => exclusive(() => room.actions.delete(params)),
    botDelete: (params) => exclusive(() => room.actions.deleteBot(params)),
    roomUpdate: (params) => exclusive(() => room.actions.update(params)),
    roomArrange: (params) => enter(() => room.actions.arrange(params)),
    roomSend: (params) => enter(() => room.actions.send(params)),
    roomAddFile: (params) => enter(() => room.actions.addFile(params)),
    roomRemoveFile: (params) => enter(() => room.actions.removeFile(params)),
    roomRerun: (params) => enter(() => room.actions.rerun(params)),
    roomAddReaction: (params) => enter(() => room.actions.addReaction(params)),
    roomRemoveReaction: (params) => enter(() => room.actions.removeReaction(params)),
    runStop: (params) => enter(() => run.actions.stop(params)),
    runDrafts: (params) => enter(() => run.queries.drafts(params)),
    runRetry: (params) => enter(() => run.actions.retry(params)),
    runCancel: (params) => enter(() => run.actions.cancel(params)),
    runApprove: (params) => enter(() => run.actions.approve(params)),
    socketsClose: (params) => enter(() => {
      if (sockets.revoke(params.tag)) {
        harness.actions.revoked();
      }
    }),
  };

  return {
    ...calls,
    alarm: () => tenantActionAlarm(deps),
    daemonMessage: (params: TenantCallsTypes.TenantCallsDaemonMessageParams) => tenantActionDaemonMessage(deps, params),
  };
}

export type TenantCallsService = ReturnType<typeof makeTenantCallsService>;
