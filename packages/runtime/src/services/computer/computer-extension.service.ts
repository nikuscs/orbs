import { defineExtension } from '@earendil-works/pi-durable';
import { COMPUTER } from './computer.constants';
import { computerTask } from './computer.task';
import type { ComputerHost } from '../../types/computer.types';

export function makeComputerExtensionService(host: ComputerHost) {
  return { extension: defineExtension({ name: COMPUTER.extension, tasks: [computerTask(host)] }) };
}

export type ComputerExtensionService = ReturnType<typeof makeComputerExtensionService>;
