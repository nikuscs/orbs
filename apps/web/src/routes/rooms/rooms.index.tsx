import { createFileRoute } from '@tanstack/react-router';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { roomIndexSearch } from '@orbs/server/client';

export const Route = createFileRoute('/_chat/rooms/')({
  validateSearch: roomIndexSearch,
  component: RoomsPage,
});
