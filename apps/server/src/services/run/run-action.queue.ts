import { runActionAnnounce } from './run-action.announce';
import { runActionDispatch } from './run-action.dispatch';
import { runPromptsRoomInstructions } from './run.prompts';
import { runLatestHumanSeq } from './run.utils';
import type { DatabaseTenantRun } from '#/types/database-tenant.types';
import type { RunActionQueueParams, RunServiceDeps } from '#/types/run.types';

export function runActionQueue(deps: RunServiceDeps, params: RunActionQueueParams): void {
  function runBotsThatAlreadyReadTrigger(serviceDeps: RunServiceDeps, input: RunActionQueueParams, triggerSeq: number): Set<string> {
    const { db } = serviceDeps.database;

    const seen = serviceDeps.database.all(db
      .selectFrom('binding')
      .select('botId')
      .where('roomId', '=', input.roomId)
      .where('contextThrough', '>=', triggerSeq));

    const reading = serviceDeps.database.all(db
      .selectFrom('run')
      .select('botId')
      .where('roomId', '=', input.roomId)
      .where('status', '=', 'running')
      .where('contextThrough', '>=', triggerSeq));

    return new Set([...seen, ...reading].map((row) => row.botId));
  }

  const { db } = deps.database;

  const room = deps.database.all(db
    .selectFrom('room')
    .select(['kind', 'leaderBotId', 'description', 'stoppedThrough'])
    .where('id', '=', params.roomId)).at(0);

  const trigger = deps.database.all(db
    .selectFrom('message')
    .select('seq')
    .where('id', '=', params.triggerMessageId)).at(0);

  const triggerSeq = trigger && trigger.seq > (room?.stoppedThrough ?? 0) ? trigger.seq : undefined;

  deps.database.run(deps.database.db
    .deleteFrom('routing')
    .where('messageId', '=', params.triggerMessageId));

  if (triggerSeq === undefined) {
    runActionDispatch(deps);
    return;
  }

  const consumed = runBotsThatAlreadyReadTrigger(deps, params, triggerSeq);

  const members = new Set(deps.database.all(db
    .selectFrom('member')
    .select('botId')
    .where('roomId', '=', params.roomId)
    .where('freshFrom', '<', triggerSeq)).map((member) => member.botId));

  const queued = new Set(deps.database.all(db
    .selectFrom('run')
    .select('botId')
    .where('roomId', '=', params.roomId)
    .where('status', '=', 'queued')).map((run) => run.botId));

  const superseded = runLatestHumanSeq(deps, params.roomId) > triggerSeq;
  const responders = params.plan.responders.filter((responder) => responder.seat === 'required' || !superseded);
  const absorbed = responders.filter((responder) => queued.has(responder.bot.id));
  const now = Date.now();

  const runs = responders
    .filter((responder) => members.has(responder.bot.id) && !queued.has(responder.bot.id) && !consumed.has(responder.bot.id))
    .map(({ bot, seat }, index): DatabaseTenantRun => ({
      id: crypto.randomUUID(),
      roomId: params.roomId,
      botId: bot.id,
      botName: bot.name,
      homeDir: bot.homeDir,
      harnessId: bot.harnessId,
      modelProvider: bot.modelProvider,
      modelId: bot.modelId,
      thinkingLevel: bot.thinkingLevel,
      permission: bot.permission,
      instructions: bot.instructions,
      roomInstructions: runPromptsRoomInstructions(bot, params.plan.members, room ?? { kind: 'group', leaderBotId: null, description: '' }),
      inherit: JSON.stringify(bot.inherit),
      hop: params.hop,
      triggerMessageId: params.triggerMessageId,
      contextThrough: null,
      acceptedAt: null,
      status: 'queued',
      failure: null,
      activity: 'thinking',
      activeTools: 0,
      waitedMs: 0,
      seat,
      createdAt: new Date(now + index).toISOString(),
      updatedAt: new Date(now).toISOString(),
    }));

  deps.database.run(db
    .updateTable('message')
    .set({ route: JSON.stringify(params.plan.route) })
    .where('id', '=', params.triggerMessageId));

  deps.sockets.broadcast({
    type: 'message.routed',
    roomId: params.roomId,
    messageId: params.triggerMessageId,
    route: params.plan.route,
  });

  if (absorbed.length > 0) {
    deps.database.run(db
      .updateTable('run')
      .set({ hop: params.hop })
      .where('roomId', '=', params.roomId)
      .where('status', '=', 'queued')
      .where('botId', 'in', absorbed.map((responder) => responder.bot.id))
      .where('hop', '>', params.hop));
  }

  const upgraded = absorbed.filter((responder) => responder.seat === 'required');

  if (upgraded.length > 0) {
    deps.database.run(db
      .updateTable('run')
      .set({ seat: 'required' })
      .where('roomId', '=', params.roomId)
      .where('status', '=', 'queued')
      .where('botId', 'in', upgraded.map((responder) => responder.bot.id)));
  }

  if (runs.some((run) => run.seat !== 'required')) {
    deps.database.run(db
      .updateTable('room')
      .set((eb) => ({ rotation: eb('rotation', '+', 1) }))
      .where('id', '=', params.roomId));
  }

  if (runs.length > 0) {
    deps.database.run(db.insertInto('run').values(runs));
    runActionAnnounce(deps, { roomId: params.roomId });
  }

  runActionDispatch(deps);
}
