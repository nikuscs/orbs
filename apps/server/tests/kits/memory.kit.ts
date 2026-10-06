import { makeMemoryService } from '#services/memory/memory.service';
import type { TestD1 } from '../support/database';

export function createMemoryKit(testD1: TestD1) {
  return makeMemoryService({ database: testD1.database });
}
