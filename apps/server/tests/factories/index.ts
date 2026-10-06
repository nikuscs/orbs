import { createSequence } from './factory';
import { memberFactory } from './member.factory';
import { organizationFactory } from './organization.factory';
import { userFactory } from './user.factory';
import type { Database } from '#/types/database.types';

export const factories = {
  bind(database: Database) {
    const sequence = createSequence();

    return {
      organization: organizationFactory.bind(database, sequence),
      user: userFactory.bind(database, sequence),
      member: memberFactory.bind(database, sequence),
    };
  },
};

export type BoundFactories = ReturnType<typeof factories.bind>;
