import { m } from '@repo/i18n/client';
import { match } from 'ts-pattern';
import { toolBlocks } from '../tool/tool.client';
import { TOOL_ACTIVITY_LABELS, TOOL_PEER_NAMES, TOOL_SUBAGENT } from '../tool/tool.constants';
import { toolInputText, toolPresentation, toolPreview, toolRunning } from '../tool/tool.utils';
import { CHAT } from './chat.constants';
import type * as ChatTypes from '../../types/chat.types';

export function chatActivityMessage(messages: readonly ChatTypes.ChatMessage[]): ChatTypes.ChatMessage | undefined {
  const last = messages.at(-1);

  return messages.find((message) => message.id === CHAT.liveMessageId) ?? (last?.role === 'assistant' ? last : undefined);
}

export function chatActivityPreamble(content: readonly ChatTypes.ChatContentPart[], index: number): boolean {
  const part = content.at(index);
  const calls = content.slice(index + 1).filter((next) => next.type === 'toolCall');

  if (part?.type !== 'text' || calls.length === 0 || (part.textSignature?.includes(CHAT.finalAnswerPhase) ?? false)) {
    return false;
  }

  const text = part.text.trim();
  const isShort = text.length <= CHAT.preambleMaxLength && !text.includes('\n\n');
  const hasWorkAfter = calls.some((call) => !CHAT.activityReplyTools.has(call.name));

  return (part.textSignature?.includes(CHAT.commentaryPhase) ?? false) || (isShort && (hasWorkAfter || /(?:…|\.\.\.)$/u.test(text)));
}

export function chatActivityPeer<T extends Pick<ChatTypes.ChatActivityBot, 'id'>>(draft: ChatTypes.ChatMessage | undefined, bots: readonly T[]): T | undefined {
  const last = draft?.parts.filter((part) => part.type !== 'step-start').at(-1);

  return last?.type === 'dynamic-tool' && toolRunning(last) && TOOL_PEER_NAMES.has(last.toolName)
    ? bots.find((bot) => bot.id === toolInputText({ input: last.input, key: 'botId' }))
    : undefined;
}

export function chatActivityStartedAt(messages: readonly ChatTypes.ChatMessage[]): number | undefined {
  return [...messages].reverse().find((message) => message.role !== 'assistant')?.metadata?.createdAt;
}

export function chatActivitySteps(message: ChatTypes.ChatMessage): ChatTypes.ChatActivitySteps | null {
  const steps = toolBlocks({ parts: message.parts }).reduce((count, block) => count + (block.kind === 'reasoning' || block.kind === 'tools' ? block.parts.length : 0), 0);
  const { startedAt, endedAt } = message.metadata ?? {};

  const hasAnswer = message.parts.some((part) => part.type === 'text');

  if (message.role !== 'assistant' || steps === 0 || !hasAnswer) {
    return null;
  }

  return { steps, seconds: startedAt === undefined || endedAt === undefined ? null : Math.max(0, Math.round((endedAt - startedAt) / 1000)) };
}

export function chatActivityDetail({ draft, bots }: ChatTypes.ChatActivityDetailParams): string | null {
  const parts = draft?.parts.filter((part) => part.type !== 'step-start') ?? [];
  const last = parts.at(-1);
  const before = parts.at(-2);
  const preamble = last?.type === 'dynamic-tool' && before?.type === 'reasoning' && Object.hasOwn(before.providerMetadata ?? {}, CHAT.preambleKey) ? chatActivityPlain(before.text) : null;

  const detail = match(last)
    .returnType<string | null>()
    .with({ type: 'dynamic-tool' }, (part) => {
      if (!toolRunning(part)) {
        return null;
      }

      if (preamble) {
        return preamble;
      }

      const peer = chatActivityPeer(draft, bots);

      if (peer) {
        return m.rooms_activity_detail_peer({ bot: peer.name });
      }

      if (part.toolName === TOOL_SUBAGENT) {
        const name = toolInputText({ input: part.input, key: 'name' });

        return name ? m.rooms_activity_detail_subagent({ name }) : m.rooms_activity_detail_subagent_anonymous();
      }

      const preview = toolPreview(part);
      const friendly = TOOL_ACTIVITY_LABELS.get(part.toolName);

      if (friendly) {
        return preview && friendly.detail ? friendly.detail(preview) : friendly.plain();
      }

      const { label } = toolPresentation(part);

      return preview ? m.rooms_activity_detail_tool({ tool: label, detail: preview }) : label;
    })
    .with({ type: 'reasoning' }, ({ text }) => [...text.matchAll(/\*\*([^*\n]{3,80})\*\*/gu)].at(-1)?.[1]?.trim() ?? text.split('\n').map(chatActivityPlain).filter(Boolean).at(-1) ?? null)
    .otherwise(() => null);

  return detail && detail.length > CHAT.activityDetailMaxLength ? `${detail.slice(0, CHAT.activityDetailMaxLength - 1).trimEnd()}…` : detail;
}

function chatActivityPlain(line: string) {
  return line.replace(/^\s*(?:#+|[-*>]|\d+\.)\s+/u, '').replace(/[*_`~]+/gu, '').replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1').trim();
}

export function chatActivityStepsLabel({ steps, seconds }: ChatTypes.ChatActivitySteps): string {
  const count = steps === 1 ? m.rooms_activity_step() : m.rooms_activity_steps({ steps });

  return seconds === null ? count : m.rooms_activity_steps_time({ steps: count, seconds });
}

export function chatActivityWaitingOn(approvalCount: number, questionCount: number): ChatTypes.ChatActivityWait | undefined {
  if (approvalCount > 0) {
    return 'approval';
  }

  return questionCount > 0 ? 'question' : undefined;
}
