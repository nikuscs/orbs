import type { ChatActivity } from './chat.types';
import type { ExpressionId } from '@repo/avatar-blobs/expressions';
import type { BodyId, ColorId } from '@repo/avatar-blobs/skins';
import type { StateId } from '@repo/avatar-blobs/states';
import type * as UniversalTypes from '@repo/contracts/universal';

export type BotBrand = 'anthropic' | 'openai' | 'xai' | 'google' | 'deepseek' | 'mistral' | 'qwen' | 'meta' | 'perplexity';

export type BotAvatar = UniversalTypes.Bot['avatar'];

export type BotModel = UniversalTypes.ModelList[number];

export type BotThinkingLevel = UniversalTypes.ModelSelection['thinkingLevel'];

export type BotPermission = UniversalTypes.Bot['permission'];

export type BotInherit = UniversalTypes.Bot['inherit'][number];

export interface BotBlobPresentation {
  body: BodyId;
  color: ColorId;
  expression: ExpressionId;
  state: StateId;
}

export interface BotHandleParams {
  name: string;
}

export interface BotSkillNameParams {
  name: string;
}

export interface BotDisabledSkillsParams {
  disabled: string[] | null;
  name: string;
  isOn: boolean;
}

export interface BotModelBrandParams {
  providerId: string;
  modelId: string;
}

export interface BotBubbleParams {
  avatar: BotAvatar | undefined;
}

export interface BotBubble {
  background: string;
  foreground: 'white' | 'black';
}

export interface BotAvatarColorParams {
  avatar: BotAvatar | undefined;
}

export interface BotAvatarRecolorParams {
  avatar: BotAvatar | undefined;
  color: ColorId;
}

export interface BotAvatarEmojiParams {
  avatar: BotAvatar | undefined;
  emoji: string;
}

export interface BotBlobPresentationParams {
  avatar: BotAvatar | undefined;
  activity: ChatActivity;
}

export type BotSettings = Pick<UniversalTypes.Bot, 'modelProvider' | 'modelId' | 'thinkingLevel'>;

export interface BotModelUsage {
  model: UniversalTypes.BotSwapModelsInput['from'];
  primary: UniversalTypes.Bot[];
  fallbacks: UniversalTypes.Bot[];
}

export interface BotModelUsageParams {
  bots: UniversalTypes.Bot[];
}

export interface BotChooseModelParams {
  model: BotModel;
  thinkingLevel: BotThinkingLevel;
}

export interface BotDefaultSettingsParams {
  models: BotModel[];
  thinkingLevel: BotThinkingLevel;
}

export interface BotDeleteParams {
  botId: string;
  onDeleted: () => void | Promise<void>;
}

export interface BotCreateParams {
  onCreated: (bot: UniversalTypes.Bot) => void;
}

export interface BotMcpParams {
  botId: string;
  login: () => BotMcpLogin;
}

export interface BotMcpLogin {
  redirectUrl: string;
  returnUrl?: string;
  open: (authorizationUrl: string) => void | Promise<void>;
}
