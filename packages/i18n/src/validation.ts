import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { m } from './paraglide/messages.js';

type ZodRawIssue = z.core.$ZodRawIssue
type ValidationParams = Record<string, string | number>

const numericOrigin = P.union('number', 'int');

function issueToKey(issue: ZodRawIssue): string | undefined {
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

/**
 * Boot Zod's global error map to return i18n keys instead of English messages.
 * Call once at app startup.
 *
 * ```ts
 * bootZodErrors()
 * ```
 */
export function bootZodErrors() {
  z.config({
    customError: issueToKey,
  });
}

export function deriveLabel(name: string): string {
  return name
    .replace(/Id$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function validationMessage(key: string, params: ValidationParams): string {
  const p = {
    field: Object.hasOwn(params, 'field') ? String(params.field) : '',
    minimum: Object.hasOwn(params, 'minimum') ? String(params.minimum) : '',
  };

  return match(key)
    .with('validation_required', () => m.validation_required(p))
    .with('validation_number', () => m.validation_number(p))
    .with('validation_email', () => m.validation_email())
    .with('validation_handle', () => m.validation_handle())
    .with('validation_pick_one', () => m.validation_pick_one())
    .with(P.union('invalid_format', 'validation_invalid_format'), () => m.validation_invalid_format())
    .with('validation_already_taken', () => m.validation_already_taken())
    .with('validation_must_be_positive', () => m.validation_must_be_positive())
    .with('validation_must_be_positive_integer', () => m.validation_must_be_positive_integer())
    .with('validation_payment_amount_minimum', () => m.validation_payment_amount_minimum(p))
    .with('validation_file_size', () => m.validation_file_size())
    .with('validation_file_type', () => m.validation_file_type())
    .with('validation_judge_model', () => m.validation_judge_model())
    .otherwise(() => key);
}

/**
 * Expand an i18n validation key into a translated message.
 *
 * If the key is recognized, returns the translated string with the field label interpolated.
 * If not recognized, returns the key as-is (it's likely already a human-readable message).
 */
export function expandValidationError(key: string, params: Record<string, string>): string {
  return validationMessage(key, params);
}

/**
 * Resolve a validation message key to a human-readable string.
 * Looks up `validation_{key}` in the i18n bundle, falls back to humanizing the snake_case key.
 */
export function resolveValidationMessage(message: string, args?: Record<string, string | number>): string {
  const key = message.startsWith('validation_') ? message : `validation_${message}`;
  const resolved = validationMessage(key, args ?? {});

  return resolved === key ? message.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : resolved;
}
