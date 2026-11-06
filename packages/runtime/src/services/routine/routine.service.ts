import { routineActionCreate } from './routine-action.create';
import { routineActionRecover } from './routine-action.recover';
import { routineActionRemove } from './routine-action.remove';
import { routineActionRun } from './routine-action.run';
import { routineActionUpdate } from './routine-action.update';
import { routineQueryList } from './routine-query.list';
import type * as RoutineTypes from '../../types/routine.types';
import type { Context } from '@earendil-works/chord/context';

export function makeRoutineService(deps: RoutineTypes.RoutineServiceDeps) {
  return {
    actions: {
      create: (params: RoutineTypes.RoutineCreateParams, context: Context) => routineActionCreate(deps, { ...params, context }),
      update: (params: RoutineTypes.RoutineUpdateParams, context: Context) => routineActionUpdate(deps, { ...params, context }),
      run: (params: RoutineTypes.RoutineTargetParams, context: Context) => routineActionRun(deps, { ...params, context }),
      remove: (params: RoutineTypes.RoutineTargetParams, context: Context) => routineActionRemove(deps, { ...params, context }),
      recover: (context: Context) => routineActionRecover(deps, context),
    },
    queries: {
      list: (params: RoutineTypes.RoutineConversationParams, context: Context) => routineQueryList(deps, { ...params, context }),
    },
  };
}

export type RoutineService = ReturnType<typeof makeRoutineService>;
