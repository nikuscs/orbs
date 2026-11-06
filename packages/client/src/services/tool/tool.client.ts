import { GIF, gifToolDetails, toolCallArtifact, toolCallSubagent, toolCallSubagentDetails } from '@repo/contracts/universal';
import { toolEvent, toolEventsAppend } from '../tool-event/tool-event.utils';
import { TOOL_ARTIFACT_NAMES, TOOL_QUESTIONS, TOOL_SUBAGENT } from './tool.constants';
import type * as ToolTypes from '../../types/tool.types';

export function toolBlocks({ parts, hideVerbose = false }: ToolTypes.ToolBlocksParams): ToolTypes.ToolBlock[] {
  const all = parts.reduce<ToolTypes.ToolBlock[]>((blocks, part, index) => {
    const last = blocks.at(-1);

    if (part.type === 'text') {
      return last?.kind === 'text' ? [...blocks.slice(0, -1), { ...last, parts: [...last.parts, part] }] : [...blocks, { kind: 'text', index, parts: [part] }];
    }

    if (part.type === 'reasoning') {
      return last?.kind === 'reasoning' ? [...blocks.slice(0, -1), { ...last, parts: [...last.parts, part] }] : [...blocks, { kind: 'reasoning', index, parts: [part] }];
    }

    if (part.type === 'data-failure') {
      return [...(last?.kind === 'failure' ? blocks.slice(0, -1) : blocks), { kind: 'failure', index, text: part.data.text }];
    }

    if (part.type !== 'dynamic-tool') {
      return blocks;
    }

    const artifact = TOOL_ARTIFACT_NAMES.has(part.toolName) && part.state === 'output-available' ? toolCallArtifact.safeParse(part.output).data : undefined;

    if (artifact) {
      return [...blocks, { kind: 'artifact', index, artifact }];
    }

    const gif = part.toolName === GIF.toolName && part.state === 'output-available' ? gifToolDetails.safeParse(part.toolMetadata?.details).data : undefined;

    if (gif) {
      return [...blocks, { kind: 'gif', index, gif }];
    }

    if (part.toolName === GIF.toolName && !part.state.startsWith('output-')) {
      return blocks;
    }

    const subagentInput = part.toolName === TOOL_SUBAGENT ? toolCallSubagent.safeParse(part.input).data : undefined;
    const subagentDetails = toolCallSubagentDetails.safeParse(part.toolMetadata?.details).data;
    const subagent = subagentInput ? { ...subagentInput, conversationId: subagentDetails?.conversationId } : undefined;

    if (subagent) {
      return [...blocks, { kind: 'subagent', index, part, subagent }];
    }

    const event = toolEvent(part);

    if (event) {
      return last?.kind === 'events' ? [...blocks.slice(0, -1), { ...last, events: toolEventsAppend(last.events, event) }] : [...blocks, { kind: 'events', index, events: [event] }];
    }

    if (TOOL_QUESTIONS.has(part.toolName) && !part.state.startsWith('output-')) {
      return blocks;
    }

    return last?.kind === 'tools' ? [...blocks.slice(0, -1), { ...last, parts: [...last.parts, part] }] : [...blocks, { kind: 'tools', index, parts: [part] }];
  }, []);

  if (!hideVerbose) {
    return all;
  }

  return all.filter((block) => block.kind !== 'reasoning' && block.kind !== 'tools');
}
