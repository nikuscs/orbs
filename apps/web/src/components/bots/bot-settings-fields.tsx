import { m } from '@orbs/i18n/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BotBrandLogo } from '@/components/bots/bot-brand-logo';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { botChooseModel, botDefaultSettings, botHarnessBrand, botHarnessLabel, botHarnessProblem, botModelBrand } from '@/services/bot/bot.client';
import { BOT_THINKING_LEVEL_LABELS } from '@/services/bot/bot.constants';
import { rpc } from '@/services/rpc/rpc.client';
import { botThinkingLevel } from '@orbs/server/client';
import type { ComboboxGroup } from '@/components/ui/combobox';
import type { BotSettings } from '@/types/bot.types';

interface BotSettingsFieldsProps {
  value: BotSettings
  disabled?: boolean
  onChange: (value: BotSettings) => void
}

export function BotSettingsFields({ value, disabled = false, onChange }: BotSettingsFieldsProps) {
  const queryClient = useQueryClient();
  const harnessesQuery = useQuery(rpc.bots.harnesses.queryOptions());
  const harnesses = harnessesQuery.data ?? [];
  const harnessId = value.harnessId || (harnesses.at(0)?.harnessId ?? '');

  const modelsQuery = useQuery(rpc.bots.models.queryOptions({
    input: { harnessId },
    enabled: harnessId !== '',
  }));

  const providers = modelsQuery.data ?? [];
  const models = providers.flatMap((provider) => provider.models.map((model) => ({ provider, model })));
  const modelKey = value.modelId ? `${value.modelProvider}/${value.modelId}` : '';
  const current = models.find((item) => `${item.provider.id}/${item.model.id}` === modelKey);
  const levels = current?.model.thinkingLevels ?? [value.thinkingLevel];
  const loadingModels = modelsQuery.isPending && harnessId !== '';

  const problem = botHarnessProblem(harnesses.find((harness) => harness.harnessId === harnessId));

  async function switchHarness(next: string) {
    onChange({
      ...value,
      harnessId: next,
      modelProvider: '',
      modelId: '',
    });

    const nextProviders = await queryClient.fetchQuery(rpc.bots.models.queryOptions({ input: { harnessId: next } })).catch(() => null);

    if (nextProviders) {
      onChange(botDefaultSettings({
        harnessId: next,
        providers: nextProviders,
        thinkingLevel: value.thinkingLevel,
      }));
    }
  }

  if (!harnessesQuery.isPending && harnesses.length === 0) {
    return <p className="text-xs text-muted-foreground">{m.rooms_bot_daemon_needed()}</p>;
  }

  const harnessGroups: ComboboxGroup[] = [{
    options: harnesses.map((harness) => ({
      value: harness.harnessId,
      label: botHarnessLabel({ harnessId: harness.harnessId }),
      icon: <BotBrandLogo brand={botHarnessBrand({ harnessId: harness.harnessId })} />,
    })),
  }];

  const modelGroups: ComboboxGroup[] = providers.map((provider) => ({
    label: provider.name,
    options: provider.models.map((model) => ({
      value: `${provider.id}/${model.id}`,
      label: model.name,
      icon: <BotBrandLogo brand={botModelBrand({ providerId: provider.id, modelId: model.id })} />,
    })),
  }));

  if (modelKey && !current && !loadingModels) {
    modelGroups.unshift({
      options: [{
        value: modelKey,
        label: m.rooms_bot_not_offered({ model: modelKey }),
        icon: <BotBrandLogo brand={botModelBrand({ providerId: value.modelProvider, modelId: value.modelId })} />,
      }],
    });
  }

  function pickModel(key: string) {
    const picked = models.find((item) => `${item.provider.id}/${item.model.id}` === key);

    if (picked) {
      onChange(botChooseModel({
        harnessId,
        choice: picked,
        thinkingLevel: value.thinkingLevel,
      }));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_8rem]">
        <Combobox
          aria-label={m.rooms_bot_harness()}
          disabled={disabled || harnessesQuery.isPending}
          groups={harnessGroups}
          placeholder={m.rooms_bot_harness_pick()}
          value={harnessId}
          onValueChange={(next) => void switchHarness(next)}
        />
        <Combobox
          aria-label={m.rooms_bot_model()}
          disabled={disabled || loadingModels}
          groups={modelGroups}
          placeholder={loadingModels ? m.rooms_bot_model_loading() : m.rooms_bot_model_pick()}
          search={{ placeholder: m.rooms_bot_model_search(), empty: m.rooms_bot_model_empty() }}
          value={modelKey}
          onValueChange={pickModel}
        />
        <Select
          disabled={disabled || !current}
          value={value.thinkingLevel}
          onValueChange={(next) => onChange({ ...value, thinkingLevel: botThinkingLevel.parse(next) })}
        >
          <SelectTrigger aria-label={m.rooms_bot_thinking_level()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((level) => <SelectItem key={level} value={level}>{BOT_THINKING_LEVEL_LABELS[level]()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {problem ? <p className="text-xs text-destructive">{problem}</p> : null}
    </div>
  );
}
