import { botUsageLabel, CHAT, htmlReplySegments, toolBlocks } from '@repo/client/client';
import { getLocale, m } from '@repo/i18n/client';
import { DeviceEventEmitter } from 'react-native';
import { match } from 'ts-pattern';
import { connectionFileSource } from '@/services/connection/connection.client';
import { CHAT_MEDIA } from './chat.constants';
import type * as ChatTypes from '@/types/chat.types';
import type { RpcSession } from '@/types/rpc.types';
import type { ChatMessage, RoomsFilePart } from '@repo/client/client';
import type { ImageURISource } from 'react-native';

export function chatMessageDetails(message: ChatMessage): string[] {
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
  const sent = message.metadata ? [m.rooms_chat_sent({ date: date.format(new Date(message.metadata.createdAt)) })] : [];
  const usage = message.role === 'assistant' && message.metadata?.usage ? [botUsageLabel(message.metadata.usage)] : [];

  return [...sent, ...usage];
}

export function chatMessageSegments(message: ChatMessage, hideVerbose: boolean): ChatTypes.ChatMessageSegment[] {
  const isReply = message.role !== 'user';
  const files = message.parts.filter((part) => part.type === 'file');
  const segments: ChatTypes.ChatMessageSegment[] = files.length > 0 ? [{ key: 'files', kind: 'bubbles', parts: [{ key: 'files', kind: 'files', files }] }] : [];

  for (const block of toolBlocks({ parts: message.parts, hideVerbose })) {
    const tools = match(block)
      .with({ kind: 'tools' }, ({ parts }) => parts)
      .otherwise(() => undefined);

    if (block.kind === 'events') {
      segments.push({
        key: `events-${block.index}`,
        kind: 'events',
        events: block.events,
      });
      continue;
    }

    if (block.kind === 'reasoning') {
      segments.push({
        key: `reasoning-${block.index}`,
        kind: 'reasoning',
        text: block.parts.map((part) => part.text).join('\n\n'),
        isStreaming: block.parts.some((part) => part.state === 'streaming'),
      });
      continue;
    }

    if (block.kind === 'failure') {
      segments.push({
        key: `failure-${block.index}`,
        kind: 'failure',
        text: block.text,
      });
      continue;
    }

    if (block.kind === 'subagent') {
      segments.push({
        key: `subagent-${block.index}`,
        kind: 'subagent',
        part: block.part,
        subagent: block.subagent,
      });
      continue;
    }

    const parts = match(block)
      .returnType<ChatTypes.ChatMessagePart[]>()
      .with({ kind: 'text' }, (text) => text.parts.flatMap((part, index) => match(isReply && part.state !== 'streaming')
        .with(true, () => htmlReplySegments(part.text).map((segment, at) => ({ key: `${block.index}-${index}-${at}`, ...segment, isStreaming: false })))
        .otherwise(() => [{ key: `${block.index}-${index}`, kind: 'markdown', text: part.text, isStreaming: part.state === 'streaming' }])))
      .with({ kind: 'artifact' }, (artifact) => [{
        key: `${block.index}`,
        kind: 'artifact',
        artifact: artifact.artifact,
      }])
      .with({ kind: 'gif' }, (gif) => [{ key: `${block.index}`, kind: 'gif', gif: gif.gif }])
      .otherwise(() => []);

    const last = segments.at(-1);

    if (tools) {
      segments.push({
        key: `tools-${block.index}`,
        kind: 'tools',
        parts: tools,
      });
    } else if (last?.kind === 'bubbles') {
      last.parts.push(...parts);
    } else if (parts.length > 0) {
      segments.push({
        key: `bubbles-${block.index}`,
        kind: 'bubbles',
        parts,
      });
    }
  }

  return segments;
}

export function chatFileSource(session: RpcSession, botId: string, file: RoomsFilePart): ImageURISource {
  return file.url.startsWith(CHAT.attachmentScheme)
    ? connectionFileSource(session, { botId, attachmentId: file.url.slice(CHAT.attachmentScheme.length) })
    : { uri: file.url };
}

export function chatPosterSource(session: RpcSession, botId: string, file: RoomsFilePart): ImageURISource | undefined {
  const source = chatFileSource(session, botId, file);

  return file.url.startsWith(CHAT.attachmentScheme) ? { ...source, uri: `${source.uri ?? ''}/${CHAT.posterPath}` } : undefined;
}

export function chatPlaybackStart(player: ChatTypes.ChatPlayback) {
  DeviceEventEmitter.emit(CHAT_MEDIA.playbackEvent, player);
}
