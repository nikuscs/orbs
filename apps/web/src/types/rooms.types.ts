import type { RoomUIMessage, RoomUploadResult } from '@orbs/server/client';

export interface RoomsDraftWithoutPassParams {
  draft: RoomUIMessage | undefined;
}

export type RoomsFilePart = Extract<RoomUIMessage['parts'][number], { type: 'file' }>;

export interface RoomsAttachment extends Pick<RoomUploadResult, 'name' | 'mediaType'> {
  key: string;
  id: RoomUploadResult['id'] | null;
  preview: string;
  status: 'uploading' | 'ready' | 'failed';
}

export interface RoomsAttachmentsState {
  roomId: string;
  items: RoomsAttachment[];
}

export interface RoomsBlindBotsParams {
  error: Error | undefined;
}
