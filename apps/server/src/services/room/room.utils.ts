import { isToolUIPart } from 'ai';
import { roomFilePart, roomMentionKind, roomMessageParts, roomMessageTextParts } from '#/types/room.types';
import { runToolOutput } from '#/types/run.types';
import { RUN } from '#services/run/run.constants';
import { ROOM, ROOM_MENTION_LINK } from './room.constants';
import type { DatabaseTenant, DatabaseTenantFile, DatabaseTenantMessage } from '#/types/database-tenant.types';
import type * as RoomTypes from '#/types/room.types';
import type { TenantRoomLastMessage, TenantRoomListItem } from '#/types/tenant.types';
import type { FileUIPart, UIMessage } from 'ai';

export function roomMentionHref(target: RoomTypes.RoomMentionTarget): string {
  return `${ROOM.mentionScheme}${target.kind}/${target.id}`;
}

export function roomMentionTarget(href: string): RoomTypes.RoomMentionTarget | null {
  if (!href.startsWith(ROOM.mentionScheme)) {
    return null;
  }

  const [kind, id, ...rest] = href.slice(ROOM.mentionScheme.length).split('/');
  const parsed = roomMentionKind.safeParse(kind);

  return parsed.success && id && rest.length === 0 ? { kind: parsed.data, id } : null;
}

export function roomMentionTargets(text: string): RoomTypes.RoomMentionTarget[] {
  const mentionLink = new RegExp(ROOM_MENTION_LINK, 'gu');

  return [...text.matchAll(mentionLink)].flatMap((match) => roomMentionTarget(match[2]) ?? []);
}

export function roomMentionPlain(text: string): string {
  return text.replaceAll(new RegExp(ROOM_MENTION_LINK, 'gu'), (link, label: string, href: string) => (roomMentionTarget(href) ? label : link));
}

export function roomMentionHandle(handle: string): RegExp {
  const notInsideAWord = String.raw`(?<![\p{L}\p{N}_.-])`;
  const notInsideALongerHandle = String.raw`(?![\p{L}\p{N}_-])`;

  return new RegExp(`${notInsideAWord}@${handle}${notInsideALongerHandle}`, 'iu');
}

export async function roomOwnBots(deps: RoomTypes.RoomServiceDeps, botIds: string[]): Promise<boolean> {
  const bots = new Set((await deps.bot.queries.list({ organizationId: deps.organizationId })).map((bot) => bot.id));

  return botIds.every((botId) => bots.has(botId));
}

function roomMessageRaw(parts: string): string {
  const parsed = roomMessageTextParts.safeParse(JSON.parse(parts));

  return parsed.success ? parsed.data
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n') : '';
}

export function roomMessageText(parts: string): string {
  return roomMentionPlain(roomMessageRaw(parts));
}

export function roomMessageMentions(parts: string): RoomTypes.RoomMentionTarget[] {
  return roomMentionTargets(roomMessageRaw(parts));
}

export function roomMessageFiles(parts: string): RoomTypes.RoomFilePart[] {
  const parsed = roomMessageParts.safeParse(JSON.parse(parts));

  return parsed.success ? parsed.data.flatMap((part) => {
    const file = roomFilePart.safeParse(part);

    return file.success ? [file.data] : [];
  }) : [];
}

export function roomFileId(url: string): string {
  return url.slice(ROOM.fileUrlPrefix.length);
}

export function roomFileName(name: string): string {
  const encoder = new TextEncoder();
  const cleaned = new TextDecoder().decode(encoder.encode(name)).replaceAll(/[\p{Cc}/\\]/gu, '_').replace(/^\.+/, '_');
  let safe = '';

  for (const character of cleaned) {
    if (encoder.encode(safe + character).length > ROOM.fileNameBytes) {
      break;
    }

    safe += character;
  }

  return safe || 'file';
}

export function roomFilePath(roomId: string, fileId: string, filename: string): string {
  return `${ROOM.filesRoot}/${roomId}/files/${fileId}/${filename}`;
}

export function roomFileParts(files: Pick<DatabaseTenantFile, 'id' | 'name' | 'mediaType'>[]): FileUIPart[] {
  return files.map((file) => ({ type: 'file', mediaType: file.mediaType, filename: file.name, url: `${ROOM.fileUrlPrefix}${file.id}` }));
}

export function roomPreview(message: Pick<DatabaseTenantMessage, 'authorName' | 'parts' | 'createdAt'>): TenantRoomLastMessage {
  const names = roomMessageFiles(message.parts).map((file) => file.filename);
  const text = roomMessageText(message.parts) || (names.length > 0 ? `📎 ${names.join(', ')}` : '');

  return {
    authorName: message.authorName,
    text: text.replaceAll(/\s+/g, ' ').trim().slice(0, ROOM.previewChars),
    createdAt: message.createdAt,
  };
}

export function roomOrder(a: TenantRoomListItem, b: TenantRoomListItem): number {
  return b.pinned - a.pinned
    || Number(a.position === null) - Number(b.position === null)
    || (a.position ?? 0) - (b.position ?? 0)
    || (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt);
}

export function roomReplySnapshot(target: Pick<DatabaseTenantMessage, 'id' | 'authorName' | 'parts'>): RoomTypes.RoomMessageReply {
  return { id: target.id, authorName: target.authorName, text: roomMessageText(target.parts).replaceAll(/\s+/g, ' ').trim().slice(0, ROOM.replyQuoteChars) };
}

export function roomMemberKey(botIds: string[]): string {
  return [...new Set(botIds)].sort().join(',');
}

export function roomLastSeq(database: DatabaseTenant, roomId: string): number {
  const row = database.all(database.db
    .selectFrom('message')
    .select((eb) => eb.fn.coalesce(eb.fn.max('seq'), eb.lit(0)).as('seq'))
    .where('roomId', '=', roomId)).at(0);

  return row?.seq ?? 0;
}

export function roomClipToolText(text: string): string {
  return text.length > RUN.toolOutputChars ? `${text.slice(0, RUN.toolOutputChars - 1)}…` : text;
}

export function roomMessagePart<T extends UIMessage['parts'][number]>(part: T): T {
  if (!isToolUIPart(part)) {
    return part;
  }

  if (part.state === 'output-available') {
    const output = runToolOutput.safeParse(part.output);

    return output.success ? { ...part, output: roomClipToolText(output.data) } : part;
  }

  if (part.state === 'output-error') {
    return { ...part, errorText: roomClipToolText(part.errorText) };
  }

  return part;
}
