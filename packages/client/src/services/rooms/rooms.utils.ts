import { m } from '@repo/i18n/client';
import { match, P } from 'ts-pattern';
import { CHAT } from '../chat/chat.constants';
import { toolInputText } from '../tool/tool.utils';
import { ROOMS } from './rooms.constants';
import type { ChatMessage } from '../../types/chat.types';
import type * as RoomsTypes from '../../types/rooms.types';

export function roomsFold(text: string) {
  return text.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
}

export function roomsSidebarOrder({ chats, sections = [] }: RoomsTypes.RoomsSidebarOrderParams) {
  const shown = chats.filter((chat) => !chat.isHidden);
  const unpinned = shown.filter((chat) => !chat.isPinned);

  return {
    pinned: shown.filter((chat) => chat.isPinned),
    sections: sections.map((section) => ({
      ...section,
      chats: unpinned.filter((chat) => chat.sectionId === section.id),
    })),
    others: unpinned.filter((chat) => !sections.some((section) => section.id === chat.sectionId)),
    hidden: chats.filter((chat) => chat.isHidden),
  };
}

export function roomsSearchResults({ chats, hits, query }: RoomsTypes.RoomsSearchResultsParams): RoomsTypes.RoomsSearchResults {
  const needle = roomsFold(query);
  const { pinned, others, hidden } = roomsSidebarOrder({ chats });
  const entries = [...pinned, ...others, ...hidden].map((chat) => ({ chat, title: chat.name }));
  const entriesByBot = new Map(entries.map((entry) => [entry.chat.botId, entry]));
  const groups = new Map<string, RoomsTypes.RoomsSearchGroup>();

  for (const hit of hits) {
    const entry = entriesByBot.get(hit.botId);

    if (entry) {
      groups.set(hit.botId, { ...entry, hits: [...groups.get(hit.botId)?.hits ?? [], hit] });
    }
  }

  return {
    chats: needle ? entries.filter((entry) => roomsFold(entry.title).includes(needle)) : entries,
    groups: [...groups.values()],
  };
}

export function roomsSearchSnippet({ text, query }: RoomsTypes.RoomsSearchSnippetParams): RoomsTypes.RoomsSearchSnippetPart[] {
  const folded = roomsFold(text);
  const needle = roomsFold(query.trim());
  const found = needle ? folded.indexOf(needle) : -1;

  return match(found)
    .with(-1, () => [{ text, match: false, start: 0 }])
    .otherwise((start) => {
      const from = Math.max(0, start - ROOMS.searchContextChars);

      return [
        { text: `${from > 0 ? '…' : ''}${text.slice(from, start)}`, match: false, start: from },
        { text: text.slice(start, start + needle.length), match: true, start },
        { text: text.slice(start + needle.length), match: false, start: start + needle.length },
      ].filter((part) => part.text !== '');
    });
}

export function roomsMessageText(message: ChatMessage): string {
  return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n');
}

export function roomsChoice({ choice }: RoomsTypes.RoomsChoiceParams): RoomsTypes.RoomsChoice {
  const recommended = choice.endsWith(ROOMS.recommendedChoice);

  return { label: recommended ? choice.slice(0, -ROOMS.recommendedChoice.length).trimEnd() : choice, recommended };
}

export function roomsApprovalText({ input }: RoomsTypes.RoomsApprovalTextParams): RoomsTypes.RoomsApprovalText {
  const command = toolInputText({ input, key: 'command' });

  return { code: command, description: command ? toolInputText({ input, key: 'description' }) : undefined };
}

export function roomsQuestionText({ question }: RoomsTypes.RoomsQuestionTextParams): RoomsTypes.RoomsQuestionText {
  const [title, ...details] = question.trim().split('\n');

  return { title, detail: details.join('\n').trim() };
}

