import type * as UniversalTypes from '@repo/contracts/universal';

export function labBot(bot: Pick<UniversalTypes.Bot, 'id' | 'name' | 'handle' | 'avatar' | 'modelProvider' | 'modelId'>, now: number): UniversalTypes.Bot {
  return {
    ...bot,
    instructions: '',
    thinkingLevel: 'medium',
    fallbackModel: null,
    permission: 'ask',
    inherit: ['skills', 'mcp', 'plugins'],
    sharedSkills: null,
    sharedMcp: null,
    disabledSkills: null,
    createdAt: now,
    updatedAt: now,
  };
}
