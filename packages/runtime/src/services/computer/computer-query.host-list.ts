import { computerDriverList } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';

export function computerQueryHostList(runtime: HostTypes.ComputerHostRuntime): Promise<string[]> {
  return computerDriverList(runtime.socket);
}
