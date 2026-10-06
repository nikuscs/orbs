import { log } from '@orbs/logger/server';
import { roomMessageText } from '#services/room/room.utils';
import { ROUTE_JEV } from './route.constants';
import { routePromptsApprovalQuestion, routePromptsScope } from './route.prompts';
import { routeRedact } from './route.utils';
import type { RouteApprovalState, RouteQueryApprovalParams, RouteServiceDeps } from '#/types/route.types';

export async function routeQueryApproval(deps: RouteServiceDeps, params: RouteQueryApprovalParams): Promise<boolean> {
  if (params.input.length > ROUTE_JEV.input) {
    return false;
  }

  const request = deps.database.all(deps.database.db
    .selectFrom('message')
    .select(['authorName', 'parts'])
    .where('roomId', '=', params.roomId)
    .where('role', '=', 'user')
    .where('reactionId', 'is', null)
    .orderBy('seq', 'desc')
    .limit(1)).at(0);

  const state: RouteApprovalState = {
    bot: { name: params.botName, scope: routePromptsScope({ name: params.botName, instructions: routeRedact(params.instructions) }, ROUTE_JEV.scope) },
    call: { tool: params.toolName, input: routeRedact(params.input) },
  };

  if (request) {
    state.request = { author: request.authorName, text: routeRedact(roomMessageText(request.parts)).slice(0, ROUTE_JEV.chars) };
  }

  try {
    const { answers } = await deps.jev.systemOne({ state: { ...state }, questions: { safe: routePromptsApprovalQuestion() } });

    return answers.safe.noul >= ROUTE_JEV.approval;
  } catch (error) {
    log.error({
      tag: 'route',
      message: 'Jev approval failed',
      roomId: params.roomId,
      error,
    });

    return false;
  }
}
