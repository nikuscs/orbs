import { ATTACHMENT, attachmentMessage, ENTRY, entryOwnerNote, entryPeerMessage, entryRoutineRun, entrySubagentReport, REACTION, REPLY, replyMessage, replySilent, toolCallJson } from '@repo/contracts/universal';
import { getLocale, m } from '@repo/i18n/client';
import { match, P } from 'ts-pattern';
import { mentionHref, mentionSubmission } from '../mention/mention.utils';
import { CHAT, CHAT_FILE_TYPES } from './chat.constants';
import type * as ChatTypes from '../../types/chat.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function chatMessages({ entries, bot, bots }: ChatTypes.ChatMessagesParams): ChatTypes.ChatMessage[] {
  const botsById = new Map(bots.map((item) => [item.id, item]));
  const messages: ChatTypes.ChatMessage[] = [];

  const chatQuoteName = (quote: UniversalTypes.ReplyQuote) => match(quote.role)
    .with('user', () => m.rooms_chat_you())
    .with('assistant', () => botsById.get(quote.botId ?? bot.id)?.name ?? bot.name)
    .exhaustive();

  for (const entry of entries) {
    const createdAt = chatEntryTime(entry);

    match(entry.kind)
      .with(ENTRY.user, () => messages.push(chatOwnerMessage(entry, {
        text: chatEntryText(entry),
        files: chatEntryImages(entry),
        replyTo: null,
        createdAt,
      })))
      .with(REPLY.entryKind, () => match(replyMessage.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push(chatOwnerMessage(entry, {
          text: data.content,
          files: [],
          replyTo: { entryId: data.replyTo.entryId, authorName: chatQuoteName(data.replyTo), text: data.replyTo.content },
          createdAt,
        })))
        .otherwise(() => undefined))
      .with(REACTION.entryKind, () => undefined)
      .with(ATTACHMENT.entryKind, () => match(attachmentMessage.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push(chatOwnerMessage(entry, {
          text: [...(data.skills ?? []).map((name) => `[$${name}](${mentionHref({ kind: 'skill', name })})`), data.content].filter(Boolean).join(' '),
          files: data.attachments.map((attachment) => ({
            type: 'file' as const,
            mediaType: attachment.mediaType,
            filename: attachment.name,
            url: `${CHAT.attachmentScheme}${attachment.id}`,
          })),
          replyTo: match(data.replyTo)
            .with(P.nonNullable, (quote) => ({ entryId: quote.entryId, authorName: chatQuoteName(quote), text: quote.content }))
            .otherwise(() => null),
          createdAt,
        })))
        .otherwise(() => undefined))
      .with(ENTRY.assistant, () => chatAssistantEntry(messages, entry, bot, createdAt))
      .with(ENTRY.toolResult, () => chatToolResult(messages, entry))
      .with(ENTRY.peerMessage, () => match(entryPeerMessage.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push({
          id: chatMessageId(entry),
          role: 'user',
          metadata: chatMetadata(entry.id, createdAt, data.fromBotId, botsById.get(data.fromBotId)?.name ?? ''),
          parts: [{ type: 'text', text: chatPeerText(chatEntryText(entry)), state: 'done' }],
        }))
        .otherwise(() => undefined))
      .with(ENTRY.subagentReport, () => match(entrySubagentReport.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push(chatSystemMessage(entry, createdAt, bot, [
          { type: 'data-subagent', data },
          { type: 'text', text: chatEntryText(entry), state: 'done' },
        ])))
        .otherwise(() => undefined))
      .with(ENTRY.ownerNote, () => match(entryOwnerNote.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push(chatSystemMessage(entry, createdAt, bot, [
          { type: 'data-ownerNote', data: { ...data, peerName: data.peerBotId ? botsById.get(data.peerBotId)?.name ?? null : null } },
          { type: 'text', text: data.text, state: 'done' },
        ])))
        .otherwise(() => undefined))
      .with(ENTRY.routineRun, () => match(entryRoutineRun.safeParse(entry.data))
        .with({ success: true }, ({ data }) => messages.push(chatSystemMessage(entry, createdAt, bot, [
          { type: 'data-routineRun', data },
          { type: 'text', text: chatEntryText(entry), state: 'done' },
        ])))
        .otherwise(() => undefined))
      .with(ENTRY.compaction, () => messages.push(chatSystemMessage(entry, createdAt, bot, [{ type: 'data-compaction', data: { status: 'done' } }])))
      .with(ENTRY.reset, () => messages.push(chatSystemMessage(entry, createdAt, bot, [{ type: 'data-reset', data: {} }])))
      .otherwise(() => undefined);
  }

  return messages;
}

