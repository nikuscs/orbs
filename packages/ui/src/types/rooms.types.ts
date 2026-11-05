import type { Bot } from '@repo/contracts/universal';

export interface RoomsPairLinkParams {
  sender: Pick<Bot, 'handle'>;
  peer: Pick<Bot, 'handle'>;
  conversationId: number;
}

export type RoomsDetailsPage = 'todos' | 'routines' | 'media';
