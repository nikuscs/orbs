import { Errors } from '@orbs/errors/universal';
import { log } from '@orbs/logger/daemon';
import { lstat, mkdir, readdir, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import * as PiTypes from '#/types/pi.types';
import piBridgeAsset from './pi.bridge' with { type: 'file' };
import { PI } from './pi.constants';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { RpcCommand, RpcExtensionUIResponse } from '@earendil-works/pi-coding-agent';
import type { DaemonRunFailure, DaemonUsage } from '@orbs/server/daemon';

export function piJsonParse(text: string): PiTypes.PiJson {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function piBridgePath(tempFiles: PiTypes.PiTempFiles): Promise<string> {
  async function piBridgeWrite(): Promise<string> {
    const bridgePath = join(tempFiles.dir, PI.bridgeFile);
    await mkdir(tempFiles.dir, { recursive: true });
    await Bun.write(bridgePath, Bun.file(String(piBridgeAsset)));

    return bridgePath;
  }

  tempFiles.bridgeWritten ??= piBridgeWrite();

  return tempFiles.bridgeWritten;
}

async function piPathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);

    return true;
  } catch {
    return false;
  }
}

async function piLink(target: string, linkPath: string): Promise<void> {
  try {
    await symlink(target, linkPath);
  } catch (error) {
    if (!await piPathExists(linkPath)) {
      throw error;
    }
  }
}

async function piPluginSettings(userAgentDir: string): Promise<PiTypes.PiPluginSettings> {
  const settingsFile = Bun.file(join(userAgentDir, PI.settingsFile));
  const userSettings = PiTypes.piUserSettings.safeParse(await settingsFile.json().catch(() => null));
  const userExtensions = userSettings.success ? userSettings.data.extensions ?? [] : [];

  const pluginExtensions = userExtensions.filter((entry) => !entry.replace(/^[+!-]/u, '').startsWith(PI.builtinExtensionPrefix));

  return {
    packages: userSettings.success ? userSettings.data.packages : undefined,
    extensions: [...pluginExtensions, ...PI.excludedBuiltinExtensions],
  };
}

export async function piAgentDir(deps: PiTypes.PiServiceDeps, params: PiTypes.PiAgentDirParams): Promise<string> {
  const agentDir = join(deps.tempFiles.dir, params.name);
  await mkdir(agentDir, { recursive: true });

  const userEntries = await readdir(deps.userAgentDir).catch(() => []);
  const sharedEntries = userEntries.filter((entry) => !PI.isolatedAgentEntries.some((isolated) => isolated === entry));
  await Promise.all(sharedEntries.map((entry) => piLink(join(deps.userAgentDir, entry), join(agentDir, entry))));

  const { botHome } = params;

  if (botHome) {
    await Promise.all(PI.botPromptFiles.map(async (file) => {
      const linkPath = join(agentDir, file);
      await rm(linkPath, { force: true });
      await piLink(join(botHome, file), linkPath);
    }));
  }

  await Bun.write(join(agentDir, PI.settingsFile), JSON.stringify(await piPluginSettings(deps.userAgentDir)));

  return agentDir;
}

export async function piRefreshCredentials(deps: PiTypes.PiSpawnDeps, provider: string): Promise<void> {
  const refresh = Bun.spawn([PI.command, 'auth', 'print-bearer-token', '--provider', provider, '--min-expiry', PI.credentialMinExpiry], {
    cwd: deps.workdir,
    env: deps.processEnv,
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
  });

  await refresh.exited;
}

function piLine(piProcess: PiTypes.PiProcess, line: string): void {
  const record = PiTypes.piOutputRecord.safeParse(piJsonParse(line));

  if (!record.success) {
    return;
  }

  if (record.data.type !== 'response') {
    for (const listener of piProcess.eventListeners) {
      listener(record.data);
    }

    return;
  }

  const requestId = record.data.id ?? '';
  const pending = piProcess.pendingResponses.get(requestId);
  piProcess.pendingResponses.delete(requestId);
  pending?.resolve(record.data);
}

async function piReadStdout(piProcess: PiTypes.PiProcess): Promise<void> {
  const decoder = new TextDecoder();
  const unfinished = { line: '' };

  for await (const bytes of piProcess.subprocess.stdout) {
    const lines = (unfinished.line + decoder.decode(bytes, { stream: true })).split('\n');
    unfinished.line = lines.pop() ?? '';

    for (const line of lines) {
      piLine(piProcess, line.replace(/\r$/u, ''));
    }
  }
}

