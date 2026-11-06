import { computerHostResponseWindows } from '../../types/computer-host.types';
import { computerHostCall, computerHostSession } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerQueryHostWindows(
  runtime: HostTypes.ComputerHostRuntime,
  { botId }: ComputerTypes.ComputerBotParams,
): Promise<ComputerTypes.ComputerWindow[]> {
  const session = await computerHostSession(runtime, botId);
  const response = await computerHostCall(session.client, 'WindowsService/ListWindows', {}, computerHostResponseWindows);

  return response.windows.map((window) => {
    const windowNumber = session.windowNumbers.get(window.ref.id) ?? session.windowNumbers.size + 1;
    session.windowNumbers.set(window.ref.id, windowNumber);
    session.windowRefs.set(windowNumber, window.ref);

    return {
      id: windowNumber,
      title: window.title,
      app: window.app.name,
      isFocused: window.focused,
      bounds: window.bounds,
    };
  });
}
