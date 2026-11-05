import { match, P } from 'ts-pattern';
// oxlint-disable-next-line arch/schemas-local -- bootZodErrors sets zod's global error map for hosts to call at startup; it builds no schema
import { config } from 'zod';
import { m } from './paraglide/messages.js';
import type { core } from 'zod';

const numericOrigin = P.union('number', 'int');

function issueToKey(issue: core.$ZodRawIssue): string | undefined {
  return match(issue)
    .with({ code: 'invalid_type', expected: P.union('number', 'int') }, () => 'validation_number')
    .with({ code: 'too_small', origin: numericOrigin }, () => 'validation_number')
    .with({ code: 'too_big', origin: numericOrigin }, () => 'validation_number')
    .with({ code: 'not_multiple_of' }, () => 'validation_number')
    .with({
      code: 'too_small',
      origin: 'string',
      minimum: 1,
      inclusive: true,
    }, () => 'validation_required')
    .with({
      code: 'too_small',
      origin: 'array',
      minimum: 1,
    }, () => 'validation_pick_one')
    .with({ code: 'invalid_format', format: 'email' }, () => 'validation_email')
    .otherwise(() => undefined);
}

export function bootZodErrors() {
  // oxlint-disable-next-line arch/schemas-local -- bootZodErrors sets zod's global error map for hosts to call at startup; it builds no schema
  config({
    customError: issueToKey,
  });
}

export function deriveLabel(name: string): string {
  return name
    .replace(/Id$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export function expandValidationError(key: string, params: Record<string, string | number>): string {
  const p = {
    field: Object.hasOwn(params, 'field') ? String(params.field) : '',
    minimum: Object.hasOwn(params, 'minimum') ? String(params.minimum) : '',
  };

  return match(key)
    .with('validation_backup_manifest', () => m.validation_backup_manifest())
    .with('validation_backup_checksum', () => m.validation_backup_checksum())
    .with('validation_oauth', () => m.validation_oauth())
    .with('validation_provider_login_unsupported', () => m.validation_provider_login_unsupported())
    .with('validation_required', () => m.validation_required(p))
    .with('validation_number', () => m.validation_number(p))
    .with('validation_email', () => m.validation_email())
    .with('validation_handle', () => m.validation_handle())
    .with('validation_pick_one', () => m.validation_pick_one())
    .with('validation_already_taken', () => m.validation_already_taken())
    .with('validation_file_size', () => m.validation_file_size())
    .with('validation_file_type', () => m.validation_file_type())
    .with('validation_artifact_spec', () => m.validation_artifact_spec())
    .with('validation_mcp_secret_missing', () => m.validation_mcp_secret_missing())
    .with('validation_mcp_secret_host', () => m.validation_mcp_secret_host())
    .with('validation_routine_schedule', () => m.validation_routine_schedule())
    .otherwise(() => key);
}

export function resolveValidationMessage(message: string, args?: Record<string, string | number>): string {
  const key = message.startsWith('validation_') ? message : `validation_${message}`;
  const resolved = expandValidationError(key, args ?? {});

  return resolved === key ? message.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : resolved;
}
