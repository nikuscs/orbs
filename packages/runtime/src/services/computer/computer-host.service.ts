import { computerActionHostAct } from './computer-action.host-act';
import { computerActionHostBrowser } from './computer-action.host-browser';
import { computerActionHostRemove } from './computer-action.host-remove';
import { computerActionHostShutdown } from './computer-action.host-shutdown';
import { computerActionHostSleep } from './computer-action.host-sleep';
import { computerActionHostStart } from './computer-action.host-start';
import { computerActionHostThumbnail } from './computer-action.host-thumbnail';
import { computerActionHostViewerTicket } from './computer-action.host-viewer-ticket';
import { computerHostCloseSession } from './computer-host.utils';
import { computerQueryHostEndpoint } from './computer-query.host-endpoint';
import { computerQueryHostList } from './computer-query.host-list';
import { computerQueryHostSavedThumbnail } from './computer-query.host-saved-thumbnail';
import { computerQueryHostScreenshot } from './computer-query.host-screenshot';
import { computerQueryHostState } from './computer-query.host-state';
import { computerQueryHostTree } from './computer-query.host-tree';
import { computerQueryHostWindows } from './computer-query.host-windows';
import { computerDriverSocket } from './computer.driver';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export function makeComputerHostService(deps: HostTypes.ComputerHostServiceDeps): ComputerTypes.ComputerHost {
  const runtime: HostTypes.ComputerHostRuntime = {
    ...deps,
    socket: computerDriverSocket(deps.dockerHost),
    sessions: new Map(),
    starting: new Map(),
    sdk: null,
  };

  return {
    actions: {
      start: (params) => computerActionHostStart(runtime, params),
      sleep: (params) => computerActionHostSleep(runtime, params),
      shutdown: (params) => computerActionHostShutdown(runtime, params),
      remove: (params) => computerActionHostRemove(runtime, params),
      act: (params) => computerActionHostAct(runtime, params),
      browser: (params) => computerActionHostBrowser(runtime, params),
      viewerTicket: (params) => computerActionHostViewerTicket(runtime, params),
      thumbnail: (params) => computerActionHostThumbnail(runtime, params),
    },
    queries: {
      list: () => computerQueryHostList(runtime),
      state: (params) => computerQueryHostState(runtime, params),
      screenshot: (params) => computerQueryHostScreenshot(runtime, params),
      windows: (params) => computerQueryHostWindows(runtime, params),
      tree: (params) => computerQueryHostTree(runtime, params),
      savedThumbnail: (params) => computerQueryHostSavedThumbnail(runtime, params),
      endpoint: (params) => computerQueryHostEndpoint(runtime, params),
    },
    close: async () => {
      await Promise.all([...runtime.sessions.keys()].map((botId) => computerHostCloseSession(runtime, botId)));
    },
  };
}
