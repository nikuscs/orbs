import { defineFactory } from './factory';

export const userFactory = defineFactory('user', (n) => ({
  id: `user-${n}`,
  name: `User ${n}`,
  email: `user-${n}@example.test`,
  emailVerified: 1,
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  role: 'user',
  banned: 0,
  banReason: null,
  banExpires: null,
  username: null,
  displayUsername: null,
}));
