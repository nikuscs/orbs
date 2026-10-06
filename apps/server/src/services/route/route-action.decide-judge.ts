import { log } from '@orbs/logger/server';
import { ROUTE_JUDGE } from './route.constants';
import { routePromptsJudgeInstructions, routePromptsJudgePrompt, routePromptsJudgeRetry } from './route.prompts';
import { routePicks, routeRequired } from './route.utils';
import type { Bot } from '#/types/bot.types';
import type * as RouteTypes from '#/types/route.types';

export async function routeActionDecideJudge(deps: RouteTypes.RouteDriverJudgeDeps, params: RouteTypes.RouteDecideParams): Promise<RouteTypes.RouteDecision> {
  function routeJudgeAsk(serviceDeps: RouteTypes.RouteDriverJudgeDeps, request: RouteTypes.RouteJudgeRequest): Promise<RouteTypes.RouteJudgeAnswer | null> {
    const daemon = serviceDeps.sockets.daemon();

    if (!daemon) {
      return Promise.resolve(null);
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        serviceDeps.requests.delete(requestId);
        resolve(null);
      }, ROUTE_JUDGE.timeoutMs);

      serviceDeps.requests.set(requestId, (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
      daemon.send({
        type: 'judge.decide',
        requestId,
        ...request,
      });
    });
  }

  function routeJudgePicked(answer: RouteTypes.RouteJudgeAnswer | null, candidates: Bot[]): Bot[] | null {
    const handles = answer?.handles;

    if (!handles || handles.some((handle) => !candidates.some((bot) => bot.handle === handle))) {
      return null;
    }

    return candidates.filter((bot) => handles.includes(bot.handle));
  }

  async function routeJudgeAttempt(
    serviceDeps: RouteTypes.RouteDriverJudgeDeps,
    request: RouteTypes.RouteJudgeRequest,
    bots: Bot[],
    attempt: number,
  ): Promise<RouteTypes.RouteJudgeDecided | null> {
    const answer = await routeJudgeAsk(serviceDeps, request);
    const picked = routeJudgePicked(answer, bots);
    const resume = answer?.resume ?? request.resume;

    if (picked && resume) {
      return { picked, resume };
    }

    if (attempt >= ROUTE_JUDGE.attempts) {
      return null;
    }

    const retry: RouteTypes.RouteJudgeRequest = {
      ...request,
      prompt: routePromptsJudgeRetry,
      resume,
    };

    return routeJudgeAttempt(serviceDeps, retry, bots, attempt + 1);
  }

  function routeJudgeTurn(serviceDeps: RouteTypes.RouteDriverJudgeDeps, input: RouteTypes.RouteDecideParams, judge: RouteTypes.RouteJudgeModel) {
    const { db } = serviceDeps.database;

    const latest = serviceDeps.database.all(db
      .selectFrom('message')
      .select(['seq', 'authorName', 'parts', 'replyTo'])
      .where('id', '=', input.message.id)).at(0);

    if (!latest) {
      return null;
    }

    const session = serviceDeps.database.all(db
      .selectFrom('judge')
      .select(['harnessId', 'resume', 'contextThrough'])
      .where('roomId', '=', input.message.roomId)).at(0);

    const resumed = session?.harnessId === judge.harnessId ? session : undefined;

    const context = serviceDeps.database.all(db
      .selectFrom('message')
      .select(['authorName', 'parts', 'replyTo'])
      .where('roomId', '=', input.message.roomId)
      .where('reactionId', 'is', null)
      .where('seq', '>', resumed?.contextThrough ?? 0)
      .where('seq', '<', latest.seq)
      .orderBy('seq', 'desc')
      .limit(ROUTE_JUDGE.context)).reverse();

    const description = serviceDeps.database.all(db
      .selectFrom('room')
      .select('description')
      .where('id', '=', input.message.roomId)).at(0)?.description ?? '';

    const request: RouteTypes.RouteJudgeRequest = {
      roomId: input.message.roomId,
      ...judge,
      instructions: routePromptsJudgeInstructions(input.candidates, input.leader, description),
      prompt: routePromptsJudgePrompt(context, latest),
      handles: input.candidates.map((bot) => bot.handle),
      resume: resumed?.resume ?? null,
    };

    return { request, through: latest.seq };
  }

  function routeJudgeSave(serviceDeps: RouteTypes.RouteDriverJudgeDeps, roomId: string, harnessId: string, resume: string, through: number): void {
    const updatedAt = new Date().toISOString();

    serviceDeps.database.run(serviceDeps.database.db
      .insertInto('judge')
      .values({
        roomId,
        harnessId,
        resume,
        contextThrough: through,
        updatedAt,
      })
      .onConflict((conflict) => conflict.column('roomId').doUpdateSet({
        harnessId,
        resume,
        contextThrough: through,
        updatedAt,
      })));
  }

  async function routeJudgeRoute(
    serviceDeps: RouteTypes.RouteDriverJudgeDeps,
    input: RouteTypes.RouteDecideParams,
    judge: RouteTypes.RouteJudgeModel,
  ): Promise<RouteTypes.RouteDecision> {
    const turn = routeJudgeTurn(serviceDeps, input, judge);
    const decided = turn ? await routeJudgeAttempt(serviceDeps, turn.request, input.candidates, 1) : null;

    if (!turn || !decided) {
      log.warn({
        tag: 'route',
        message: 'judge gave no answer, Jev routes',
        roomId: input.message.roomId,
      });

      return serviceDeps.fallback.decide(input);
    }

    routeJudgeSave(serviceDeps, input.message.roomId, judge.harnessId, decided.resume, turn.through);

    return {
      responders: routeRequired(decided.picked),
      route: { via: decided.picked.length > 0 ? 'judge' : 'none', picks: routePicks(decided.picked, () => null) },
    };
  }

  const { message, mentioned, quoted, judge } = params;

  if (mentioned.length > 0) {
    const quotedThenMentioned = [...quoted, ...mentioned.filter((bot) => !quoted.includes(bot))];

    return Promise.resolve({ responders: routeRequired(quotedThenMentioned), route: { via: 'mention', picks: routePicks(quotedThenMentioned, () => null) } });
  }

  if (quoted.length > 0) {
    return Promise.resolve({ responders: routeRequired(quoted), route: { via: 'reply', picks: routePicks(quoted, () => null) } });
  }

  if (message.role === 'assistant') {
    return Promise.resolve({ responders: [], route: { via: 'none', picks: [] } });
  }

  if (!judge) {
    return deps.fallback.decide(params);
  }

  try {
    return await routeJudgeRoute(deps, params, judge);
  } catch (error) {
    log.error({
      tag: 'route',
      message: 'judge routing failed, Jev routes',
      roomId: message.roomId,
      error,
    });

    return deps.fallback.decide(params);
  }
}
