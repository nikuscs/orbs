import { computerHostResponseTree } from '../../types/computer-host.types';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostCall, computerHostRenderTree, computerHostSession, computerHostWindowRef } from './computer-host.utils';
import { computerQueryHostWindows } from './computer-query.host-windows';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostTree(
  runtime: HostTypes.ComputerHostRuntime,
  { botId, windowId }: ComputerTypes.ComputerTreeParams,
): Promise<string> {
  const session = await computerHostSession(runtime, botId);
  const windows = windowId === undefined ? await computerQueryHostWindows(runtime, { botId }) : [];
  const id = windowId ?? (windows.find((window) => window.isFocused) ?? windows.at(0))?.id;

  const body: HostTypes.ComputerHostTreeBody = {
    maxDepth: COMPUTER_HOST.treeMaxDepth,
    maxNodes: COMPUTER_HOST.treeMaxNodes,
    window: id === undefined ? undefined : computerHostWindowRef(session, id),
  };

  const tree = await computerHostCall(session.client, 'AccessibilityService/GetTree', body, computerHostResponseTree);

  return computerHostRenderTree(tree);
}
