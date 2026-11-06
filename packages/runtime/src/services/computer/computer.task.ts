import { defineTask } from '@earendil-works/pi-durable';
import { log } from '@repo/logger/server';
import { match } from 'ts-pattern';
import { COMPUTER, computerDocument } from './computer.constants';
import { computerAttempt, computerBackoff, computerReset, computerSchedule } from './computer.utils';
import type { ComputerHost, ComputerTaskInput, ComputerTaskState } from '../../types/computer.types';

export function computerTask(host: ComputerHost) {
  return defineTask<ComputerTaskInput, ComputerTaskState, null>({
    name: COMPUTER.task,
    version: 1,
    initial: () => ({ phase: 'check' }),
    phases: {
      check: (task, api, context) => api.commit(async (tx) => {
        const record = await tx.doc(computerDocument);
        const schedule = match(record.taskId === task.id).with(true, () => computerSchedule(record, api.now())).with(false, () => null).exhaustive();

        return match(schedule)
          .with(null, () => ({ status: 'terminal' as const, outcome: { status: 'completed' as const, result: null } }))
          .when(({ next }) => next.at <= api.now(), ({ next }) => ({
            status: 'running' as const,
            checkpoint: { phase: 'apply' as const, transition: next.transition, failures: task.state.checkpoint.failures },
          }))
          .otherwise(({ next }) => ({
            status: 'sleeping' as const,
            until: next.at,
            checkpoint: { phase: 'wait' as const, until: next.at },
          }));
      }, context),
      wait: (_task, api, context) => api.commit(() => ({ status: 'running', checkpoint: { phase: 'check' } }), context),
      apply: async (task, api, context) => {
        const { transition, failures = 0 } = task.state.checkpoint;
        const { botId } = task.input;

        const current = await api.snapshot(computerDocument, context);

        const outcome = await match({ isOwner: current?.taskId === task.id, transition })
          .with({ isOwner: false }, () => Promise.resolve({ isFailed: false as const }))
          .with({ transition: 'sleep' }, () => computerAttempt(() => host.actions.sleep({ botId })))
          .with({ transition: 'shutdown' }, () => computerAttempt(() => host.actions.shutdown({ botId })))
          .exhaustive();

        return match(outcome)
          .with({ isFailed: true }, ({ error }) => {
            log.error({
              tag: 'computer-task',
              message: 'The computer did not change state; retrying later.',
              botId,
              transition,
              failures,
              error,
            });

            return api.commit(() => ({
              status: 'sleeping',
              until: api.now() + computerBackoff(failures),
              checkpoint: { phase: 'check', failures: failures + 1 },
            }), context);
          })
          .with({ isFailed: false }, () => api.commit(async (tx) => {
            const record = await tx.doc(computerDocument);

            match({ isOwner: record.taskId === task.id, transition })
              .with({ isOwner: false }, () => undefined)
              .with({ transition: 'sleep' }, () => {
                record.state = 'sleeping';
                record.sleptAt = api.now();
              })
              .with({ transition: 'shutdown' }, () => computerReset(record))
              .exhaustive();

            return { status: 'running', checkpoint: { phase: 'check' } };
          }, context))
          .exhaustive();
      },
    },
    abort: (_task, api, context) => api.commit(() => ({ status: 'terminal', outcome: { status: 'aborted' } }), context),
  });
}
