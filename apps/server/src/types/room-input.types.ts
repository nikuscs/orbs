import { z } from 'zod';
import { routeDriverName } from './route-driver.types';

const roomBotIds = z.array(z.string().min(1)).min(1).max(8).transform((ids) => [...new Set(ids)]);

export const roomInputSendMode = z.enum(['queue', 'steer', 'interrupt']);
export type RoomInputSendMode = z.infer<typeof roomInputSendMode>;

export const roomInputCreate = z.object({
  name: z.string().trim().min(1).max(80),
  botIds: roomBotIds,
  description: z.string().trim().max(2000),
  driver: routeDriverName.nullable(),
  sendMode: roomInputSendMode,
});

export const roomInputUpdate = roomInputCreate.partial().extend({
  roomId: z.string().min(1),
});

export const roomInputDelete = z.object({
  roomId: z.string().min(1),
});
