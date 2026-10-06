import { vi } from 'vitest';
import type { TenantCalls, TenantDirectory } from '#/types/tenant.types';

export function createMockTenantNamespace(): TenantDirectory {
  const unexpected = (): never => {
    throw new TypeError('Unexpected tenant operation in test');
  };

  const calls: TenantCalls = {
    socketsClose: vi.fn<TenantCalls['socketsClose']>(() => Promise.resolve()),
    daemonHarnesses: unexpected,
    daemonSkills: unexpected,
    daemonModels: unexpected,
    memoryStatus: unexpected,
    memoryControl: unexpected,
    memoryList: unexpected,
    memoryExport: unexpected,
    memoryWipe: unexpected,
    memoryMutate: unexpected,
    roomList: unexpected,
    roomGet: unexpected,
    roomTimeline: unexpected,
    roomHistory: unexpected,
    roomReactions: unexpected,
    roomCreate: unexpected,
    roomOpenTeam: unexpected,
    roomOpenDirect: unexpected,
    roomReset: unexpected,
    roomDelete: unexpected,
    botDelete: unexpected,
    roomUpdate: unexpected,
    roomArrange: unexpected,
    roomSend: unexpected,
    roomAddFile: unexpected,
    roomRemoveFile: unexpected,
    roomFile: unexpected,
    roomRerun: unexpected,
    roomAddReaction: unexpected,
    roomRemoveReaction: unexpected,
    runStop: unexpected,
    runDrafts: unexpected,
    runRetry: unexpected,
    runCancel: unexpected,
    runApprove: unexpected,
  };

  return { getByName: vi.fn<TenantDirectory['getByName']>(() => calls) };
}
