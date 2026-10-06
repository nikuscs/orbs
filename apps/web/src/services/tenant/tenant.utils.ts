import { isTextUIPart } from 'ai';
import { match } from 'ts-pattern';
import { roomMentionPlain, tenantMessages } from '@orbs/server/client';
import type * as TenantTypes from '@/types/tenant.types';
import type { RoomUIMessage } from '@orbs/server/client';

export function tenantMergeTimeline({ current, latest }: TenantTypes.TenantMergeTimelineParams): RoomUIMessage[] {
  const overlapStart = current.findIndex((message) => message.id === latest[0]?.id);

  return overlapStart > 0 ? [...current.slice(0, overlapStart), ...latest] : latest;
}

export async function tenantTimelinePatch(event: TenantTypes.TenantTimelineEvent): Promise<TenantTypes.TenantTimelinePatch> {
  return match(event)
    .returnType<TenantTypes.TenantTimelinePatch | Promise<TenantTypes.TenantTimelinePatch>>()
    .with({ type: 'message.created' }, async ({ message }) => {
      const created = await tenantMessages([message]);

      return (timeline) => ({
        ...timeline,
        messages: timeline.messages.some((item) => item.id === message.id)
          ? timeline.messages
          : [...timeline.messages, ...created].sort((a, b) => (a.metadata?.seq ?? 0) - (b.metadata?.seq ?? 0)),
      });
    })
    .with({ type: 'message.routed' }, ({ messageId, route }) => (timeline) => ({
      ...timeline,
      messages: timeline.messages.map((message) => (message.id === messageId && message.metadata
        ? { ...message, metadata: { ...message.metadata, route } }
        : message)),
    }))
    .with({ type: 'run.updated' }, ({ runs }) => (timeline) => ({ ...timeline, runs }))
    .with({ type: 'run.activity' }, ({ runId, activity }) => (timeline) => ({
      ...timeline,
      runs: timeline.runs.map((run) => (run.id === runId ? { ...run, activity } : run)),
    }))
    .exhaustive();
}

export function tenantRoomTitle({ room, members }: TenantTypes.TenantRoomTitleParams): TenantTypes.TenantRoomTitle {
  const names = members.map((bot) => bot.name).join(', ');

  return room.kind === 'group' && room.name.trim() ? { title: room.name, subtitle: names } : { title: names, subtitle: null };
}

export function tenantMessageText(message: RoomUIMessage): string {
  return roomMentionPlain(message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(' '));
}

export function tenantFreshAnchors({ messages, fresh }: TenantTypes.TenantFreshAnchorsParams): Map<string, string[]> {
  const anchors = new Map<string, string[]>();

  for (const item of fresh) {
    const lastShownAtOrBeforeFreshFrom = [...messages].reverse().find((message) => message.metadata !== undefined && message.metadata.seq <= item.seq);

    if (lastShownAtOrBeforeFreshFrom) {
      anchors.set(lastShownAtOrBeforeFreshFrom.id, [...anchors.get(lastShownAtOrBeforeFreshFrom.id) ?? [], item.botId]);
    }
  }

  return anchors;
}

export function tenantMergeOlder({ older, current }: TenantTypes.TenantMergeOlderParams): RoomUIMessage[] {
  const shown = new Set(current.map((message) => message.id));

  return [...older.filter((message) => !shown.has(message.id)), ...current];
}
