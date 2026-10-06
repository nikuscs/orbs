import { log } from '@orbs/logger/server';
import { memoryExtractionContext } from '#/types/memory-extraction.types';
import { MEMORY } from '#services/memory/memory.constants';
import { ROUTE_JEV } from './route.constants';
import { routePromptsMemoryQuestion } from './route.prompts';
import type { RouteQueryMemoryParams, RouteServiceDeps } from '#/types/route.types';

export async function routeQueryMemory(deps: RouteServiceDeps, params: RouteQueryMemoryParams): Promise<boolean> {
  const input = memoryExtractionContext.parse(JSON.parse(params.prompt));
  const latest = input.sources.filter((source) => source.role === 'user');

  if (!latest.length) {
    return false;
  }

  const state = { latest: latest.map(({ authorId, text }) => ({ authorId, text })), context: input.context.slice(0, 0) };

  if (JSON.stringify(state).length > ROUTE_JEV.input) {
    log.info({ tag: 'memory', message: 'Memory batch exceeds Jev budget; using full model extraction' });
    return true;
  }

  for (const message of input.context.slice().reverse()) {
    const remaining = ROUTE_JEV.input - JSON.stringify({ ...state, context: [{ ...message, text: '' }, ...state.context] }).length;

    if (remaining <= 0) {
      break;
    }

    const context = { ...message, text: message.text.slice(0, Math.min(remaining, ROUTE_JEV.chars)) };
    state.context.unshift(context);
    if (JSON.stringify(state).length > ROUTE_JEV.input) {
      state.context.shift();
    }
  }

  try {
    const { answers } = await deps.jev.systemOne({ state, questions: { useful: routePromptsMemoryQuestion() } });
    return answers.useful.noul >= MEMORY.jevThreshold;
  } catch (error) {
    log.warn({
      tag: 'memory',
      message: 'Jev unavailable; using model extraction for this batch',
      error,
    });
    return true;
  }
}
