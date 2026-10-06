import { m } from '@orbs/i18n/client';
import type * as BotTypes from '@/types/bot.types';
import type * as ClientTypes from '@orbs/server/client';

export const BOT_ACTIVITY_LABELS = {
  idle: m.avatars_activity_idle,
  queued: m.avatars_activity_queued,
  thinking: m.avatars_activity_thinking,
  working: m.avatars_activity_working,
  writing: m.avatars_activity_writing,
  compacting: m.avatars_activity_compacting,
  retrying: m.avatars_activity_retrying,
  failed: m.avatars_activity_failed,
} satisfies Record<BotTypes.BotActivity, () => string>;

export const BOT_INHERIT_LABELS = {
  skills: m.rooms_bot_inherit_skills,
  agentsFile: m.rooms_bot_inherit_agents_file,
  mcp: m.rooms_bot_inherit_mcp,
  plugins: m.rooms_bot_inherit_plugins,
} satisfies Record<ClientTypes.BotInheritResource, () => string>;

export const BOT_THINKING_LEVEL_LABELS = {
  off: m.rooms_bot_thinking_level_off,
  minimal: m.rooms_bot_thinking_level_minimal,
  low: m.rooms_bot_thinking_level_low,
  medium: m.rooms_bot_thinking_level_medium,
  high: m.rooms_bot_thinking_level_high,
  xhigh: m.rooms_bot_thinking_level_xhigh,
  max: m.rooms_bot_thinking_level_max,
} satisfies Record<ClientTypes.BotThinkingLevel, () => string>;

export const BOT_MODEL_BRAND_PREFIXES: [RegExp, BotTypes.BotBrand][] = [
  [/^claude/u, 'anthropic'],
  [/^(gpt|o\d|codex|chatgpt)/u, 'openai'],
  [/^grok/u, 'xai'],
  [/^(gemini|gemma)/u, 'google'],
  [/^deepseek/u, 'deepseek'],
  [/^(mistral|codestral|devstral|magistral|ministral)/u, 'mistral'],
  [/^(qwen|qwq)/u, 'qwen'],
  [/^llama/u, 'meta'],
  [/^sonar/u, 'perplexity'],
];

export const BOT_PROVIDER_BRAND_PREFIXES: [RegExp, BotTypes.BotBrand][] = [
  [/^anthropic/u, 'anthropic'],
  [/^openai/u, 'openai'],
  [/^xai/u, 'xai'],
  [/^(google|gemini|vertex)/u, 'google'],
  [/^deepseek/u, 'deepseek'],
  [/^mistral/u, 'mistral'],
  [/^(qwen|alibaba|dashscope)/u, 'qwen'],
  [/^perplexity/u, 'perplexity'],
];

export const BOT_HARNESS_BRANDS = new Map<string, BotTypes.BotBrand>([
  ['pi', 'pi'],
  ['claude-code', 'claude-code'],
  ['codex', 'codex'],
]);

export const BOT_HARNESS_LABELS = new Map<string, () => string>([
  ['pi', m.rooms_bot_harness_pi],
  ['claude-code', m.rooms_bot_harness_claude_code],
  ['codex', m.rooms_bot_harness_codex],
]);

export const BOT_MODEL_VERSION_PATTERN = /(?<![\d.])(\d{1,3})(?:\.(\d{1,3}))?(?!\d)/u;

export const BOT_ACTIVITY_PRIORITY = {
  idle: 0, failed: 1, queued: 2, thinking: 3, working: 3, writing: 3, compacting: 3, retrying: 3,
} satisfies Record<BotTypes.BotActivity, number>;
