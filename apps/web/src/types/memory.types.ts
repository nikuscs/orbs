import type { rpc } from '@/services/rpc/rpc.client';

export type MemoryFact = Awaited<ReturnType<typeof rpc.memory.list.call>>['items'][number];
