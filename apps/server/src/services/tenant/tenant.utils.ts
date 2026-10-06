import { Errors } from '@orbs/errors/universal';
import { isToolUIPart, validateUIMessages } from 'ai';
import { roomMessageMetadata } from '#/types/room.types';
import { roomMessagePart } from '#services/room/room.utils';
import type { DatabaseTenantMessage } from '#/types/database-tenant.types';
import type * as RoomTypes from '#/types/room.types';
import type { TenantSocketOwner } from '#/types/tenant.types';

export function tenantSocketTag(owner: TenantSocketOwner): string {
  return `${owner.kind}:${owner.id}`;
}

export function tenantFileHeaders(file: Pick<RoomTypes.RoomFile, 'name' | 'mediaType'>): HeadersInit {
  return {
    'content-type': file.mediaType,
    'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  };
}

export function tenantSendResult(result: RoomTypes.RoomSendOutcome): RoomTypes.RoomSendResult {
  if (result === 'empty') {
    throw new Errors.FORBIDDEN();
  }

  if (!result) {
    throw new Errors.NOT_FOUND();
  }

  if (result === 'files') {
    throw new Errors.NOT_FOUND({ resource: 'file' });
  }

  if (Array.isArray(result)) {
    throw new Errors.VALIDATION_ERROR({ fields: { files: { message: 'rooms_files_blind', args: { bots: result.join(', ') } } } });
  }

  return result;
}

export async function tenantMessages(rows: DatabaseTenantMessage[]): Promise<RoomTypes.RoomUIMessage[]> {
  if (rows.length === 0) {
    return [];
  }

  const messages = await validateUIMessages<RoomTypes.RoomUIMessage>({
    messages: rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: JSON.parse(row.parts),
      metadata: {
        authorId: row.authorId,
        authorName: row.authorName,
        seq: row.seq,
        runId: row.runId,
        route: row.route ? JSON.parse(row.route) : null,
        usage: row.usage ? JSON.parse(row.usage) : null,
        replyTo: row.replyTo ? JSON.parse(row.replyTo) : null,
        rerunOf: row.rerunOf,
        triggerId: row.triggerId,
        createdAt: row.createdAt,
      },
    })),
    metadataSchema: roomMessageMetadata,
  });

  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => part.type === 'text' || part.type === 'file' || isToolUIPart(part)).map(roomMessagePart),
  }));
}
