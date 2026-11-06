import { BOT_FIELDS } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormErrorsAndHint, FormField, FormItem, FormLabel } from '../forms/form';
import { PanelRow } from '../panel';
import { SettingsGroup } from '../settings/settings-group';
import { Textarea } from '../textarea';
import { BotFormInherit } from './bot-form-inherit';
import type { BotForm } from '@repo/contracts/universal';

interface BotFormInstructionsProps {
  busy: boolean
}

export function BotFormInstructions({ busy }: BotFormInstructionsProps) {
  const form = useFormContext<BotForm>();

  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup title={m.rooms_bot_instructions()}>
        <PanelRow className="block">
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">{m.rooms_bot_instructions()}</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-40"
                    maxLength={BOT_FIELDS.maxInstructions}
                    placeholder={m.rooms_bot_instructions_placeholder()}
                    {...field}
                  />
                </FormControl>
                <FormErrorsAndHint />
              </FormItem>
            )}
          />
        </PanelRow>
      </SettingsGroup>
      <SettingsGroup isTitleVisible title={m.bots_shared()}>
        <BotFormInherit
          busy={busy}
          description={m.bots_instructions_shared_hint()}
          label={m.bots_instructions_shared()}
          resource="agentsFile"
        />
      </SettingsGroup>
    </div>
  );
}
