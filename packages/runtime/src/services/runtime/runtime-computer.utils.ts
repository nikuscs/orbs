import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import type { RuntimeServiceDeps } from '../../types/runtime.types';

export function runtimeComputer({ computers, botId }: Pick<RuntimeServiceDeps, 'computers' | 'botId'>) {
  return match(computers)
    .with(P.nonNullable, (service) => service)
    .otherwise(() => {
      throw new Errors.NOT_FOUND({ resource: 'computer', resourceId: botId });
    });
}