export function chatPairMessages(messages: ChatTypes.ChatMessage[], askerId: string): ChatTypes.ChatMessage[] {
  let isPair = false;

  return messages.filter((message) => {
    if (message.role === 'user') {
      isPair = message.metadata?.authorId === askerId;
    }

    return isPair;
  });
}

export function chatLive({ state, bot, approvals }: ChatTypes.ChatLiveParams, messages: ChatTypes.ChatMessage[]): ChatTypes.ChatMessage[] {
  const slots = new Map((state.live.tools ?? []).map((slot) => [slot.callId, slot]));
  const approvalsByTask = new Map(approvals.map((approval) => [approval.id, approval]));

  const overlaid = messages.map((message) => match(message.role)
    .with('assistant', () => ({
      ...message,
      parts: message.parts.map((part) => match(part)
        .with({ type: 'dynamic-tool', state: 'input-available' }, (tool) => {
          const slot = slots.get(tool.toolCallId);
          const approval = slot?.taskId === undefined ? undefined : approvalsByTask.get(slot.taskId);

          return match({ slot, approval })
            .with({ approval: P.nonNullable }, ({ approval: request }) => ({
              ...tool,
              state: 'approval-requested' as const,
              approval: { id: String(request.id) },
            }))
            .with({ slot: P.nonNullable }, ({ slot: running }) => ({
              ...tool,
              toolMetadata: toolCallJson.safeParse({ output: running.output ?? null, details: running.details ?? null }).data,
            }))
            .otherwise(() => tool);
        })
        .otherwise(() => part)),
    }))
    .otherwise(() => message));

  const partial = state.live.generation?.message;

  return match(partial)
    .with(P.nonNullable, (draft) => [...overlaid, chatDraftReady({
      id: CHAT.liveMessageId,
      role: 'assistant',
      metadata: chatMetadata(0, Date.now(), bot.id, bot.name),
      parts: chatAssistantParts(draft.content, 'streaming'),
    })])
    .otherwise(() => overlaid);
}

export function chatActivity(state: UniversalTypes.ConversationState | undefined): ChatTypes.ChatActivity {
  const live = state?.live;
  const content = live?.generation?.message?.content ?? [];

  return match({ live, state })
    .returnType<ChatTypes.ChatActivity>()
    .with({ live: { compactions: P.array({ blocking: true }).select() } }, (compactions) => (compactions.length > 0 ? 'compacting' : 'thinking'))
    .when(() => (live?.tools ?? []).some((slot) => slot.status !== 'done'), () => 'working')
    .when(() => content.some((part) => part.type === 'text'), () => 'writing')
    .when(() => live?.run !== undefined, () => 'thinking')
    .when(() => (state?.inbox.items.length ?? 0) > 0, () => 'queued')
    .with({ state: { lastRun: { outcome: { status: 'failed' } } } }, () => 'failed')
    .otherwise(() => 'idle');
}

export function chatQueued(state: UniversalTypes.ConversationState | undefined): ChatTypes.ChatQueued[] {
  return (state?.inbox.items ?? []).flatMap((item) => match(item)
    .with({ entry: { kind: REACTION.entryKind } }, () => [])
    .with({ mode: P.union('steer', 'followUp') }, (queued) => [{
      submissionId: queued.id,
      mode: queued.mode,
      text: chatContentText(queued.content),
    }])
    .otherwise(() => []));
}

