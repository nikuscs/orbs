import { match, P } from 'ts-pattern';
import {
  computerHostBrowserAct,
  computerHostBrowserConnect,
  computerHostBrowserDescribe,
  computerHostBrowserOpen,
  computerHostBrowserTab,
} from './computer-host-browser.utils';
import { computerHostPrepare } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export async function computerActionHostBrowser(
  runtime: HostTypes.ComputerHostRuntime,
  { botId, input }: ComputerTypes.ComputerBrowserParams,
): Promise<ComputerTypes.ComputerBrowserResult> {
  const session = await computerHostPrepare(runtime, botId);
  const connection = await computerHostBrowserConnect(runtime, session);

  await match(input)
    .with({ call: 'open' }, ({ url }) => computerHostBrowserOpen(connection, url))
    .with({ call: 'act' }, (act) => computerHostBrowserAct(connection, act))
    .with({ call: 'tabs', tab: P.nonNullable }, ({ tab }) => computerHostBrowserTab(connection, tab))
    .with({ call: 'tabs' }, { call: 'snapshot' }, () => Promise.resolve())
    .exhaustive();

  return computerHostBrowserDescribe(connection);
}
