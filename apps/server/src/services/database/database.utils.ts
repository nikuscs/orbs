import { log } from '@orbs/logger/server';
import type { LogEvent } from 'kysely';

export function databaseLogQuery(event: LogEvent): void {
  if (event.level === 'error') {
    log.error({
      tag: 'database',
      message: 'Query failed',
      sql: event.query.sql,
      error: event.error,
    });

    return;
  }

  log.debug({
    tag: 'database',
    message: 'Query',
    sql: event.query.sql,
    durationMs: event.queryDurationMillis,
  });
}
