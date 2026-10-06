import { memoryExtractionResult } from '@orbs/server/daemon';
import { PI } from './pi.constants';
import { piAgentDir, piJsonParse, piLastAssistant, piRefreshCredentials, piRun, piSelectModel, piSpawn, piStop } from './pi.utils';
import type { PiAssistantMessage, PiServiceDeps } from '#/types/pi.types';
import type { DaemonMemoryRequest, DaemonMemoryResult, DaemonUsage } from '@orbs/server/daemon';

export async function piActionExtract(deps: PiServiceDeps, params: DaemonMemoryRequest): Promise<DaemonMemoryResult> {
  function piAnswerUsage(answer: PiAssistantMessage): DaemonUsage {
    return {
      input: answer.usage.input,
      output: answer.usage.output,
      cacheRead: answer.usage.cacheRead,
      cacheWrite: answer.usage.cacheWrite,
      cost: answer.usage.cost.total,
    };
  }

  function piAnswerJson(answer: PiAssistantMessage): string {
    const text = answer.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join('');

    return text
      .trim()
      .replace(/^```(?:json)?\s*/u, '')
      .replace(/\s*```$/u, '');
  }

  const base = { type: 'memory.extracted' as const, requestId: params.requestId, roomId: params.roomId, generation: params.generation };

  const piProcess = piSpawn(deps, {
    args: ['--no-session', '--no-extensions', '--no-tools', '--system-prompt', params.instructions],
    agentDir: await piAgentDir(deps, { name: PI.daemonAgentDir, botHome: null }),
  });

  const deadline = setTimeout(() => piStop(piProcess), PI.extractTimeoutMs);

  try {
    const selected = await piSelectModel(piProcess, params);

    if (!selected.success) {
      return { ...base, result: null, error: 'unavailable', usage: null };
    }

    await piRefreshCredentials(deps, params.modelProvider);
    const answer = piLastAssistant(await piRun(piProcess, params.prompt));

    if (!answer) {
      return { ...base, result: null, error: 'failed', usage: null };
    }

    const usage = piAnswerUsage(answer);

    if (answer.stopReason === 'length') {
      return { ...base, result: null, error: 'truncated', usage };
    }

    if (answer.stopReason === 'error' || answer.stopReason === 'aborted') {
      return { ...base, result: null, error: 'failed', usage };
    }

    const result = memoryExtractionResult.safeParse(piJsonParse(piAnswerJson(answer)));

    return { ...base, result: result.success ? result.data : null, error: result.success ? null : 'invalid_output', usage };
  } finally {
    clearTimeout(deadline);
    piStop(piProcess);
  }
}
