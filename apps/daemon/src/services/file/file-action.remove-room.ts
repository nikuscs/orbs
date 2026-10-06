import { rm } from 'node:fs/promises';
import { skillResolveHome } from '#services/skill/skill.utils';
import { ROOM } from '@orbs/server/daemon';
import type { FileActionRemoveRoomParams } from '#/types/file.types';

export async function fileActionRemoveRoom(params: FileActionRemoveRoomParams): Promise<void> {
  await rm(skillResolveHome(`${ROOM.filesRoot}/${params.roomId}`), { recursive: true, force: true });
}
