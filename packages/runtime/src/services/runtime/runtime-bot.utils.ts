import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { createRegistry, Harness } from '@earendil-works/pi-durable';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import { makeActivityService } from '../activity/activity.service';
import { makeArtifactService } from '../artifact/artifact.service';
import { makeConversationIndexService } from '../conversation-index/conversation-index.service';
import { makeNotificationService } from '../notification/notification.service';
import { makeQuestionService } from '../question/question.service';
import { makeRoutineService } from '../routine/routine.service';
import { makeTodoService } from '../todo/todo.service';
import { runtimeArtifactToolsExtension } from './runtime-artifact-tools.extension';
import { runtimeQueryNextDeadline } from './runtime-query.next-deadline';
import { runtimeRoutineToolsExtension } from './runtime-routine-tools.extension';
import { runtimeTodoToolsExtension } from './runtime-todo-tools.extension';
import { runtimeToolsExtension } from './runtime-tools.extension';
import { RUNTIME_ALARM_DEBOUNCE_MS, RUNTIME_HARNESS } from './runtime.constants';
import type * as RuntimeTypes from '../../types/runtime.types';
import type { Context } from '@earendil-works/chord/context';

export async function runtimeBotOpen(shared: RuntimeTypes.RuntimeSharedDeps, botId: string): Promise<RuntimeTypes.RuntimeBot> {
  const storage = await shared.storage.open({ botId });

  const telemetry = await shared.storage.openTelemetry({ botId }).catch(async (error: unknown) => {
    await storage.close(BACKGROUND_CONTEXT);
    throw error;
  });

  const registry = createRegistry();

  for (const extension of shared.extensions) {
    registry.install(extension);
  }

  const harness = await Harness.open(storage, {
    models: shared.models,
    registry,
    env: shared.env,
    telemetry: telemetry.telemetry,
    ...RUNTIME_HARNESS,
    onReport: (error, info) => match(info)
      .with({ type: 'session_failed' }, () => undefined)
      .otherwise(() => log.error({
        tag: 'runtime-report',
        message: 'Pi reported a failure.',
        botId,
        report: info,
        error,
      })),
  }, BACKGROUND_CONTEXT).catch(async (error: unknown) => {
    await telemetry.close();
    await storage.close(BACKGROUND_CONTEXT);
    throw error;
  });

  try {
    const artifacts = makeArtifactService({ harness });
    const artifactTools = runtimeArtifactToolsExtension({ artifacts });
    const routines = makeRoutineService({ harness });
    const routineTools = runtimeRoutineToolsExtension({ harness, routines });
    const todos = makeTodoService({ harness });
    const todoTools = runtimeTodoToolsExtension({ harness, todos });
    const readOnlyTools = [...shared.readOnlyTools, ...artifactTools.readOnlyTools, ...routineTools.readOnlyTools, ...todoTools.readOnlyTools];

    const ownTools = [
      ...shared.ownTools,
      ...(artifactTools.extension.tools ?? []),
      ...(routineTools.extension.tools ?? []),
      ...(todoTools.extension.tools ?? []),
    ];

    const permissionExtension = runtimeToolsExtension({
      harness,
      readOnlyTools,
      ownTools,
      permissions: shared.permissions,
    });

    for (const extension of [artifactTools.extension, routineTools.extension, todoTools.extension, permissionExtension]) {
      registry.install(extension);
    }

    await routines.actions.recover(BACKGROUND_CONTEXT);
    const notifications = makeNotificationService({ harness, botId });

    const deps: RuntimeTypes.RuntimeServiceDeps = {
      appName: shared.appName,
      botId,
      directory: shared.directory,
      harness,
      questions: makeQuestionService({ harness }),
      routines,
      todos,
      artifacts,
      activity: makeActivityService({ harness, telemetry: telemetry.telemetry }),
      index: await makeConversationIndexService({ harness, notifications }),
      registry,
      models: shared.models,
      readOnlyTools,
      ownTools,
      extensions: [...shared.extensions, artifactTools.extension, routineTools.extension, todoTools.extension, permissionExtension],
    };

    const arm = runtimeBotAlarm(shared, deps);
    const unsubscribe = harness.subscribeCommits(arm.schedule);
    arm.schedule();

    return {
      deps,
      notifications,
      wake: () => {
        harness.resume();
        arm.schedule();
      },
      close: async () => {
        unsubscribe();
        arm.cancel();
        await harness.close(BACKGROUND_CONTEXT).finally(() => telemetry.close());
      },
    };
  } catch (error) {
    await harness.close(BACKGROUND_CONTEXT).finally(() => telemetry.close());
    throw error;
  }
}

function runtimeBotAlarm(shared: RuntimeTypes.RuntimeSharedDeps, deps: RuntimeTypes.RuntimeServiceDeps) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isCancelled = false;

  const runtimeBotArm = async () => {
    const at = await runtimeQueryNextDeadline(deps, BACKGROUND_CONTEXT).catch((error: unknown) => {
      match(isCancelled)
        .with(true, () => undefined)
        .with(false, () => log.error({
          tag: 'runtime-alarm',
          message: 'Cannot read the next deadline.',
          botId: deps.botId,
          error,
        }))
        .exhaustive();
      return null;
    });

    match({ at, isCancelled })
      .with({ isCancelled: true }, () => undefined)
      .with({ at: P.number }, ({ at: value }) => shared.alarm.set({ botId: deps.botId, at: value }))
      .otherwise(() => shared.alarm.clear({ botId: deps.botId }));
  };

  return {
    schedule: () => {
      clearTimeout(timer);
      timer = setTimeout(() => void runtimeBotArm(), RUNTIME_ALARM_DEBOUNCE_MS);
      timer.unref();
    },
    cancel: () => {
      isCancelled = true;
      clearTimeout(timer);
      shared.alarm.clear({ botId: deps.botId });
    },
  };
}

export function runtimeBotCall<P extends Pick<RuntimeTypes.RuntimeConversationParams, 'botId'>, R>(
  directory: RuntimeTypes.RuntimeDirectory,
  run: RuntimeTypes.RuntimeBotOperation<P, R>,
) {
  return async (params: P, context: Context = BACKGROUND_CONTEXT) => run((await directory.bot(params.botId)).deps, { ...params, context });
}