async function piReadStderrTail(piProcess: PiTypes.PiProcess): Promise<void> {
  const decoder = new TextDecoder();

  for await (const bytes of piProcess.subprocess.stderr) {
    piProcess.stderrTail = (piProcess.stderrTail + decoder.decode(bytes, { stream: true })).slice(-PI.stderrTailChars);
  }
}

function piExitError(piProcess: PiTypes.PiProcess, exitCode: number): Error {
  const { signalCode } = piProcess.subprocess;
  const internal = signalCode ? `pi exited with signal ${signalCode}` : `pi exited with code ${exitCode}`;

  if (piProcess.stoppedByDaemon) {
    return new Errors.INTERNAL_ERROR({ internal });
  }

  const crash: DaemonRunFailure = { code: 'pi_crashed', detail: [internal, Bun.stripANSI(piProcess.stderrTail).trim()].join('\n').trim() };

  return new Errors.INTERNAL_ERROR({ internal, cause: crash });
}

function piWatchExit(piProcess: PiTypes.PiProcess): void {
  void piProcess.subprocess.exited.then((exitCode) => {
    const exitError = piExitError(piProcess, exitCode);

    for (const pending of piProcess.pendingResponses.values()) {
      pending.reject(exitError);
    }

    piProcess.pendingResponses.clear();

    if (!piProcess.stoppedByDaemon) {
      log.warn({
        tag: 'daemon',
        message: 'pi exited',
        code: exitCode,
        signal: piProcess.subprocess.signalCode,
        stderr: piProcess.stderrTail,
      });
    }
  });
}

