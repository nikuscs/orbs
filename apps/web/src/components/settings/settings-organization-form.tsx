import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { BotSettingsFields } from '@/components/bots/bot-settings-fields';
import { RoutingDriverSelect } from '@/components/routing/routing-driver-select';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form, FormErrors, FormErrorsAndHint, FormField, FormItem, FormLabel } from '@/components/ui/forms/form';
import { rpc } from '@/services/rpc/rpc.client';
import { organizationSettings } from '@orbs/server/client';
import type { OrganizationSettings } from '@orbs/server/client';

export function SettingsOrganizationForm({ settings, onSaved }: { settings: OrganizationSettings; onSaved: () => void }) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(organizationSettings),
    defaultValues: settings,
  });

  const driver = useWatch({ control: form.control, name: 'routing.driver' });

  const save = useMutation(
    rpc.organization.configure.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: rpc.organization.settings.key() });
        onSaved();
      },
    }),
  );

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3" onSubmit={form.handleSubmit((input) => save.mutate(input))}>
        <fieldset className="contents" disabled={save.isPending}>
          <FormField
            control={form.control}
            name="routing.driver"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.settings_organization_driver()}</FormLabel>
                <RoutingDriverSelect
                  disabled={save.isPending}
                  value={field.value}
                  onChange={(next) => field.onChange(next ?? field.value)}
                />
                <FormErrorsAndHint />
              </FormItem>
            )}
          />
          {driver === 'judge' ? (
            <FormField
              control={form.control}
              name="routing.judge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{m.routing_judge_model()}</FormLabel>
                  <BotSettingsFields
                    disabled={save.isPending}
                    value={
                      field.value ?? {
                        harnessId: '',
                        modelProvider: '',
                        modelId: '',
                        thinkingLevel: 'medium',
                      }
                    }
                    onChange={field.onChange}
                  />
                  <FormErrorsAndHint hint={m.routing_judge_model_hint()} />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="memory.model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.memory_model()}</FormLabel>
                <BotSettingsFields
                  disabled={save.isPending}
                  value={field.value ?? { harnessId: '', modelProvider: '', modelId: '', thinkingLevel: 'medium' }}
                  onChange={field.onChange}
                />
                <FormErrorsAndHint hint={m.memory_model_hint()} />
                <Button
                  disabled={save.isPending}
                  type="button"
                  variant="outline"
                  onClick={() => field.onChange(null)}
                >
                  {m.memory_model_clear()}
                </Button>
              </FormItem>
            )}
          />
          <FormErrors error={save.isError ? m.settings_organization_error() : null} />
          <ButtonLoading
            disabled={save.isPending}
            loading={save.isPending}
            type="submit"
          >
            {m.settings_organization_save()}
          </ButtonLoading>
        </fieldset>
      </form>
    </Form>
  );
}
