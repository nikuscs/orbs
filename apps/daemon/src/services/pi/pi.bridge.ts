import { getSupportedThinkingLevels, StringEnum } from '@earendil-works/pi-ai';
import { Type } from 'typebox';
import { Value } from 'typebox/value';
import type { PiBridgeConfig, PiBridgeState, PiJudgeTool } from '#/types/pi.types';
import type * as PiCodingAgent from '@earendil-works/pi-coding-agent';
import type { DaemonProvider } from '@orbs/server/daemon';

export default function piBridge(pi: PiCodingAgent.ExtensionAPI): void {
  const piBridgeSections = Type.Record(Type.String(), Type.String());

  const piBridgeConfig = Type.Object({
    promptSections: piBridgeSections,
    contextFiles: Type.Array(Type.Object({ path: Type.String(), content: Type.String() })),
    mcpServers: Type.Record(Type.String(), Type.Unsafe<PiCodingAgent.McpServerConfig>(Type.Object({}))),
    approvalGate: Type.Union([Type.Object({ ungatedTools: Type.Array(Type.String()) }), Type.Null()]),
    repeatedCallLimit: Type.Number(),
    commands: Type.Object({ memory: Type.String(), catalogue: Type.String() }),
    judgeTool: Type.Union([Type.Object({ name: Type.String(), handles: Type.Array(Type.String()) }), Type.Null()]),
  });

  const piBridgeApprovalAnswer = Type.Object({ approved: Type.Boolean(), reason: Type.String() });

  const state: PiBridgeState = { config: null, memorySections: {}, lastToolCall: '', sameToolCalls: 0 };

  function piBridgeCatalogue(ctx: PiCodingAgent.ExtensionContext): DaemonProvider[] {
    const models = ctx.modelRegistry.getAvailable();
    const providerIds = [...new Set(models.map((model) => model.provider))];

    return providerIds.map((providerId) => ({
      id: providerId,
      name: ctx.modelRegistry.getProviderDisplayName(providerId),
      models: models.filter((model) => model.provider === providerId).map((model) => ({
        id: model.id,
        name: model.name,
        thinkingLevels: getSupportedThinkingLevels(model),
        images: model.input.includes('image'),
      })),
    }));
  }

  function piBridgeRegisterJudgeTool(judgeTool: PiJudgeTool): void {
    pi.registerTool({
      name: judgeTool.name,
      label: 'Route',
      description: 'Name the members who answer the message to route. An empty list means nobody answers.',
      parameters: Type.Object({
        handles: Type.Array(StringEnum(judgeTool.handles), { description: 'Handles, without @, of the members who answer.' }),
      }),
      execute: (_toolCallId, input) =>
        Promise.resolve({
          content: [{ type: 'text', text: 'Routed.' }],
          details: { handles: input.handles },
          terminate: true,
        }),
    });
  }

  function piBridgeRepeatBlock(toolName: string, toolCall: string, repeatedCallLimit: number): PiCodingAgent.ToolCallEventResult | undefined {
    state.sameToolCalls = toolCall === state.lastToolCall ? state.sameToolCalls + 1 : 1;
    state.lastToolCall = toolCall;

    if (state.sameToolCalls < repeatedCallLimit) {
      return undefined;
    }

    return {
      block: true,
      reason: `You already made this exact ${toolName} call ${state.sameToolCalls - 1} times in a row, so it is blocked. Use the earlier result, or try something different.`,
    };
  }

  pi.registerFlag('orbs', { type: 'string', description: 'Orbs turn configuration as JSON' });

  pi.on('session_start', () => {
    const config: PiBridgeConfig = Value.Parse(piBridgeConfig, JSON.parse(String(pi.getFlag('orbs'))));
    state.config = config;

    for (const [name, server] of Object.entries(config.mcpServers)) {
      pi.registerMcpServer(name, server);
    }

    pi.registerCommand(config.commands.memory, {
      description: 'Set the Orbs memory sections for the next turn',
      handler: (args) => {
        state.memorySections = Value.Parse(piBridgeSections, JSON.parse(args));

        return Promise.resolve();
      },
    });

    pi.registerCommand(config.commands.catalogue, {
      description: 'Report the configured providers and models to Orbs',
      handler: (_args, ctx) => {
        ctx.ui.notify(JSON.stringify(piBridgeCatalogue(ctx)));

        return Promise.resolve();
      },
    });

    if (config.judgeTool) {
      piBridgeRegisterJudgeTool(config.judgeTool);
    }
  });

  pi.on('before_agent_start', (event) => {
    if (!state.config) {
      return;
    }

    event.systemPromptOptions.sections = { ...event.systemPromptOptions.sections, ...state.config.promptSections, ...state.memorySections };
    event.systemPromptOptions.contextFiles = state.config.contextFiles;
  });

  pi.on('agent_start', () => {
    state.lastToolCall = '';
    state.sameToolCalls = 0;
  });

  pi.on('tool_call', async (event, ctx) => {
    if (!state.config) {
      return undefined;
    }

    const toolCall = `${event.toolName} ${JSON.stringify(event.input)}`;
    const repeatBlock = event.parentToolCallId ? undefined : piBridgeRepeatBlock(event.toolName, toolCall, state.config.repeatedCallLimit);

    if (repeatBlock) {
      return repeatBlock;
    }

    const { approvalGate } = state.config;

    if (!approvalGate || approvalGate.ungatedTools.includes(event.toolName)) {
      return undefined;
    }

    const approvalRequest = {
      toolCallId: event.parentToolCallId ?? event.toolCallId,
      toolName: event.toolName,
      input: event.input,
    };

    const reply = await ctx.ui.input(JSON.stringify(approvalRequest));
    const answer = reply === undefined ? null : Value.Parse(piBridgeApprovalAnswer, JSON.parse(reply));

    return answer?.approved ? undefined : { block: true, reason: answer?.reason ?? '' };
  });
}
