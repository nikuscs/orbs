import { test as base } from 'vitest';
import { createTestD1 } from './support/database';
import type { Database } from '#/types/database.types';
import type { BoundFactories } from './factories';
import type { BoundScenarios } from './scenarios';
import type { TestD1 } from './support/database';

interface TestFixtures {
  testD1: TestD1;
  db: Database['db'];
  make: BoundFactories;
  scenarios: BoundScenarios;
}

const test = base.extend<TestFixtures>({
  testD1: async ({ task }, provide) => {
    void task;
    const testD1 = createTestD1();
    await provide(testD1);
    testD1.close();
  },
  db: async ({ testD1 }, provide) => {
    await provide(testD1.database.db);
  },
  make: async ({ testD1 }, provide) => {
    const { factories } = await import('./factories');

    await provide(factories.bind(testD1.database));
  },
  scenarios: async ({ make }, provide) => {
    const { scenarios } = await import('./scenarios');

    await provide(scenarios.bind(make));
  },
});

export function createKitTest<TKits extends object>(bind: (testD1: TestD1) => TKits) {
  return test.extend<{ kit: TKits }>({
    kit: async ({ testD1 }, provide) => {
      await provide(bind(testD1));
    },
  });
}
