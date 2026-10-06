import { join } from 'node:path';
import * as PiTypes from '#/types/pi.types';
import { skillResolveHome } from '#services/skill/skill.utils';
import { PI } from './pi.constants';
import {
  piAgentDir,
  piBridgePath,
  piReadSessionFile,
  piReadSessionStats,
  piRefreshCredentials,
  piRun,
  piStop,
  piUsage,
  piWarmIdle,
  piWarmSession,
} from './pi.utils';
import type { HarnessJudgeParams, HarnessJudgeResult } from '#/types/harness.types';

export function piActionJudge(deps: PiTypes.PiServiceDeps, params: HarnessJudgeParams): Promise<HarnessJudgeResult> {
  async function piJudgeArgs(serviceDeps: PiTypes.PiServiceDeps, input: HarnessJudgeParams): Promise<string[]> {
    const judgeHome = join(skillResolveHome(serviceDeps.sharedHome), PI.judgeDir);

    const bridgeConfig: PiTypes.PiBridgeConfig = {
      promptSections: {},
      contextFiles: [],
      mcpServers: {},
      approvalGate: null,
      repeatedCallLimit: PI.repeatedCallLimit,
      commands: PI.commands,
      judgeTool: { name: PI.judgeTool, handles: input.handles },
    };

    const sessionArgs = input.resume ? ['--session', input.resume] : [];

    return [
      '--system-prompt',
      input.instructions,
      '--no-extensions',
      '-e',
      await piBridgePath(serviceDeps.tempFiles),
      PI.bridgeFlag,
      JSON.stringify(bridgeConfig),
      '--tools',
      PI.judgeTool,
      '--session-dir',
      join(judgeHome, PI.sessionsDir),
      ...sessionArgs,
    ];
  }

  async function piJudgeSession(serviceDeps: PiTypes.PiServiceDeps, input: HarnessJudgeParams, key: string): Promise<PiTypes.PiWarmSession> {
    return piWarmSession(serviceDeps, {
      key,
      fingerprint: JSON.stringify([input.modelProvider, input.modelId, input.thinkingLevel, input.instructions, input.handles]),
      resume: input.resume,
      spawn: {
        args: await piJudgeArgs(serviceDeps, input),
        agentDir: await piAgentDir(serviceDeps, { name: PI.daemonAgentDir, botHome: null }),
      },
      model: input,
      onEvent: () => undefined,
    });
  }

  async function piJudgeTurn(serviceDeps: PiTypes.PiServiceDeps, input: HarnessJudgeParams, key: string): Promise<HarnessJudgeResult> {
    const session = await piJudgeSession(serviceDeps, input, key);
    const { piProcess } = session;
    const routedHandles: string[][] = [];

    const piRouteListener = (event: PiTypes.PiEvent) => {
      if (event.type !== 'tool_execution_end' || event.toolName !== PI.judgeTool || event.isError) {
        return;
      }

      const judgeResult = PiTypes.piJudgeResult.safeParse(event.result);

      if (judgeResult.success) {
        routedHandles.push(judgeResult.data.details.handles);
      }
    };

    piProcess.eventListeners.add(piRouteListener);

    try {
      await piRefreshCredentials(serviceDeps, input.modelProvider);
      const before = await piReadSessionStats(piProcess);
      await piRun(piProcess, input.prompt);
      const after = await piReadSessionStats(piProcess);
      session.sessionFile = await piReadSessionFile(piProcess);

      return { handles: routedHandles.at(-1) ?? null, resume: session.sessionFile ?? input.resume, usage: piUsage(before, after) };
    } catch (error) {
      serviceDeps.sessions.delete(key);
      piStop(piProcess);
      throw error;
    } finally {
      piProcess.eventListeners.delete(piRouteListener);
    }
  }

  const key = `${params.roomId}:${PI.judgeDir}`;

  const turn = (deps.judging.get(key) ?? Promise.resolve())
    .then(() => piJudgeTurn(deps, params, key))
    .finally(() => piWarmIdle(deps, key));

  deps.judging.set(
    key,
    turn.then(
      () => undefined,
      () => undefined,
    ),
  );

  return turn;
}
