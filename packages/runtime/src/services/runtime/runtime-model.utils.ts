import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { runtimeModelRoute } from '../../types/runtime-model.types';
import { runtimeModelStream, runtimeModelStreamFailure } from './runtime-model-stream.utils';
import { runtimeModelTrace } from './runtime-model-trace.utils';
import { RUNTIME_FALLBACK_PROVIDER, RUNTIME_MAX_MODEL_REQUESTS } from './runtime.constants';
import type { RuntimeBotParams } from '../../types/runtime.types';
import type { Models } from '@earendil-works/pi-ai/models';
import type { ModelRef } from '@earendil-works/pi-durable';

export function runtimeModelRef(bot: RuntimeBotParams): ModelRef {
  return match(bot.fallbackModel)
    .with(P.nonNullable, (fallback) => ({
      provider: RUNTIME_FALLBACK_PROVIDER,
      modelId: JSON.stringify({
        primary: { modelProvider: bot.modelProvider, modelId: bot.modelId, thinkingLevel: bot.thinkingLevel },
        fallback,
      }),
    }))
    .otherwise(() => ({ provider: bot.modelProvider, modelId: bot.modelId }));
}

export function runtimeModels(source: Models): Models {
  const tracedStream = runtimeModelTrace(source.streamSimple.bind(source));

  const models = new Proxy(source, {
    get: (target, property) => match(property)
      .with('streamSimple', () => tracedStream)
      .otherwise(() => {
        // SAFETY: this Proxy only wraps a Models object, so every property it is asked for is read from that Models target.
        const value = target[property as keyof Models];
        return match(value).with(P.instanceOf(Function), (method) => method.bind(target)).otherwise(() => value);
      }),
  });

  const runtimeModelGet: Models['getModel'] = (provider, id) => match(provider)
    .with(RUNTIME_FALLBACK_PROVIDER, () => {
      return match(runtimeModelParse(id)).with(P.nonNullable, (route) => {
        const primary = models.getModel(route.primary.modelProvider, route.primary.modelId);
        const fallback = models.getModel(route.fallback.modelProvider, route.fallback.modelId);

        return match(primary ?? fallback)
          .with(P.nonNullable, (model) => ({
            ...model,
            provider,
            id,
            contextWindow: Math.min(primary?.contextWindow ?? model.contextWindow, fallback?.contextWindow ?? model.contextWindow),
          }))
          .otherwise(() => undefined);
      }).otherwise(() => undefined);
    })
    .otherwise(() => models.getModel(provider, id));

  const runtimeModelRoutedStream: Models['streamSimple'] = (model, context, options) => match(model.provider)
    .with(RUNTIME_FALLBACK_PROVIDER, () => runtimeModelStream(models, {
      route: runtimeModelRoute.parse(JSON.parse(model.id)),
      context,
      options,
    }))
    .otherwise(() => models.streamSimple(model, context, options));

  const streamSimple = runtimeModelLimit(runtimeModelRoutedStream, RUNTIME_MAX_MODEL_REQUESTS);

  const runtimeModelComplete: Models['completeSimple'] = (model, context, options) => streamSimple(model, context, options).result();

  const runtimeModelFetchDeferred: Models['fetchDeferred'] = (model, handle, options) => models.fetchDeferred(
    models.getModel(handle.provider, handle.modelId) ?? model, handle, options,
  );

  const runtimeModelCancelDeferred: Models['cancelDeferred'] = (model, handle, options) => models.cancelDeferred(
    models.getModel(handle.provider, handle.modelId) ?? model, handle, options,
  );

  return new Proxy(models, {
    get: (target, property) => match(property)
      .with('getModel', () => runtimeModelGet)
      .with('streamSimple', () => streamSimple)
      .with('completeSimple', () => runtimeModelComplete)
      .with('fetchDeferred', () => runtimeModelFetchDeferred)
      .with('cancelDeferred', () => runtimeModelCancelDeferred)
      .otherwise(() => {
        // SAFETY: this Proxy only wraps a Models object, so every property it is asked for is read from that Models target.
        const value = target[property as keyof Models];
        return match(value).with(P.instanceOf(Function), (method) => method.bind(target)).otherwise(() => value);
      }),
  });
}

function runtimeModelLimit(stream: Models['streamSimple'], maxRequests: number): Models['streamSimple'] {
  let active = 0;
  const waiting: (() => void)[] = [];

  const runtimeModelRelease = () => match(waiting.shift())
    .with(P.nonNullable, (next) => next())
    .otherwise(() => {
      active -= 1;
    });

  const runtimeModelAcquire = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    match({ isAborted: signal?.aborted === true, hasSlot: active < maxRequests })
      .with({ isAborted: true }, () => reject(new Errors.INTERNAL_ERROR({ internal: 'Model request aborted.' })))
      .with({ hasSlot: true }, () => {
        active += 1;
        resolve();
      })
      .otherwise(() => {
        const runtimeModelStart = () => {
          signal?.removeEventListener('abort', runtimeModelCancel);
          resolve();
        };

        const runtimeModelCancel = () => {
          waiting.splice(waiting.indexOf(runtimeModelStart), 1);
          reject(new Errors.INTERNAL_ERROR({ internal: 'Model request aborted.' }));
        };

        waiting.push(runtimeModelStart);
        signal?.addEventListener('abort', runtimeModelCancel, { once: true });
      });
  });

  return (model, context, options) => {
    const output = createAssistantMessageEventStream();

    const runtimeModelRun = async () => {
      await runtimeModelAcquire(options?.signal);

      try {
        for await (const event of stream(model, context, options)) {
          output.push(event);
        }
      } finally {
        runtimeModelRelease();
      }
    };

    void runtimeModelRun().catch(() => {
      output.push(runtimeModelStreamFailure({
        api: model.api,
        provider: model.provider,
        model: model.id,
      }, options));
    });

    return output;
  };
}

function runtimeModelParse(id: string) {
  try {
    return runtimeModelRoute.parse(JSON.parse(id));
  } catch {
    return undefined;
  }
}
