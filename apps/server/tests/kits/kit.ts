import { createTestServices } from '../support/services';
import type { Services } from '#/types/services.types';
import type { TestD1 } from '../support/database';
import type { TestServicesOptions } from '../support/services';

export function defineKit<TKey extends keyof Services>(key: TKey) {
  return {
    bind(testD1: TestD1) {
      const create = (overrides: TestServicesOptions = {}) => createTestServices(testD1, overrides)[key];

      return Object.assign(create(), { override: create });
    },
  };
}
