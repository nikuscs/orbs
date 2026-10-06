import { ROOM } from '#services/room/room.constants';
import { roomMentionHandle } from '#services/room/room.utils';
import { ROUTE_JEV, ROUTE_SECRET_VALUES, ROUTE_SECRETS } from './route.constants';
import type { Bot } from '#/types/bot.types';
import type { RoomMessageRoute } from '#/types/room.types';
import type { RouteResponder, RouteVerdict, RouteVerdictScores } from '#/types/route.types';

export function routeMentions(text: string, bots: Bot[]): Bot[] {
  return roomMentionHandle(`(?:${[...ROOM.everyoneHandles].join('|')})`).test(text) ? bots : routeHandleMentions(text, bots);
}

export function routeHandleMentions(text: string, bots: Bot[]): Bot[] {
  return bots
    .map((bot) => ({ bot, index: text.search(roomMentionHandle(bot.handle)) }))
    .filter((mention) => mention.index !== -1)
    .sort((left, right) => left.index - right.index)
    .map((mention) => mention.bot);
}

export function routePlainNames(text: string, bots: Bot[]): Bot[] {
  return bots.filter((bot) => new RegExp(String.raw`(?<![\p{L}\p{N}_@-])${bot.name.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`)}(?![\p{L}\p{N}_-])`, 'iu').test(text));
}

export function routeRedact(text: string): string {
  const keys = ROUTE_SECRETS.reduce((result, pattern) => result.replaceAll(pattern, '[redacted]'), text);

  return ROUTE_SECRET_VALUES.reduce((result, pattern) => result.replaceAll(pattern, '$<keep>[redacted]'), keys);
}

export function routeVerdict<T>(scores: RouteVerdictScores<T>): RouteVerdict<T> {
  const { asker, candidates, fit } = scores;

  if (scores.group >= ROUTE_JEV.group) {
    return { via: 'jev', responders: candidates, score: () => scores.group };
  }

  const routeFitOrAnswer = (bot: T) => (bot === asker ? Math.max(fit(bot), scores.answers) : fit(bot));
  const ranked = [...candidates].sort((left, right) => routeFitOrAnswer(right) - routeFitOrAnswer(left));
  const responders = ranked.filter((bot) => fit(bot) >= ROUTE_JEV.reply || (bot === asker && scores.answers >= ROUTE_JEV.answer));

  if (responders.length > 0) {
    return { via: 'jev', responders, score: routeFitOrAnswer };
  }

  const [winner, runnerUp] = ranked;
  const winnerMargin = winner ? routeFitOrAnswer(winner) - (runnerUp ? routeFitOrAnswer(runnerUp) : 0) : 0;

  if (winner && scores.expects >= ROUTE_JEV.needs && routeFitOrAnswer(winner) >= ROUTE_JEV.winner && winnerMargin >= ROUTE_JEV.margin) {
    return { via: 'jev', responders: [winner], score: routeFitOrAnswer };
  }

  return { via: scores.unowned >= ROUTE_JEV.needs ? 'lead' : 'none', responders: [], score: routeFitOrAnswer };
}

export function routePicks(bots: Bot[], score: (bot: Bot) => number | null): RoomMessageRoute['picks'] {
  return bots.map((bot) => ({ botId: bot.id, botName: bot.name, score: score(bot) }));
}

export function routeRequired(bots: Bot[]): RouteResponder[] {
  return bots.map((bot) => ({ bot, seat: 'required' }));
}