export function chatOutgoingMessages(outgoing: ChatTypes.ChatOutgoing[], params: ChatTypes.ChatOutgoingParams): ChatTypes.ChatMessage[] {
  return outgoing.filter((item) => chatOutgoingIsShown(item, params)).map((item) => ({
    id: `${CHAT.outgoingPrefix}${item.requestId}`,
    role: 'user',
    metadata: chatMetadata(0, item.createdAt, null, m.rooms_chat_you()),
    parts: [{ type: 'text', text: item.text, state: 'done' }],
  }));
}

function chatOutgoingIsShown(item: ChatTypes.ChatOutgoing, { botId, latestEntryId, queued }: ChatTypes.ChatOutgoingParams): boolean {
  const isPlaced = latestEntryId > item.afterEntryId || queued.some((entry) => entry.submissionId === item.submissionId);

  return item.botId === botId && (item.submissionId === undefined || !isPlaced);
}

export function chatFailure(state: UniversalTypes.ConversationState | undefined): string | null {
  return match(state)
    .with({ live: { run: P.nullish }, lastRun: { outcome: { status: 'failed', error: { message: P.string.select() } } } }, (message) => message)
    .otherwise(() => null);
}

function chatDraftReady(message: ChatTypes.ChatMessage): ChatTypes.ChatMessage {
  const fencePattern = /^( *)(`{3,}|~{3,})/;
  const blankPattern = /^[ \t]*$/;
  const listItemPattern = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]/;
  const titlePattern = /^ {0,3}(?:#{1,6}(?:[ \t]|$)|\*\*(?:[^*]|\*(?!\*))+\*\*:?$)/;
  const headingPattern = /^#{1,6}(?:[ \t]|$)/;

  function chatReadyText(text: string): string {
    let fence: { marker: string; indent: number } | null = null;
    let boundary = 0;
    let lineStart = 0;
    let titleWaiting = false;

    for (;;) {
      const newline = text.indexOf('\n', lineStart);
      const line = text.slice(lineStart, newline === -1 ? text.length : newline).replace(/[ \t\r]+$/u, '');

      if (!fence && lineStart > 0 && !titleWaiting && listItemPattern.test(line)) {
        boundary = lineStart;
      }

      if (newline === -1) {
        return text.slice(0, boundary);
      }

      const fenceMatch = fencePattern.exec(line);

      if (fenceMatch) {
        const [, indent = '', marker = ''] = fenceMatch;

        if (!fence) {
          fence = { marker, indent: indent.length };
          titleWaiting = false;
        } else if (marker.startsWith(fence.marker) && indent.length <= fence.indent + 3 && line === indent + marker) {
          fence = null;
          boundary = newline + 1;
        }
      } else if (!fence && blankPattern.test(line) && lineStart > 0) {
        boundary = titleWaiting ? boundary : newline + 1;
      } else if (!fence) {
        boundary = lineStart > 0 && !titleWaiting && headingPattern.test(line) ? lineStart : boundary;
        titleWaiting = titlePattern.test(line);
      }

      lineStart = newline + 1;
    }
  }

  return {
    ...message,
    parts: message.parts.flatMap((part) => match(part)
      .with({ type: 'text', state: 'streaming' }, (text) => {
        const ready = chatReadyText(text.text);
        return ready ? [{ ...text, text: ready }] : [];
      })
      .otherwise(() => [part])),
  };
}

function chatAssistantEntry(messages: ChatTypes.ChatMessage[], entry: ChatTypes.ChatEntry, bot: UniversalTypes.Bot, createdAt: number) {
  const message = entry.model?.[0];

  match(message)
    .with({ role: 'assistant' }, (answer) => {
      const parts: ChatTypes.ChatPart[] = [
        ...chatAssistantParts(answer.content, 'done'),
        ...match(answer)
          .with({ stopReason: 'error', errorMessage: P.string.minLength(1) }, ({ errorMessage }) => [{ type: 'data-failure' as const, data: { text: errorMessage } }])
          .otherwise(() => []),
      ];

      const last = messages.at(-1);
      const hasText = answer.content.some((part) => part.type === 'text' && part.text.trim() !== '' && !replySilent.safeParse(part.text).success);

      match(last)
        .with({ role: 'assistant', metadata: { authorId: bot.id } }, (current) => {
          current.parts.push(...parts);
          current.metadata = {
            ...current.metadata,
            entryId: hasText ? entry.id : current.metadata.entryId,
            entryIds: [...current.metadata.entryIds, entry.id],
            usage: chatUsageAdd(current.metadata.usage, answer.usage),
          };
        })
        .otherwise(() => messages.push({
          id: chatMessageId(entry),
          role: 'assistant',
          metadata: { ...chatMetadata(entry.id, createdAt, bot.id, bot.name), usage: chatUsageAdd(null, answer.usage) },
          parts,
        }));
    })
    .otherwise(() => undefined);
}

function chatAssistantParts(content: readonly ChatTypes.ChatContentPart[], state: 'streaming' | 'done'): ChatTypes.ChatPart[] {
  return content.flatMap((part): ChatTypes.ChatPart[] => match(part)
    .with({ type: 'text' }, ({ text }) => (text.trim() === '' || replySilent.safeParse(text).success ? [] : [{ type: 'text' as const, text, state }]))
    .with({ type: 'thinking', redacted: P.optional(P.not(true)) }, ({ thinking }) => (thinking.trim() === '' ? [] : [{ type: 'reasoning' as const, text: thinking, state }]))
    .with({ type: 'toolCall', name: REACTION.toolName }, () => [])
    .with({ type: 'toolCall' }, (call) => [{
      type: 'dynamic-tool' as const,
      toolName: call.name,
      toolCallId: call.id,
      state: 'input-available' as const,
      input: call.arguments,
    }])
    .otherwise(() => []));
}

function chatToolResult(messages: ChatTypes.ChatMessage[], entry: ChatTypes.ChatEntry) {
  match(entry.model?.[0])
    .with({ role: 'toolResult' }, (result) => {
      const output = result.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
      const details = toolCallJson.safeParse({ details: result.details ?? null }).data;

      for (const message of messages.filter((item) => item.role === 'assistant').reverse()) {
        const index = message.parts.findIndex((part) => part.type === 'dynamic-tool' && part.toolCallId === result.toolCallId);
        const part = message.parts[index];

        if (index !== -1 && part.type === 'dynamic-tool') {
          message.parts[index] = result.isError
            ? { type: 'dynamic-tool', toolName: part.toolName, toolCallId: part.toolCallId, input: part.input, state: 'output-error', errorText: output, toolMetadata: details }
            : { type: 'dynamic-tool', toolName: part.toolName, toolCallId: part.toolCallId, input: part.input, state: 'output-available', output, toolMetadata: details };
          return;
        }
      }
    })
    .otherwise(() => undefined);
}

function chatOwnerMessage(entry: ChatTypes.ChatEntry, { text, files, replyTo, createdAt }: ChatTypes.ChatOwnerContent): ChatTypes.ChatMessage {
  return {
    id: chatMessageId(entry),
    role: 'user',
    metadata: { ...chatMetadata(entry.id, createdAt, null, m.rooms_chat_you()), replyTo },
    parts: [...files, ...(text.trim() === '' ? [] : [{ type: 'text' as const, text, state: 'done' as const }])],
  };
}

function chatSystemMessage(
  entry: ChatTypes.ChatEntry,
  createdAt: number,
  author: Pick<UniversalTypes.Bot, 'id' | 'name'> | undefined,
  parts: ChatTypes.ChatPart[],
): ChatTypes.ChatMessage {
  return {
    id: chatMessageId(entry),
    role: 'system',
    metadata: chatMetadata(entry.id, createdAt, author?.id ?? null, author?.name ?? ''),
    parts,
  };
}

function chatMetadata(entryId: number, createdAt: number, authorId: string | null, authorName: string): ChatTypes.ChatMetadata {
  return {
    entryId,
    entryIds: [entryId],
    createdAt,
    authorId,
    authorName,
    replyTo: null,
    usage: null,
  };
}

function chatMessageId(entry: ChatTypes.ChatEntry): string {
  return `${CHAT.entryPrefix}${entry.id}`;
}

function chatEntryTime(entry: ChatTypes.ChatEntry): number {
  return entry.model?.[0]?.timestamp ?? 0;
}

function chatEntryText(entry: ChatTypes.ChatEntry): string {
  return match(entry.model?.[0])
    .with({ role: P.union('user', 'toolResult') }, ({ content }) => chatContentText(content))
    .otherwise(() => '');
}

function chatEntryImages(entry: ChatTypes.ChatEntry): ChatTypes.ChatPart[] {
  return match(entry.model?.[0])
    .with({ role: 'user', content: P.array() }, ({ content }) => content.flatMap((part) => match(part)
      .with({ type: 'image' }, ({ data, mimeType }) => [{ type: 'file' as const, mediaType: mimeType, url: `data:${mimeType};base64,${data}` }])
      .otherwise(() => [])))
    .otherwise(() => []);
}

function chatContentText(content: ChatTypes.ChatInputContent): string {
  return match(content)
    .with(P.string, (text) => text)
    .with(P.array({ type: 'text', text: P.string }), (parts) => parts.map((part) => part.text).join('\n'))
    .with(P.array(), (parts) => parts.flatMap((part) => match(part)
      .with({ type: 'text', text: P.string }, ({ text }) => [text])
      .otherwise(() => [])).join('\n'))
    .otherwise(() => '');
}

function chatPeerText(text: string): string {
  return text.replace(CHAT.peerNotePattern, '');
}

function chatUsageAdd(current: ChatTypes.ChatUsage | null, usage: ChatTypes.ChatUsage): ChatTypes.ChatUsage {
  return {
    input: (current?.input ?? 0) + usage.input,
    output: (current?.output ?? 0) + usage.output,
    cacheRead: (current?.cacheRead ?? 0) + usage.cacheRead,
    cost: { total: (current?.cost.total ?? 0) + usage.cost.total },
  };
}

export function chatEntryIds(messages: ChatTypes.ChatMessage[]): number[] {
  return [...new Set(messages.flatMap((message) => (message.metadata?.entryId ? [message.metadata.entryId] : [])))];
}

export function chatAnswerProblem({ isGone, isError }: ChatTypes.ChatAnswerProblemParams): string | null {
  return match({ isGone, isError })
    .with({ isGone: true }, () => m.rooms_chat_approval_gone())
    .with({ isError: true }, () => m.rooms_chat_approval_error())
    .otherwise(() => null);
}

export function chatResetCommand(text: string): ChatTypes.ChatResetCommand | null {
  const { command } = mentionSubmission({ text });

  return command?.name === 'reset' ? { handoff: command.arguments || undefined } : null;
}

export function chatFileType({ name, mediaType }: ChatTypes.ChatFileTypeParams): string {
  const extension = name.split('.').at(-1)?.toLowerCase();

  return mediaType ?? Object.entries(CHAT_FILE_TYPES).find(([type]) => type === extension)?.[1] ?? '';
}

export function chatContextView({ contextWindow, estimatedTokens }: UniversalTypes.ConversationContextUsage): ChatTypes.ChatContextView {
  const number = new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 });

  const chatTokens = (value: number) => match(value)
    .with(P.number.gte(1_000_000), (count) => `${number.format(count / 1_000_000)}M`)
    .with(P.number.gte(1000), (count) => `${number.format(count / 1000)}K`)
    .otherwise((count) => number.format(count));

  const used = chatTokens(estimatedTokens);
  const percent = contextWindow ? Math.min(100, Math.round((estimatedTokens / contextWindow) * 100)) : null;
  const shown = percent === null ? null : new Intl.NumberFormat(getLocale(), { style: 'percent' }).format(percent / 100);

  return {
    percent,
    shown,
    used,
    label: shown ? m.rooms_context_full({ percent: shown }) : m.rooms_context_tokens_only({ used }),
    tokens: contextWindow ? m.rooms_context_tokens({ used, total: chatTokens(contextWindow) }) : m.rooms_context_tokens_only({ used }),
    tone: match(percent)
      .with(P.number.gte(CHAT.contextCriticalPercent), () => 'destructive' as const)
      .with(P.number.gte(CHAT.contextWarningPercent), () => 'warning' as const)
      .otherwise(() => 'muted' as const),
  };
}
