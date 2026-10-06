import { m } from '@orbs/i18n/client';
import { getToolName, isToolUIPart } from 'ai';
import { roomToolInput, roomToolText } from '@orbs/server/client';
import { TOOL_BRANDS, TOOL_COMMAND_KEYS, TOOL_INTERNAL_PRESENTATIONS, TOOL_NATIVE_PRESENTATIONS, TOOL_PATH_KEYS, TOOL_PREVIEW_KEYS } from './tool.constants';
import { toolInputTexts } from './tool.utils';
import type * as ToolTypes from '@/types/tool.types';

export function toolBlocks({ parts }: ToolTypes.ToolBlocksParams): ToolTypes.ToolBlock[] {
  return parts.reduce<ToolTypes.ToolBlock[]>((blocks, part, index) => {
    const last = blocks.at(-1);

    if (part.type === 'text') {
      return last?.kind === 'text' ? [...blocks.slice(0, -1), { ...last, parts: [...last.parts, part] }] : [...blocks, { kind: 'text', index, parts: [part] }];
    }

    if (!isToolUIPart(part)) {
      return blocks;
    }

    return last?.kind === 'tools' ? [...blocks.slice(0, -1), { ...last, parts: [...last.parts, part] }] : [...blocks, { kind: 'tools', index, parts: [part] }];
  }, []);
}

export function toolIdentity(part: ToolTypes.ToolPart): ToolTypes.ToolIdentity {
  const raw = getToolName(part);
  const texts = toolInputTexts(part);
  const proxy = raw === 'mcp' ? texts.find((text) => text.key === 'tool')?.value : undefined;
  const identifier = proxy ?? raw;
  const qualified = /^mcp__(.+?)__(.+)$/.exec(identifier);

  if (qualified) {
    return { name: qualified.at(2) ?? identifier, source: qualified[1], identifier };
  }

  const internal = /^(?:mcp[-_]internal)[_:](.+)$/.exec(identifier);

  if (internal) {
    return { name: internal.at(1) ?? identifier, source: 'mcp_internal', identifier };
  }

  const source = proxy ? texts.find((text) => text.key === 'server')?.value : undefined;

  return { name: identifier, source, identifier };
}

export function toolPresentation(part: ToolTypes.ToolPart): ToolTypes.ToolPresentation {
  function toolReadableName(name: string): string {
    const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();

    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  const identity = toolIdentity(part);
  const internal = identity.source?.replace(/-/g, '_') === 'mcp_internal';

  const external = identity.source ? undefined : TOOL_NATIVE_PRESENTATIONS.get(identity.name);
  const known = internal ? TOOL_INTERNAL_PRESENTATIONS.get(identity.name) : external;
  const label = known?.label() ?? toolReadableName(identity.name);

  const sourceName = internal ? 'mcp_internal' : identity.source;
  const source = sourceName ? TOOL_BRANDS.get(sourceName) ?? toolReadableName(sourceName) : undefined;

  return {
    label: source ? m.tool_label_source({ label, source }) : label,
    icon: known?.icon ?? (identity.source || getToolName(part) === 'mcp' ? 'mcp' : 'tool'),
  };
}

export function toolPreview(part: ToolTypes.ToolPart): string | undefined {
  const texts = toolInputTexts(part).filter((text) => getToolName(part) !== 'mcp' || text.key !== 'tool');
  const preferred = TOOL_PREVIEW_KEYS.map((key) => texts.find((text) => text.key === key)).find(Boolean) ?? texts.at(0);

  const line = preferred?.value.split('\n')[0];

  if (!preferred || !TOOL_PATH_KEYS.has(preferred.key)) {
    return line;
  }

  return line
    ?.split('/')
    .filter(Boolean)
    .at(-1);
}

export function toolInputText(part: ToolTypes.ToolPart): string {
  const input = roomToolInput.safeParse(part.input);
  const fields = input.success ? Object.keys(input.data) : [];
  const texts = toolInputTexts(part);
  const command = texts.find((text) => TOOL_COMMAND_KEYS.has(text.key));
  const only = fields.length === 1 ? texts.at(0) : undefined;

  return (command ?? only)?.value ?? JSON.stringify(part.input ?? {}, null, 2);
}

export function toolOutputText(part: ToolTypes.ToolPart): string | undefined {
  if (part.state === 'output-error') {
    return part.errorText;
  }

  if (part.state !== 'output-available') {
    return undefined;
  }

  const output = roomToolText.safeParse(part.output);
  const text = output.success ? output.data : JSON.stringify(part.output, null, 2);

  return text.trimEnd() || undefined;
}

export function toolCollapsed({ part, grouped, expanded }: ToolTypes.ToolCollapsedParams): boolean {
  return grouped && !expanded && part.state !== 'approval-requested';
}

export function toolRunning(part: ToolTypes.ToolPart): boolean {
  return part.state === 'input-streaming' || part.state === 'input-available' || part.state === 'approval-responded';
}

export function toolGroupState({ parts }: ToolTypes.ToolGroupStateParams): ToolTypes.ToolPart['state'] {
  if (parts.some(toolRunning)) {
    return 'input-available';
  }

  if (parts.some((part) => part.state === 'output-error')) {
    return 'output-error';
  }

  return 'output-available';
}
