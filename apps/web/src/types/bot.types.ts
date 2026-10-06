import type { ExpressionId } from '@orbs/avatar-blobs/expressions';
import type { BodyId, ColorId } from '@orbs/avatar-blobs/skins';
import type { StateId } from '@orbs/avatar-blobs/states';
import type * as ClientTypes from '@orbs/server/client';

export type BotActivity = ClientTypes.TenantRunActivity | Extract<ClientTypes.TenantRunStatus, 'queued' | 'failed'> | 'idle';

export type BotBrand = 'pi' | 'claude-code' | 'codex' | 'anthropic' | 'openai' | 'xai' | 'google' | 'deepseek' | 'mistral' | 'qwen' | 'meta' | 'perplexity';

export interface BotBlobPresentation {
  body: BodyId;
  color: ColorId;
  expression: ExpressionId;
  state: StateId;
}

export interface BotSkillNameParams {
  name: string;
}

export interface BotHarnessLabelParams {
  harnessId: string;
}

export interface BotModelBrandParams {
  providerId: string;
  modelId: string;
}

export interface BotHarnessBrandParams {
  harnessId: string;
}

export interface BotRoomActivitiesParams {
  runs: ClientTypes.RunRoom[];
}

export interface BotBlobPresentationParams {
  avatar: ClientTypes.BotAvatarPreference | null | undefined;
  activity: BotActivity;
}

export type BotSettings = Pick<ClientTypes.Bot, 'harnessId' | 'modelProvider' | 'modelId' | 'thinkingLevel'>;

export type BotProvider = ClientTypes.DaemonHarness['providers'][number];

export interface BotModelChoice {
  provider: BotProvider;
  model: BotProvider['models'][number];
}

export interface BotDefaultModelParams {
  providers: BotProvider[];
}

export interface BotChooseModelParams {
  harnessId: string;
  choice: BotModelChoice;
  thinkingLevel: ClientTypes.BotThinkingLevel;
}

export interface BotDefaultSettingsParams {
  harnessId: string;
  providers: BotProvider[];
  thinkingLevel: ClientTypes.BotThinkingLevel;
}
