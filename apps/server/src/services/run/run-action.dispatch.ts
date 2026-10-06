import { botInherit } from '#/types/bot.types';
import { roomMessageRoute } from '#/types/room.types';
import { roomMessageText } from '#services/room/room.utils';
import { ROUTE } from '#services/route/route.constants';
import { runActionAnnounce } from './run-action.announce';
import { runActionArm } from './run-action.arm';
import { runActionMemory } from './run-action.memory';
import { runPromptsDirectives, runPromptsPrompt, runPromptsRecap } from './run.prompts';
import { runContextWindow, runFiles, runSkills } from './run.utils';
import type { DatabaseTenantRun } from '#/types/database-tenant.types';
import type { RunServiceDeps } from '#/types/run.types';
import type { TenantDaemon } from '#/types/tenant.types';

export function runActionDispatch(deps: RunServiceDeps): void {
  function runSeat(serviceDeps: RunServiceDeps, run: DatabaseTenantRun): 'required' | 'optional' {
    if (run.seat !== 'backstop') {
      return run.seat;
    }

    const replies = run.triggerMessageId
      ? serviceDeps.database.all(
        serviceDeps.database.db
          .selectFrom('message')
          .innerJoin('run as replied', 'replied.id', 'message.runId')
          .select('message.parts')
          .where('message.roomId', '=', run.roomId)
          .where('message.role', '=', 'assistant')
          .where('replied.triggerMessageId', '=', run.triggerMessageId)
          .where('replied.status', '=', 'completed'),
      )
      : [];

    return replies.some((reply) => roomMessageText(reply.parts).trim() !== '') ? 'optional' : 'required';
  }

  function runStart(serviceDeps: RunServiceDeps, daemon: TenantDaemon, run: DatabaseTenantRun): void {
    const { db } = serviceDeps.database;

    const binding = serviceDeps.database
      .all(
        db
          .selectFrom('binding')
          .select(['resume', 'contextThrough'])
          .where('roomId', '=', run.roomId)
          .where('botId', '=', run.botId)
          .where('harnessId', '=', run.harnessId),
      )
      .at(0);

    const freshFrom =
      serviceDeps.database
        .all(db.selectFrom('member').select('freshFrom').where('roomId', '=', run.roomId).where('botId', '=', run.botId))
        .at(0)?.freshFrom ?? 0;

    const recap = binding?.resume
      ? undefined
      : serviceDeps.database
        .all(
          db
            .selectFrom('memoryRoom')
            .select(['recap', 'recapFrom', 'recapThrough'])
            .where('roomId', '=', run.roomId)
            .where('recapFrom', '>', freshFrom),
        )
        .at(0);

    const readFrom = Math.max(binding?.contextThrough ?? 0, freshFrom);

    const messages = db
      .selectFrom('message')
      .leftJoin('reaction', 'reaction.id', 'message.reactionId')
      .select([
        'message.seq',
        'message.roomId',
        'message.role',
        'message.authorId',
        'message.authorName',
        'message.parts',
        'message.replyTo',
        'message.rerunOf',
        'message.reactionId',
      ])
      .select(['reaction.emoji as reactionEmoji', 'reaction.removedAt as reactionRemovedAt']);

    const unseen = messages
      .where('message.roomId', '=', run.roomId)
      .where('message.authorId', '!=', run.botId)
      .where('message.seq', '>', readFrom)
      .orderBy('message.seq', 'desc');

    const humans = serviceDeps.database.all(
      unseen.where('message.role', '=', 'user').where('message.reactionId', 'is', null).limit(ROUTE.contextMessagesHuman),
    );

    const reactions = serviceDeps.database.all(unseen.where('message.reactionId', 'is not', null).limit(ROUTE.contextReactions));

    const bots = runContextWindow(
      serviceDeps.database.all(unseen.where('message.role', '=', 'assistant').limit(ROUTE.contextMessagesBots)),
    );

    const trigger = run.triggerMessageId
      ? serviceDeps.database.all(messages.select('message.route').where('message.id', '=', run.triggerMessageId)).at(0)
      : undefined;

    const window = [...humans, ...reactions, ...bots];

    const triggerReactionOutsideWindow =
      trigger && trigger.reactionId !== null && trigger.seq > readFrom && !window.some((message) => message.seq === trigger.seq);

    const context = (triggerReactionOutsideWindow ? [...window, trigger] : window).sort((left, right) => left.seq - right.seq);
    const skills = runSkills(context);

    const sizes = new Map(serviceDeps.database.all(db
      .selectFrom('file')
      .select(['id', 'size'])
      .where('roomId', '=', run.roomId)).map((file) => [file.id, file.size]));

    const route = roomMessageRoute.safeParse(JSON.parse(trigger?.route ?? 'null'));
    const together = route.success ? route.data.picks.filter((pick) => pick.botId !== run.botId) : [];
    const alsoAsked = together.map((pick) => pick.botName);

    const answered = [
      ...new Set(
        bots
          .filter((message) => trigger && message.seq > trigger.seq && together.some((pick) => pick.botId === message.authorId))
          .map((message) => message.authorName),
      ),
    ];

    const room = serviceDeps.database.all(db.selectFrom('room').select('kind').where('id', '=', run.roomId)).at(0);

    const members = serviceDeps.database.all(db.selectFrom('member').select('botId').where('roomId', '=', run.roomId));

    daemon.send({
      type: 'run.start',
      memory: runActionMemory(serviceDeps, run).sections,
      runId: run.id,
      roomId: run.roomId,
      botId: run.botId,
      harnessId: run.harnessId,
      homeDir: run.homeDir,
      modelProvider: run.modelProvider,
      modelId: run.modelId,
      thinkingLevel: run.thinkingLevel,
      permission: run.permission,
      directives: runPromptsDirectives(),
      instructions: run.instructions,
      roomInstructions: run.roomInstructions,
      inherit: botInherit.parse(JSON.parse(run.inherit)),
      prompt: runPromptsRecap(recap?.recap) +
        runPromptsPrompt(context, {
          hop: run.hop,
          seat: runSeat(serviceDeps, run),
          backstop: run.seat === 'backstop',
          alsoAsked,
          answered,
          team: room?.kind === 'group' && members.length > 1,
          skills,
        }),
      skills,
      files: runFiles(context, run.roomId, sizes),
      resume: binding?.resume ?? null,
    });
    serviceDeps.database.run(
      db
        .updateTable('run')
        .set({
          status: 'running',
          activity: 'thinking',
          activeTools: 0,
          contextThrough: Math.max(readFrom, ...window.map((message) => message.seq)),
          updatedAt: new Date().toISOString(),
        })
        .where('id', '=', run.id),
    );
    runActionAnnounce(serviceDeps, { roomId: run.roomId });
  }

  const stillRunning = deps.database.db.selectFrom('run').select('id').where('status', '=', 'running');

  deps.database.run(deps.database.db.deleteFrom('chunk').where('runId', 'not in', stillRunning));
  deps.database.run(
    deps.database.db
      .updateTable('approval')
      .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .where('status', '=', 'pending')
      .where('runId', 'not in', stillRunning),
  );
  const daemon = deps.sockets.daemon();

  if (!daemon || daemon.harnessIds.length === 0) {
    return;
  }

  const { db } = deps.database;

  const busyRooms = new Set(
    deps.database.all(db.selectFrom('run').select('roomId').where('status', '=', 'running')).map((run) => run.roomId),
  );

  const queued = deps.database.all(
    db.selectFrom('run').selectAll().where('status', '=', 'queued').where('harnessId', 'in', daemon.harnessIds).orderBy('createdAt'),
  );

  const free = Math.max(0, daemon.maxTurns - busyRooms.size);

  const idle = queued.filter((run) => {
    if (busyRooms.has(run.roomId)) {
      return false;
    }

    busyRooms.add(run.roomId);

    return true;
  });

  const starting = idle.slice(0, free);

  for (const run of starting) {
    runStart(deps, daemon, run);
  }

  if (starting.length > 0) {
    runActionArm(deps);
  }
}
