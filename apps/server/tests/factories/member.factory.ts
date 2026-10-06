import { defineFactory } from './factory';

export const memberFactory = defineFactory('member', (n) => ({
  id: `member-${n}`,
  role: 'owner',
  createdAt: new Date().toISOString(),
}));