export function roomsReactionGroups({ reaction, bots }: RoomsTypes.RoomsReactionGroupsParams): RoomsTypes.RoomsReactionGroup[] {
  const names = new Map(bots.map((bot) => [bot.id, bot.name]));

  const reactors = [
    ...(reaction?.emojis ?? []).map((emoji) => ({ emoji, name: m.rooms_chat_you(), isMine: true })),
    ...(reaction?.botReactions ?? []).flatMap(({ botId, emojis }) => emojis.map((emoji) => ({ emoji, name: names.get(botId) ?? '', isMine: false }))),
  ];

  return [...new Set(reactors.map((reactor) => reactor.emoji))].map((emoji) => {
    const matching = reactors.filter((reactor) => reactor.emoji === emoji);

    return {
      emoji,
      count: matching.length,
      names: matching.map((reactor) => reactor.name),
      isMine: matching.some((reactor) => reactor.isMine),
    };
  });
}

const roomsTimeFormats = new Map<string, Intl.DateTimeFormat>();

function roomsTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale} ${JSON.stringify(options)}`;
  const format = roomsTimeFormats.get(key) ?? new Intl.DateTimeFormat(locale, options);

  roomsTimeFormats.set(key, format);

  return format;
}

function roomsDayStart(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function roomsMessageTime({ createdAt, locale }: RoomsTypes.RoomsMessageTimeParams): string {
  return roomsTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(createdAt);
}

export function roomsDayLabel({ createdAt, previous, now, locale }: RoomsTypes.RoomsDayLabelParams): string | undefined {
  const date = new Date(createdAt);
  const before = match(previous).with(P.number, (value) => new Date(value)).otherwise(() => undefined);

  if (before && roomsDayStart(date) === roomsDayStart(before)) {
    return undefined;
  }

  const days = Math.round((roomsDayStart(now) - roomsDayStart(date)) / ROOMS.dayMs);

  if (days === 0) {
    return m.rooms_day_today();
  }

  if (days === 1) {
    return m.rooms_day_yesterday();
  }

  return (days < ROOMS.weekDays
    ? roomsTimeFormat(locale, { weekday: 'long' })
    : roomsTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })).format(date);
}

export function roomsFileKind(mediaType: string): RoomsTypes.RoomsFileRow['kind'] {
  return match(mediaType.split('/', 1)[0])
    .with('image', () => 'images' as const)
    .with('video', () => 'video' as const)
    .with('audio', () => 'audio' as const)
    .otherwise(() => 'file' as const);
}

export function roomsFileRows(files: RoomsTypes.RoomsFilePart[]): RoomsTypes.RoomsFileRow[] {
  const images = files.filter((file) => roomsFileKind(file.mediaType) === 'images');

  return files.flatMap((file): RoomsTypes.RoomsFileRow[] => match(roomsFileKind(file.mediaType))
    .with('images', () => (file === images[0] ? [{
      key: file.url,
      kind: 'images' as const,
      files: images.slice(0, ROOMS.galleryTiles),
      hidden: Math.max(0, images.length - ROOMS.galleryTiles),
    }] : []))
    .otherwise((kind) => [{ key: file.url, kind, file }]));
}

export function roomsImageFrame(size?: { width: number, height: number }) {
  const { box, minRatio, maxRatio, loadingRatio } = ROOMS.image;
  const ratio = size && size.width > 0 && size.height > 0 ? size.width / size.height : loadingRatio;
  const aspectRatio = Math.min(maxRatio, Math.max(minRatio, ratio));

  return { width: Math.round(aspectRatio >= 1 ? box : box * aspectRatio), aspectRatio };
}

export function roomsFileImages(message: ChatMessage | undefined): RoomsTypes.RoomsFilePart[] {
  return (message?.parts ?? []).flatMap((part) => (part.type === 'file' && roomsFileKind(part.mediaType) === 'images' ? [part] : []));
}

export function roomsMediaTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

export function roomsAttachmentPath(botId: string, url: string, isPoster = false): string {
  if (!url.startsWith(CHAT.attachmentScheme)) {
    return url;
  }

  const path = `${CHAT.filesPath}/${encodeURIComponent(botId)}/${encodeURIComponent(url.slice(CHAT.attachmentScheme.length))}`;

  return isPoster ? `${path}/${CHAT.posterPath}` : path;
}
