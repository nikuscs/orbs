import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { PROVIDER } from './provider.constants';
import type * as ProviderTypes from '../../types/provider.types';
import type { AuthEvent, AuthPrompt } from '@earendil-works/pi-ai';
import type * as UniversalTypes from '@repo/contracts/universal';

export function providerLoginCommand(providerId: string) {
  return match(providerId)
    .with(PROVIDER.claudeCode.providerId, () => PROVIDER.claudeCode.loginCommand)
    .otherwise(() => undefined);
}

export function providerSweep({ sessions }: ProviderTypes.ProviderServiceDeps) {
  const now = Date.now();

  for (const [id, session] of sessions) {
    match(now >= session.expiresAt)
      .with(true, () => {
        providerAbort(session);
        sessions.delete(id);
      })
      .with(false, () => undefined)
      .exhaustive();
  }
}

export function providerPruneTerminal({ sessions }: ProviderTypes.ProviderServiceDeps) {
  const count = Math.max(0, sessions.size - PROVIDER.maxRetainedSessions + 1);
  const terminal = [...sessions].filter(([, session]) => session.status !== 'pending').slice(0, count);

  for (const [id, session] of terminal) {
    clearTimeout(session.timeout);
    sessions.delete(id);
  }
}

export function providerIsCurrent(session: ProviderTypes.ProviderLoginRecord) {
  return Date.now() < session.expiresAt;
}

export function providerAbort(session: ProviderTypes.ProviderLoginRecord) {
  match(session.status)
    .with('pending', () => {
      session.status = 'cancelled';
      session.prompt = undefined;
      session.pending?.reject(new Errors.CONFLICT({ internal: 'Login cancelled' }));
      session.pending = undefined;
      clearTimeout(session.timeout);
      match(session.abort.signal.aborted)
        .with(false, () => session.abort.abort())
        .with(true, () => undefined)
        .exhaustive();
    })
    .otherwise(() => {
      clearTimeout(session.timeout);
    });
}

export function providerFinish(
  session: ProviderTypes.ProviderLoginRecord,
  status: Exclude<UniversalTypes.ProviderSession['status'], 'pending'>,
) {
  match(session.status)
    .with('pending', () => {
      session.status = status;
      session.prompt = undefined;
      session.pending?.reject(new Errors.CONFLICT({ internal: 'Login cancelled' }));
      session.pending = undefined;
      clearTimeout(session.timeout);
      match({ status, aborted: session.abort.signal.aborted })
        .with({ status: 'cancelled', aborted: false }, () => session.abort.abort())
        .otherwise(() => undefined);
    })
    .otherwise(() => undefined);
}

export async function providerClose(deps: ProviderTypes.ProviderServiceDeps) {
  const sessions = [...deps.sessions.values()];
  deps.sessions.clear();

  for (const session of sessions) {
    providerAbort(session);
  }

  await Promise.all(sessions.map(async (session) => session.done.catch(() => undefined)));
}

export function providerRetryAfterSeconds(deps: ProviderTypes.ProviderServiceDeps) {
  const pending = [...deps.sessions.values()].filter((session) => session.status === 'pending' && providerIsCurrent(session));

  return match(pending.length)
    .with(0, () => Math.ceil(PROVIDER.sessionTimeoutMs / 1000))
    .otherwise(() => Math.max(1, Math.ceil((Math.min(...pending.map((session) => session.expiresAt)) - Date.now()) / 1000)));
}

export function providerOwnedSession(deps: ProviderTypes.ProviderServiceDeps, params: ProviderTypes.ProviderSessionParams) {
  const session = providerSessionRecord(deps, params.id);

  return match(session.deviceId === params.deviceId)
    .with(true, () => session)
    .with(false, () => {
      throw new Errors.FORBIDDEN();
    })
    .exhaustive();
}

function providerSessionRecord({ sessions }: ProviderTypes.ProviderServiceDeps, id: string) {
  return match(sessions.get(id))
    .with(P.nonNullable, (session) => session)
    .otherwise(() => {
      throw new Errors.NOT_FOUND({ resource: 'session', resourceId: id });
    });
}

export function providerDeviceSession(deps: ProviderTypes.ProviderServiceDeps, { deviceId }: ProviderTypes.ProviderListParams) {
  const owned = [...deps.sessions.values()].filter((session) => session.deviceId === deviceId && providerIsCurrent(session)).reverse();

  return match(owned.length)
    .with(0, () => null)
    .otherwise(() => owned.find((session) => session.status === 'pending') ?? owned[0]);
}

export function providerPushEvent(session: ProviderTypes.ProviderLoginRecord, event: AuthEvent) {
  match(session.status)
    .with('pending', () => {
      session.events.push(providerEventView(event));
      match(session.events.length > PROVIDER.maxEvents)
        .with(true, () => {
          session.events.splice(0, session.events.length - PROVIDER.maxEvents);
        })
        .with(false, () => undefined)
        .exhaustive();
    })
    .otherwise(() => undefined);
}

export function providerSessionView(session: ProviderTypes.ProviderLoginRecord): UniversalTypes.ProviderSession {
  return {
    id: session.id,
    providerId: session.providerId,
    authType: session.authType,
    status: session.status,
    expiresAt: session.expiresAt,
    events: session.events.map((event) => ({ ...event })),
    ...match(session.prompt)
      .with(P.nonNullable, (prompt) => ({ prompt: providerCopyPrompt(prompt) }))
      .otherwise(() => ({})),
    ...match(session.error)
      .with(P.string, (error) => ({ error }))
      .otherwise(() => ({})),
  };
}

export function providerPromptView(id: string, prompt: AuthPrompt): UniversalTypes.ProviderPrompt {
  return match(prompt)
    .with({ type: 'select' }, ({ type, message, options }) => ({
      id,
      type,
      message,
      options: options.map(({ id: optionId, label, description }) => ({ id: optionId, label, description })),
    }))
    .with({ type: P.union('text', 'secret', 'manual_code') }, ({ type, message, placeholder }) => ({
      id,
      type,
      message,
      placeholder,
    }))
    .exhaustive();
}

function providerEventView(event: AuthEvent): UniversalTypes.ProviderEvent {
  return match(event)
    .with({ type: 'info' }, ({ type, message, links }) => ({
      type,
      message,
      ...match(links)
        .with(P.nonNullable, (value) => ({
          links: value.map(({ url, label }) => ({ url, label })),
        }))
        .otherwise(() => ({})),
    }))
    .with({ type: 'auth_url' }, ({ type, url, instructions }) => ({ type, url, instructions }))
    .with({ type: 'device_code' }, ({
      type,
      userCode,
      verificationUri,
      intervalSeconds,
      expiresInSeconds,
    }) => ({
      type,
      userCode,
      verificationUri,
      intervalSeconds,
      expiresInSeconds,
    }))
    .with({ type: 'progress' }, ({ type, message }) => ({ type, message }))
    .exhaustive();
}

function providerCopyPrompt(prompt: UniversalTypes.ProviderPrompt): UniversalTypes.ProviderPrompt {
  return match(prompt)
    .with({ type: 'select' }, (value) => ({
      ...value,
      options: value.options.map((option) => ({ ...option })),
    }))
    .otherwise((value) => ({ ...value }));
}
