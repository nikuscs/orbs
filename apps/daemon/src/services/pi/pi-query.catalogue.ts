import { Errors } from '@orbs/errors/universal';
import * as PiTypes from '#/types/pi.types';
import { daemonHarness } from '@orbs/server/daemon';
import { PI } from './pi.constants';
import { piAgentDir, piBridgePath, piJsonParse, piRequest, piSpawn, piStop } from './pi.utils';
import type { DaemonProvider } from '@orbs/server/daemon';

export async function piQueryCatalogue(deps: PiTypes.PiServiceDeps): Promise<DaemonProvider[]> {
  const bridgeConfig: PiTypes.PiBridgeConfig = {
    promptSections: {},
    contextFiles: [],
    mcpServers: {},
    approvalGate: null,
    repeatedCallLimit: PI.repeatedCallLimit,
    commands: PI.commands,
    judgeTool: null,
  };

  const piProcess = piSpawn(deps, {
    args: ['--no-session', '--no-extensions', '-e', await piBridgePath(deps.tempFiles), PI.bridgeFlag, JSON.stringify(bridgeConfig)],
    agentDir: await piAgentDir(deps, { name: PI.daemonAgentDir, botHome: null }),
  });

  const deadline = setTimeout(() => piStop(piProcess), PI.catalogueTimeoutMs);
  const notifications: string[] = [];

  piProcess.eventListeners.add((event) => {
    if (event.type === 'extension_ui_request' && event.method === 'notify') {
      notifications.push(event.message ?? '');
    }
  });

  try {
    const { commands } = PiTypes.piCommandList.parse(await piRequest(piProcess, { type: 'get_commands' }));

    if (!commands.some((command) => command.source === 'extension' && command.name === PI.commands.catalogue)) {
      throw new Errors.INTERNAL_ERROR({ internal: 'Orbs Pi bridge did not load' });
    }

    await piRequest(piProcess, { type: 'prompt', message: `/${PI.commands.catalogue}` });
    const providers = daemonHarness.shape.providers.parse(piJsonParse(notifications.at(-1) ?? ''));

    return providers.filter((provider) => !PI.hiddenProviders.some((hidden) => hidden === provider.id));
  } finally {
    clearTimeout(deadline);
    piStop(piProcess);
  }
}
