import { getLocale, m } from '@orbs/i18n/client';
import { botDefaultAvatar } from '@orbs/server/client';
import {
  BOT_ACTIVITY_PRIORITY,
  BOT_HARNESS_BRANDS,
  BOT_HARNESS_LABELS,
  BOT_MODEL_BRAND_PREFIXES,
  BOT_MODEL_VERSION_PATTERN,
  BOT_PROVIDER_BRAND_PREFIXES,
} from './bot.constants';
import type * as BotTypes from '@/types/bot.types';
import type { ExpressionId } from '@orbs/avatar-blobs/expressions';
import type * as ClientTypes from '@orbs/server/client';

export function botSkillName({ name }: BotTypes.BotSkillNameParams): string {
  return name
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function botHarnessLabel({ harnessId }: BotTypes.BotHarnessLabelParams): string {
  return BOT_HARNESS_LABELS.get(harnessId)?.() ?? harnessId;
}

export function botModelBrand({ providerId, modelId }: BotTypes.BotModelBrandParams): BotTypes.BotBrand | null {
  function botBrandMatch(prefixes: [RegExp, BotTypes.BotBrand][], id: string): BotTypes.BotBrand | null {
    const bare = id.toLowerCase().split('/').at(-1) ?? '';

    return prefixes.find(([pattern]) => pattern.test(bare))?.[1] ?? null;
  }

  return botBrandMatch(BOT_MODEL_BRAND_PREFIXES, modelId) ?? botBrandMatch(BOT_PROVIDER_BRAND_PREFIXES, providerId);
}

export function botHarnessBrand({ harnessId }: BotTypes.BotHarnessBrandParams): BotTypes.BotBrand | null {
  return BOT_HARNESS_BRANDS.get(harnessId) ?? null;
}

export function botChooseModel({ harnessId, choice, thinkingLevel }: BotTypes.BotChooseModelParams): BotTypes.BotSettings {
  const supported = choice.model.thinkingLevels;

  return {
    harnessId,
    modelProvider: choice.provider.id,
    modelId: choice.model.id,
    thinkingLevel: supported.includes(thinkingLevel) ? thinkingLevel : (supported.at(0) ?? thinkingLevel),
  };
}

export function botDefaultSettings({ harnessId, providers, thinkingLevel }: BotTypes.BotDefaultSettingsParams): BotTypes.BotSettings {
  function botModelVersion({ model }: BotTypes.BotModelChoice): [number, number] {
    const match = BOT_MODEL_VERSION_PATTERN.exec(model.name) ?? BOT_MODEL_VERSION_PATTERN.exec(model.id);

    return match ? [Number(match[1]), Number(match.at(2) ?? 0)] : [0, 0];
  }

  function botModelNewer(candidate: BotTypes.BotModelChoice, best: BotTypes.BotModelChoice): boolean {
    const [major, minor] = botModelVersion(candidate);
    const [bestMajor, bestMinor] = botModelVersion(best);

    return major > bestMajor || (major === bestMajor && minor > bestMinor);
  }

  function botDefaultModel({ providers: availableProviders }: BotTypes.BotDefaultModelParams): BotTypes.BotModelChoice | null {
    const choices = availableProviders.flatMap((provider) => provider.models.map((model) => ({ provider, model })));

    return choices.reduce<BotTypes.BotModelChoice | null>((best, choice) => (!best || botModelNewer(choice, best) ? choice : best), null);
  }

  const choice = botDefaultModel({ providers });

  if (!choice) {
    return { harnessId, modelProvider: '', modelId: '', thinkingLevel };
  }

  return botChooseModel({
    harnessId,
    choice,
    thinkingLevel,
  });
}

export function botHarnessProblem(harness?: ClientTypes.DaemonHarness): string | null {
  const problem = harness?.problem;

  switch (problem?.code) {
    case 'pi_missing':
      return m.rooms_bot_pi_missing();
    case 'pi_outdated':
      return m.rooms_bot_pi_outdated({ version: problem.version, minimum: problem.minimum });
    case 'daemon_protocol':
      return (problem.protocol ?? 0) < problem.required ? m.rooms_bot_daemon_outdated() : m.rooms_bot_server_outdated();
    case undefined:
      return null;
  }
}

export function botRunActivity(run?: ClientTypes.RunRoom): BotTypes.BotActivity {
  if (run?.status === 'running') {
    return run.activity;
  }

  return run?.status === 'queued' || run?.status === 'failed' ? run.status : 'idle';
}

export function botRoomActivities({ runs }: BotTypes.BotRoomActivitiesParams): Map<string, BotTypes.BotActivity> {
  const activities = new Map<string, BotTypes.BotActivity>();

  for (const run of runs) {
    const activity = botRunActivity(run);

    if (BOT_ACTIVITY_PRIORITY[activity] >= BOT_ACTIVITY_PRIORITY[activities.get(run.botId) ?? 'idle']) {
      activities.set(run.botId, activity);
    }
  }

  return activities;
}

export function botBlobPresentation({ avatar, activity }: BotTypes.BotBlobPresentationParams): BotTypes.BotBlobPresentation {
  const look = avatar?.kind === 'blob' ? avatar : botDefaultAvatar;

  const expressions = {
    idle: look.expression,
    queued: 'curious',
    thinking: 'attentive',
    working: 'attentive',
    writing: 'attentive',
    compacting: 'attentive',
    retrying: 'confused',
    failed: 'sad',
  } satisfies Record<BotTypes.BotActivity, ExpressionId>;

  return { ...look, expression: expressions[activity], state: activity === 'working' || activity === 'compacting' ? 'swirl' : 'idle' };
}

export function botUsageLabel(usage: ClientTypes.DaemonUsage): string {
  const tokens = new Intl.NumberFormat(getLocale(), { notation: 'compact' });
  const label = m.rooms_chat_usage({ input: tokens.format(usage.input + usage.cacheRead), output: tokens.format(usage.output) });

  if (usage.cost <= 0) {
    return label;
  }

  const cost = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 2,
  }).format(usage.cost);

  return m.rooms_chat_usage_cost({ usage: label, cost });
}
