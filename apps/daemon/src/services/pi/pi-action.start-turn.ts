import { Errors } from '@orbs/errors/universal';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { match } from 'ts-pattern';
import * as PiTypes from '#/types/pi.types';
import { SKILL } from '#services/skill/skill.constants';
import { skillResolveHome } from '#services/skill/skill.utils';
import { MCP_INTERNAL, STORAGE } from '@orbs/server/daemon';
import { PI } from './pi.constants';
import {
  piAgentDir,
  piBridgePath,
  piJsonParse,
  piLastAssistant,
  piReadSessionFile,
  piReadSessionStats,
  piRefreshCredentials,
  piRequest,
  piRun,
  piStop,
  piUsage,
  piWarmIdle,
  piWarmSession,
  piWrite,
} from './pi.utils';
import type { HarnessTurnParams, HarnessTurnResult } from '#/types/harness.types';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { McpServerConfig } from '@earendil-works/pi-coding-agent';
import type { UIMessageChunk } from 'ai';

export async function piActionStartTurn(deps: PiTypes.PiServiceDeps, params: HarnessTurnParams): Promise<HarnessTurnResult> {
  const readOnlyTools = [...PI.readTools, ...PI.ungatedTools, ...MCP_INTERNAL.readTools.map((name) => `mcp__mcp_internal__${name}`)];

  async function piFileStamp(path: string): Promise<string> {
    const modifiedAt = await stat(path).then((file) => file.mtimeMs, () => 0);

    return `${path}:${modifiedAt}`;
  }

  async function piResourceStamps(root: string, inherited: PiTypes.PiStampedFiles): Promise<string[]> {
    const skillFiles = inherited.skills ? await readdir(join(root, SKILL.dir), { recursive: true }) : [];

    const files = [
      ...(inherited.agentsFile ? [PI.agentsFile] : []),
      ...(inherited.mcp ? [PI.mcpFile] : []),
      ...skillFiles.map((file) => join(SKILL.dir, file)),
    ];

    return Promise.all(files.map((file) => piFileStamp(join(root, file))));
  }

  async function piFingerprint(input: HarnessTurnParams, home: string, shared: string): Promise<string> {
    const inherits = new Set(input.inherit);
    const ownFiles: PiTypes.PiStampedFiles = { agentsFile: true, skills: true, mcp: true };
    const homeStamps = await piResourceStamps(home, ownFiles);
    const promptStamps = await Promise.all(PI.botPromptFiles.map((file) => piFileStamp(join(home, file))));

    const sharedStamps = await piResourceStamps(shared, {
      agentsFile: inherits.has('agentsFile'),
      skills: inherits.has('skills'),
      mcp: inherits.has('mcp'),
    });

    const pluginStamps = inherits.has('plugins') ? [await piFileStamp(join(deps.userAgentDir, PI.settingsFile))] : [];

    const settings = [
      input.modelProvider,
      input.modelId,
      input.thinkingLevel,
      input.permission,
      input.directives,
      input.instructions,
      input.roomInstructions,
      input.inherit,
      input.mcpInternal,
    ];

    return JSON.stringify([...settings, homeStamps, promptStamps, sharedStamps, pluginStamps]);
  }

  async function piContextFiles(input: HarnessTurnParams, home: string, shared: string): Promise<PiTypes.PiContextFile[]> {
    const sharedAgentsFile = input.inherit.includes('agentsFile') ? [join(shared, PI.agentsFile)] : [];
    const paths = [...sharedAgentsFile, join(home, PI.agentsFile)];

    const contextFiles = await Promise.all(paths.map(async (path) => {
      const file = Bun.file(path);

      return (await file.exists()) ? [{ path, content: await file.text() }] : [];
    }));

    return contextFiles.flat();
  }

  async function piMcpFileServers(root: string): Promise<[string, McpServerConfig][]> {
    const mcpFile = Bun.file(join(root, PI.mcpFile));

    if (!await mcpFile.exists()) {
      return [];
    }

    const parsed = PiTypes.piMcpFile.safeParse(await mcpFile.json().catch(() => null));

    return parsed.success ? Object.entries(parsed.data.mcpServers) : [];
  }

  async function piMcpServers(input: HarnessTurnParams, home: string, shared: string): Promise<Record<string, McpServerConfig>> {
    const roots = input.inherit.includes('mcp') ? [shared, home] : [home];
    const fileServers = input.permission === 'read-only' ? [] : (await Promise.all(roots.map(piMcpFileServers))).flat();
    const externalServers = fileServers.filter(([name]) => name.replace(/-/g, '_') !== 'mcp_internal');
    const internalServer = input.mcpInternal ? [[MCP_INTERNAL.name, { ...input.mcpInternal, exposure: 'direct' as const }] as const] : [];

    return Object.fromEntries([...externalServers, ...internalServer]);
  }

  async function piArgs(serviceDeps: PiTypes.PiServiceDeps, input: HarnessTurnParams, home: string, shared: string): Promise<string[]> {
    const ownSkills = join(home, SKILL.dir);
    const skillDirs = input.inherit.includes('skills') ? [ownSkills, join(shared, SKILL.dir)] : [ownSkills];
    const asksApproval = input.permission === 'ask' || input.permission === 'auto';

    const bridgeConfig: PiTypes.PiBridgeConfig = {
      promptSections: {
        [PI.orbsSection]: input.directives,
        [PI.instructionsSection]: input.instructions,
        [PI.roomSection]: input.roomInstructions,
      },
      contextFiles: await piContextFiles(input, home, shared),
      mcpServers: await piMcpServers(input, home, shared),
      approvalGate: asksApproval ? { ungatedTools: readOnlyTools } : null,
      repeatedCallLimit: PI.repeatedCallLimit,
      commands: PI.commands,
      judgeTool: null,
    };

    const extensionArgs = input.inherit.includes('plugins') ? [] : ['--no-extensions', ...PI.builtinExtensions.flatMap((name) => ['-e', name])];
    const toolArgs = input.permission === 'read-only' ? ['--tools', readOnlyTools.join(',')] : [];
    const sessionArgs = input.resume ? ['--session', input.resume] : [];

    return [
      '--session-dir',
      join(home, PI.sessionsDir),
      ...sessionArgs,
      ...skillDirs.flatMap((dir) => ['--skill', dir]),
      ...extensionArgs,
      '-e',
      await piBridgePath(serviceDeps.tempFiles),
      PI.bridgeFlag,
      JSON.stringify(bridgeConfig),
      ...toolArgs,
    ];
  }

  function piAnswerDialog(serviceDeps: PiTypes.PiServiceDeps, key: string, piProcess: PiTypes.PiProcess, event: PiTypes.PiEvent): void {
    if (event.type !== 'extension_ui_request' || !PI.dialogMethods.some((method) => method === event.method)) {
      return;
    }

    const approvalRequest = PiTypes.piApprovalRequest.safeParse(piJsonParse(event.title ?? ''));
    const turn = [...serviceDeps.turns.values()].find((item) => item.key === key);

    if (event.method !== 'input' || !approvalRequest.success || !turn || turn.cancelled) {
      piWrite(piProcess, {
        type: 'extension_ui_response',
        id: event.id,
        cancelled: true,
      });

      return;
    }

    const approvalId = crypto.randomUUID();

    turn.approvals.set(approvalId, (answer) => {
      turn.approvals.delete(approvalId);
      piWrite(piProcess, {
        type: 'extension_ui_response',
        id: event.id,
        value: JSON.stringify(answer),
      });
    });

    turn.requestApproval({ approvalId, ...approvalRequest.data });
  }

  async function piSession(serviceDeps: PiTypes.PiServiceDeps, input: HarnessTurnParams, key: string): Promise<PiTypes.PiWarmSession> {
    const home = skillResolveHome(input.homeDir);
    const shared = skillResolveHome(serviceDeps.sharedHome);

    await Promise.all([
      mkdir(join(home, SKILL.dir), { recursive: true }),
      mkdir(join(shared, SKILL.dir), { recursive: true }),
    ]);

    return piWarmSession(serviceDeps, {
      key,
      fingerprint: await piFingerprint(input, home, shared),
      resume: input.resume,
      spawn: {
        args: await piArgs(serviceDeps, input, home, shared),
        agentDir: await piAgentDir(serviceDeps, { name: input.botId, botHome: home }),
      },
      model: input,
      onEvent: (piProcess, event) => piAnswerDialog(serviceDeps, key, piProcess, event),
    });
  }

  function piContentChunks(event: PiTypes.PiContentEvent, step: number): UIMessageChunk[] {
    const id = `${step}:${event.contentIndex}`;

    return match<PiTypes.PiContentEvent, UIMessageChunk[]>(event)
      .with({ type: 'text_start' }, () => [{ type: 'text-start', id }])
      .with({ type: 'text_delta' }, (delta) => [{ type: 'text-delta', id, delta: delta.delta }])
      .with({ type: 'text_end' }, () => [{ type: 'text-end', id }])
      .with({ type: 'thinking_start' }, () => [{ type: 'reasoning-start', id }])
      .with({ type: 'thinking_delta' }, (delta) => [{ type: 'reasoning-delta', id, delta: delta.delta }])
      .with({ type: 'thinking_end' }, () => [{ type: 'reasoning-end', id }])
      .exhaustive();
  }

  function piToolText(result: PiTypes.PiJson): string {
    const toolResult = PiTypes.piToolResult.safeParse(result);

    return toolResult.success ? toolResult.data.content.map((block) => block.text ?? '').join('\n') : JSON.stringify(result);
  }

  function piEventChunks(event: PiTypes.PiEvent, stream: PiTypes.PiStream): UIMessageChunk[] {
    const compactionPartId = 'compaction';
    const retryPartId = 'retry';

    return match<PiTypes.PiEvent, UIMessageChunk[]>(event)
      .with({ type: 'turn_start' }, () => {
        stream.step += 1;

        return [{ type: 'start-step' }];
      })
      .with({ type: 'turn_end' }, () => [{ type: 'finish-step' }])
      .with({ type: 'message_update' }, (update) => piContentChunks(update.assistantMessageEvent, stream.step))
      .with({ type: 'tool_execution_start' }, (start) => [{
        type: 'tool-input-available',
        toolCallId: start.toolCallId,
        toolName: start.toolName,
        input: start.args,
        dynamic: true,
      }])
      .with({ type: 'tool_execution_end', isError: true }, (end) => [{ type: 'tool-output-error', toolCallId: end.toolCallId, errorText: piToolText(end.result), dynamic: true }])
      .with({ type: 'tool_execution_end' }, (end) => [{ type: 'tool-output-available', toolCallId: end.toolCallId, output: piToolText(end.result), dynamic: true }])
      .with({ type: 'compaction_start' }, () => [{ type: 'data-compaction', id: compactionPartId, data: { status: 'running' } }])
      .with({ type: 'compaction_end' }, () => [{ type: 'data-compaction', id: compactionPartId, data: { status: 'done' } }])
      .with({ type: 'auto_retry_start' }, () => [{ type: 'data-retry', id: retryPartId, data: { status: 'running' }, transient: true }])
      .with({ type: 'auto_retry_end' }, () => [{ type: 'data-retry', id: retryPartId, data: { status: 'done' }, transient: true }])
      .otherwise(() => []);
  }

  function piMarkSteerDelivered(event: PiTypes.PiEvent, turn: PiTypes.PiTurn): void {
    if (event.type !== 'message_start' || event.message.role !== 'user') {
      return;
    }

    const userText = PiTypes.piUserText.safeParse(event.message.content);
    const steerIndex = userText.success ? turn.steers.findIndex((steer) => steer.text === userText.data) : -1;

    if (steerIndex !== -1) {
      turn.steeredMessageIds.push(...turn.steers.splice(steerIndex, 1).map((steer) => steer.messageId));
    }
  }

  async function piImages(acceptsImages: boolean, input: HarnessTurnParams): Promise<ImageContent[]> {
    if (!acceptsImages) {
      return [];
    }

    const imageFiles = input.files.filter((file) => file.mediaType.startsWith('image/')).slice(0, STORAGE.turnImages);

    const images = await Promise.allSettled(imageFiles.map(async (file) => ({
      type: 'image' as const,
      mimeType: file.mediaType,
      data: Buffer.from(await Bun.file(skillResolveHome(file.path)).arrayBuffer()).toString('base64'),
    })));

    return images.flatMap((image) => (image.status === 'fulfilled' ? [image.value] : []));
  }

  async function piPromptText(input: HarnessTurnParams, turn: PiTypes.PiTurn, piProcess: PiTypes.PiProcess): Promise<string> {
    const { commands } = PiTypes.piCommandList.parse(await piRequest(piProcess, { type: 'get_commands' }));

    if (!commands.some((command) => command.source === 'extension' && command.name === PI.commands.memory)) {
      throw new Errors.INTERNAL_ERROR({ internal: 'Orbs Pi bridge did not load' });
    }

    const text = [input.prompt, ...turn.pending].join('\n');
    const loadedSkill = input.skills.find((name) => commands.some((command) => command.source === 'skill' && command.name === `skill:${name}`));

    return loadedSkill ? `/skill:${loadedSkill} ${text}` : text;
  }

  async function piSendMemory(input: HarnessTurnParams, piProcess: PiTypes.PiProcess): Promise<void> {
    const memorySections = {
      memory_global: input.memory.global ?? '',
      memory_bot: input.memory.bot ?? '',
      memory_room: input.memory.room ?? '',
    };

    await piRequest(piProcess, { type: 'prompt', message: `/${PI.commands.memory} ${JSON.stringify(memorySections)}` });
  }

  function piTurnEnd(turn: PiTypes.PiTurn, agentEnd: PiTypes.PiAgentEnd | null): Pick<HarnessTurnResult, 'status' | 'failure'> {
    if (turn.cancelled) {
      return { status: 'cancelled', failure: null };
    }

    const lastAssistant = piLastAssistant(agentEnd);

    if (lastAssistant?.stopReason !== 'error') {
      return { status: 'completed', failure: null };
    }

    return { status: 'failed', failure: { code: 'model_error', detail: lastAssistant.errorMessage ?? null } };
  }

  async function piPrompt(
    serviceDeps: PiTypes.PiServiceDeps,
    input: HarnessTurnParams,
    key: string,
    turn: PiTypes.PiTurn,
    session: PiTypes.PiWarmSession,
  ): Promise<HarnessTurnResult> {
    if (turn.cancelled) {
      return { status: 'cancelled', failure: null, resume: input.resume, steeredMessageIds: turn.steeredMessageIds, usage: null };
    }

    const { piProcess } = session;
    const stream = { step: 0 };

    const piTurnListener = (event: PiTypes.PiEvent) => {
      piMarkSteerDelivered(event, turn);

      for (const chunk of piEventChunks(event, stream)) {
        input.emit(chunk);
      }
    };

    piProcess.eventListeners.add(piTurnListener);

    try {
      const promptText = await piPromptText(input, turn, piProcess);
      await piSendMemory(input, piProcess);
      await piRefreshCredentials(serviceDeps, input.modelProvider);

      const before = await piReadSessionStats(piProcess);
      const state = PiTypes.piState.parse(await piRequest(piProcess, { type: 'get_state' }));
      const images = await piImages(state.model?.input.includes('image') ?? false, input);

      const agentEnd = await piRun(piProcess, promptText, images);

      const after = await piReadSessionStats(piProcess);
      session.sessionFile = await piReadSessionFile(piProcess);

      return {
        ...piTurnEnd(turn, agentEnd),
        resume: session.sessionFile ?? input.resume,
        steeredMessageIds: turn.steeredMessageIds,
        usage: piUsage(before, after),
      };
    } catch (error) {
      serviceDeps.sessions.delete(key);
      piStop(piProcess);
      throw error;
    } finally {
      piProcess.eventListeners.delete(piTurnListener);
      await Promise.allSettled([piRequest(piProcess, { type: 'clear_queue' })]);
    }
  }

  const key = `${params.roomId}:${params.botId}`;

  const turn: PiTypes.PiTurn = {
    key,
    requestApproval: params.requestApproval,
    approvals: new Map(),
    piProcess: undefined,
    cancelled: false,
    pending: [],
    steers: [],
    steeredMessageIds: [],
  };

  deps.turns.set(params.runId, turn);

  try {
    const session = await piSession(deps, params, key);
    turn.piProcess = session.piProcess;

    return await piPrompt(deps, params, key, turn, session);
  } finally {
    deps.turns.delete(params.runId);
    piWarmIdle(deps, key);
  }
}
