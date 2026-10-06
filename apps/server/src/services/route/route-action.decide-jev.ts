import { log } from '@orbs/logger/server';
import { roomMessageReply } from '#/types/room.types';
import { roomMessageText } from '#services/room/room.utils';
import { ROUTE_JEV, ROUTE_QUESTION } from './route.constants';
import { routePromptsAbsentQuestion, routePromptsAnswerQuestion, routePromptsBotQuestion, routePromptsGroupQuestion, routePromptsHandoffQuestion, routePromptsNeedsReplyQuestion, routePromptsScope } from './route.prompts';
import { routePicks, routePlainNames, routeRedact, routeRequired, routeVerdict } from './route.utils';
import type { Bot } from '#/types/bot.types';
import type * as RouteTypes from '#/types/route.types';

export async function routeActionDecideJev(deps: RouteTypes.RouteDriverJevDeps, params: RouteTypes.RouteDecideParams): Promise<RouteTypes.RouteDecision> {
  async function routeJevScore(
    serviceDeps: RouteTypes.RouteDriverJevDeps,
    message: RouteTypes.RouteMessage,
    candidates: Bot[],
    members: Bot[],
    owner: Bot | undefined,
  ): Promise<RouteTypes.RouteDecision> {
    const recent = serviceDeps.database.all(serviceDeps.database.db
      .selectFrom('message')
      .select(['authorId', 'authorName', 'role', 'parts', 'replyTo'])
      .where('roomId', '=', message.roomId)
      .where('id', '!=', message.id)
      .orderBy('seq', 'desc')
      .limit(ROUTE_JEV.context)).reverse();

    const botQuestions = candidates.map((bot) => [bot.id, routePromptsBotQuestion(bot)] as const);
    const replyQuestions = message.role === 'user' ? [[ROUTE_QUESTION.needs, routePromptsNeedsReplyQuestion()] as const, [ROUTE_QUESTION.absent, routePromptsAbsentQuestion()] as const] : [[ROUTE_QUESTION.handoff, routePromptsHandoffQuestion()] as const];
    const previous = recent.at(-1);
    const asker = message.role === 'user' && previous?.role === 'assistant' ? candidates.find((bot) => bot.id === previous.authorId) : undefined;
    const answerQuestions = asker ? [[ROUTE_QUESTION.answers, routePromptsAnswerQuestion(asker)] as const] : [];
    const groupQuestions = message.role === 'user' && candidates.length > 1 ? [[ROUTE_QUESTION.group, routePromptsGroupQuestion()] as const] : [];

    const originatingHumanRequest = message.role === 'assistant' ? serviceDeps.database.all(serviceDeps.database.db
      .selectFrom('message')
      .select(['authorName', 'parts'])
      .where('roomId', '=', message.roomId)
      .where('role', '=', 'user')
      .where('reactionId', 'is', null)
      .orderBy('seq', 'desc')
      .limit(1)).at(0) : undefined;

    const state: RouteTypes.RouteJevState = {
      members: members.map((bot) => ({ name: bot.name, scope: routePromptsScope({ ...bot, instructions: routeRedact(bot.instructions) }, ROUTE_JEV.scope) })),
      recent: recent.map((item) => {
        const reply = roomMessageReply.safeParse(JSON.parse(item.replyTo ?? 'null'));

        return {
          author: item.authorName,
          from: item.role === 'user' ? 'human' : 'bot',
          replyingTo: reply.success ? reply.data.authorName : null,
          text: routeRedact(roomMessageText(item.parts)).slice(0, ROUTE_JEV.chars),
        };
      }),
      latest: { author: message.authorName, from: message.role === 'user' ? 'human' : 'bot', text: routeRedact(message.text).slice(0, ROUTE_JEV.chars) },
    };

    const room = serviceDeps.database.all(serviceDeps.database.db
      .selectFrom('room')
      .select('description')
      .where('id', '=', message.roomId)).at(0);

    if (room?.description) {
      state.room = { description: routeRedact(room.description).slice(0, ROUTE_JEV.chars) };
    }

    if (originatingHumanRequest) {
      state.request = {
        author: originatingHumanRequest.authorName,
        text: routeRedact(roomMessageText(originatingHumanRequest.parts)).slice(0, ROUTE_JEV.chars),
      };
    }

    try {
      const questions = Object.fromEntries([...botQuestions, ...replyQuestions, ...answerQuestions, ...groupQuestions]);
      const { answers } = await serviceDeps.jev.systemOne({ state: { ...state }, questions });

      const verdict = routeVerdict({
        candidates,
        fit: (bot) => answers[bot.id].noul,
        group: groupQuestions.length > 0 ? answers[ROUTE_QUESTION.group].noul : 0,
        asker,
        answers: asker ? answers[ROUTE_QUESTION.answers].noul : 0,
        expects: answers[message.role === 'user' ? ROUTE_QUESTION.needs : ROUTE_QUESTION.handoff].noul,
        unowned: message.role === 'user' ? Math.max(answers[ROUTE_QUESTION.needs].noul, answers[ROUTE_QUESTION.absent].noul) : 0,
      });

      if (verdict.via === 'jev') {
        return { responders: routeRequired(verdict.responders), route: { via: 'jev', picks: routePicks(verdict.responders, verdict.score) } };
      }

      if (owner && verdict.via === 'lead') {
        return { responders: routeRequired([owner]), route: { via: 'lead', picks: routePicks([owner], verdict.score) } };
      }

      return { responders: [], route: { via: 'none', picks: [] } };
    } catch (error) {
      log.error({
        tag: 'route',
        message: 'Jev routing failed',
        roomId: message.roomId,
        error,
      });

      const first = owner ? [owner] : candidates.slice(0, 1);
      const answerDespiteJevError = message.role === 'user' ? first : [];

      return { responders: routeRequired(answerDespiteJevError), route: { via: 'error', picks: routePicks(answerDespiteJevError, () => null) } };
    }
  }

  const { message, members, candidates, mentioned, quoted, leader } = params;

  if (mentioned.length > 0) {
    const quotedThenMentioned = [...quoted, ...mentioned.filter((bot) => !quoted.includes(bot))];
    const spoken = message.role === 'user' ? routePlainNames(message.text, candidates.filter((bot) => !quotedThenMentioned.includes(bot))) : [];
    const scored = spoken.length > 0 ? await routeJevScore(deps, message, spoken, members, undefined) : undefined;
    const named = scored?.route.via === 'jev' ? scored : undefined;

    return {
      responders: [...routeRequired(quotedThenMentioned), ...(named?.responders ?? [])],
      route: { via: 'mention', picks: [...routePicks(quotedThenMentioned, () => null), ...(named?.route.picks ?? [])] },
    };
  }

  if (quoted.length > 0) {
    return { responders: routeRequired(quoted), route: { via: 'reply', picks: routePicks(quoted, () => null) } };
  }

  return routeJevScore(deps, message, candidates, members, leader);
}
