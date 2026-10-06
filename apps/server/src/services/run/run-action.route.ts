import { roomMessageReply } from '#/types/room.types';
import { roomMessageFiles, roomMessageText } from '#services/room/room.utils';
import { ROUTE } from '#services/route/route.constants';
import { STORAGE } from '#services/storage/storage.constants';
import { runActionArm } from './run-action.arm';
import { runActionQueue } from './run-action.queue';
import type { RunActionRouteParams, RunServiceDeps } from '#/types/run.types';

export async function runActionRoute(deps: RunServiceDeps, params: RunActionRouteParams): Promise<void> {
  const { db } = deps.database;

  const message = deps.database.all(db
    .selectFrom('message')
    .leftJoin('run', 'run.id', 'message.runId')
    .leftJoin('reaction', 'reaction.id', 'message.reactionId')
    .leftJoin('message as target', 'target.id', 'reaction.targetId')
    .select(['message.id', 'message.roomId', 'message.role', 'message.authorId', 'message.authorName', 'message.parts', 'message.replyTo', 'run.hop', 'target.authorId as reactionAuthorId'])
    .where('message.id', '=', params.messageId)).at(0);

  if (!message) {
    return;
  }

  deps.database.run(db
    .insertInto('routing')
    .values({ messageId: message.id, dueAt: Date.now() + ROUTE.retryMs })
    .onConflict((conflict) => conflict.column('messageId').doUpdateSet({ dueAt: Date.now() + ROUTE.retryMs })));
  runActionArm(deps);

  if (deps.routing.has(message.id)) {
    return;
  }

  deps.routing.add(message.id);

  const hop = message.hop ?? 0;
  const replySnapshot = roomMessageReply.safeParse(JSON.parse(message.replyTo ?? 'null'));

  const replyAuthorId = replySnapshot.success
    ? deps.database.all(db
      .selectFrom('message')
      .select('authorId')
      .where('id', '=', replySnapshot.data.id)
      .where('role', '=', 'assistant')).at(0)?.authorId ?? null
    : null;

  try {
    const plan = await deps.route.queries.plan({
      id: message.id,
      roomId: message.roomId,
      role: message.role,
      authorId: message.authorId,
      authorName: message.authorName,
      text: roomMessageText(message.parts),
      hop,
      reactionAuthorId: message.reactionAuthorId,
      replyAuthorId,
      images: roomMessageFiles(message.parts).some((file) => STORAGE.imageTypes.some((type) => type === file.mediaType)),
    });

    const members = new Set(deps.database.all(db
      .selectFrom('member')
      .select('botId')
      .where('roomId', '=', message.roomId)).map((member) => member.botId));

    if (plan.members.some((bot) => !members.has(bot.id))) {
      return;
    }

    runActionQueue(deps, {
      roomId: message.roomId,
      plan,
      hop: hop + 1,
      triggerMessageId: message.id,
    });
  } finally {
    deps.routing.delete(message.id);
  }
}