export function piSpawn(deps: PiTypes.PiSpawnDeps, params: PiTypes.PiSpawnParams): PiTypes.PiProcess {
  const subprocess = Bun.spawn([PI.command, ...PI.baseArgs, ...params.args], {
    cwd: deps.workdir,
    env: { ...deps.processEnv, [PI.agentDirEnv]: params.agentDir },
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const piProcess: PiTypes.PiProcess = {
    subprocess,
    pendingResponses: new Map(),
    eventListeners: new Set(),
    stoppedByDaemon: false,
    stderrTail: '',
  };

  void piReadStdout(piProcess).catch(() => undefined);
  void piReadStderrTail(piProcess).catch(() => undefined);
  piWatchExit(piProcess);

  return piProcess;
}

function piRunning(piProcess: PiTypes.PiProcess): boolean {
  return piProcess.subprocess.exitCode === null && piProcess.subprocess.signalCode === null && !piProcess.stoppedByDaemon;
}

export function piStop(piProcess: PiTypes.PiProcess): void {
  piProcess.stoppedByDaemon = true;
  piProcess.subprocess.kill();
}

export function piWrite(piProcess: PiTypes.PiProcess, record: RpcCommand | RpcExtensionUIResponse): void {
  if (!piRunning(piProcess)) {
    throw new Errors.INTERNAL_ERROR({ internal: 'pi is not running' });
  }

  const written = Promise.all([
    piProcess.subprocess.stdin.write(`${JSON.stringify(record)}\n`),
    piProcess.subprocess.stdin.flush(),
  ]);

  void written.catch(() => undefined);
}

async function piSend(piProcess: PiTypes.PiProcess, command: RpcCommand): Promise<PiTypes.PiResponse> {
  const requestId = crypto.randomUUID();
  piWrite(piProcess, { ...command, id: requestId });

  return new Promise((resolve, reject) => {
    piProcess.pendingResponses.set(requestId, { resolve, reject });
  });
}

export async function piRequest(piProcess: PiTypes.PiProcess, command: RpcCommand): Promise<PiTypes.PiJson> {
  const response = await piSend(piProcess, command);

  if (!response.success) {
    throw new Errors.INTERNAL_ERROR({ internal: `pi ${response.command}: ${response.error ?? 'failed'}` });
  }

  return response.data ?? null;
}

export async function piReadSessionStats(piProcess: PiTypes.PiProcess): Promise<PiTypes.PiSessionStats> {
  return PiTypes.piSessionStats.parse(await piRequest(piProcess, { type: 'get_session_stats' }));
}

export async function piReadSessionFile(piProcess: PiTypes.PiProcess): Promise<string | null> {
  const state = PiTypes.piState.parse(await piRequest(piProcess, { type: 'get_state' }));

  return state.sessionFile ?? null;
}

export async function piSelectModel(piProcess: PiTypes.PiProcess, model: PiTypes.PiModelParams): Promise<PiTypes.PiResponse> {
  const selected = await piSend(piProcess, {
    type: 'set_model',
    provider: model.modelProvider,
    modelId: model.modelId,
  });

  if (selected.success) {
    await piRequest(piProcess, { type: 'set_thinking_level', level: model.thinkingLevel });
  }

  return selected;
}

export async function piWarmSession(deps: PiTypes.PiServiceDeps, params: PiTypes.PiWarmSessionParams): Promise<PiTypes.PiWarmSession> {
  const warm = deps.sessions.get(params.key);
  clearTimeout(warm?.idle);

  if (warm && piRunning(warm.piProcess) && warm.fingerprint === params.fingerprint && warm.sessionFile === params.resume) {
    return warm;
  }

  deps.sessions.delete(params.key);

  if (warm) {
    piStop(warm.piProcess);
  }

  const piProcess = piSpawn(deps, params.spawn);
  piProcess.eventListeners.add((event) => params.onEvent(piProcess, event));

  try {
    const selected = await piSelectModel(piProcess, params.model);

    if (!selected.success) {
      const unavailable: DaemonRunFailure = { code: 'model_unavailable', detail: selected.error ?? null };
      throw new Errors.NOT_FOUND({
        resource: 'model',
        resourceId: `${params.model.modelProvider}/${params.model.modelId}`,
        cause: unavailable,
      });
    }

    const session = {
      piProcess,
      fingerprint: params.fingerprint,
      sessionFile: await piReadSessionFile(piProcess),
      idle: undefined,
    };

    deps.sessions.set(params.key, session);

    return session;
  } catch (error) {
    piStop(piProcess);
    throw error;
  }
}

export function piWarmIdle(deps: PiTypes.PiServiceDeps, key: string): void {
  const warm = deps.sessions.get(key);

  if (!warm) {
    return;
  }

  warm.idle = setTimeout(() => {
    deps.sessions.delete(key);
    piStop(warm.piProcess);
  }, PI.sessionIdleMs);
}

export async function piRun(piProcess: PiTypes.PiProcess, message: string, images: ImageContent[] = []): Promise<PiTypes.PiAgentEnd | null> {
  const settled = Promise.withResolvers<PiTypes.PiAgentEnd | null>();
  const agentEnds: PiTypes.PiAgentEnd[] = [];

  const piRunListener = (event: PiTypes.PiEvent) => {
    if (event.type === 'agent_end') {
      agentEnds.push(event);
    }

    if (event.type === 'agent_settled') {
      settled.resolve(agentEnds.at(-1) ?? null);
    }
  };

  piProcess.eventListeners.add(piRunListener);

  try {
    const accepted = PiTypes.piPromptAccepted.parse(await piRequest(piProcess, {
      type: 'prompt',
      message,
      images,
    }));

    if (accepted.disposition === 'handled') {
      return null;
    }

    const exited = piProcess.subprocess.exited.then((exitCode) => {
      throw piExitError(piProcess, exitCode);
    });

    return await Promise.race([settled.promise, exited]);
  } finally {
    piProcess.eventListeners.delete(piRunListener);
  }
}

export function piLastAssistant(agentEnd: PiTypes.PiAgentEnd | null): PiTypes.PiAssistantMessage | null {
  const lastAssistant = agentEnd?.messages.findLast((message) => message.role === 'assistant');
  const parsed = PiTypes.piAssistantMessage.safeParse(lastAssistant);

  return parsed.success ? parsed.data : null;
}

export function piUsage(before: PiTypes.PiSessionStats, after: PiTypes.PiSessionStats): DaemonUsage {
  return {
    input: after.tokens.input - before.tokens.input,
    output: after.tokens.output - before.tokens.output,
    cacheRead: after.tokens.cacheRead - before.tokens.cacheRead,
    cacheWrite: after.tokens.cacheWrite - before.tokens.cacheWrite,
    cost: after.cost - before.cost,
  };
}
