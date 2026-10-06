import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { BotAvatarPicker } from '@/components/bots/bot-avatar-picker';
import { BotPermissionSelect } from '@/components/bots/bot-permission-select';
import { BotSettingsFields } from '@/components/bots/bot-settings-fields';
import { MemoryPanel } from '@/components/memory/memory-panel';
import { MemoryWipeLink } from '@/components/memory/memory-wipe-link';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormErrors, FormErrorsAndHint, FormField, FormItem, FormLabel } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { BOT_INHERIT_LABELS } from '@/services/bot/bot.constants';
import { rpc } from '@/services/rpc/rpc.client';
import { BOT, botCreateInput, botHandle, botInheritResource } from '@orbs/server/client';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconSettings from '~icons/lucide/settings';
import IconTrash from '~icons/lucide/trash-2';
import type { BotSettings } from '@/types/bot.types';
import type { Bot, BotCreateInput } from '@orbs/server/client';

interface BotFormDialogProps {
  bot?: Bot;
  settings?: BotSettings | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (bot: Bot) => void;
}

export function BotFormDialog({ bot, settings, onOpenChange, onSaved }: BotFormDialogProps) {
  function botFormDefaults(): BotCreateInput {
    if (!bot) {
      return {
        avatar: null,
        name: m.rooms_bot_default_name(),
        instructions: '',
        harnessId: settings?.harnessId ?? '',
        modelProvider: settings?.modelProvider ?? '',
        modelId: settings?.modelId ?? '',
        thinkingLevel: settings?.thinkingLevel ?? 'medium',
        permission: BOT.defaultPermission,
        inherit: botCreateInput.shape.inherit.parse(undefined),
      };
    }

    return {
      avatar: bot.avatar,
      name: bot.name,
      handle: bot.handle,
      instructions: bot.instructions,
      harnessId: bot.harnessId,
      modelProvider: bot.modelProvider,
      modelId: bot.modelId,
      thinkingLevel: bot.thinkingLevel,
      permission: bot.permission,
      homeDir: bot.homeDir,
      inherit: bot.inherit,
    };
  }

  const queryClient = useQueryClient();
  const [advanced, setAdvanced] = useState(false);
  const { data: bots = [] } = useQuery(rpc.bots.list.queryOptions());
  const deletable = bot !== undefined && bots.length > 1;

  const form = useForm({
    resolver: standardSchemaResolver(botCreateInput),
    defaultValues: botFormDefaults(),
  });

  const [name, avatar, harnessId, modelProvider, modelId, thinkingLevel] = useWatch({
    control: form.control,
    name: ['name', 'avatar', 'harnessId', 'modelProvider', 'modelId', 'thinkingLevel'],
  });

  async function refresh(saved: Bot) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: rpc.bots.list.key() }),
      queryClient.invalidateQueries({ queryKey: rpc.bots.skills.key({ input: { botId: saved.id } }) }),
    ]);
    onSaved(saved);
  }

  const create = useMutation(rpc.bots.create.mutationOptions({ onSuccess: refresh }));
  const update = useMutation(rpc.bots.update.mutationOptions({ onSuccess: refresh }));
  const save = bot ? update : create;
  const saveError = bot ? m.rooms_bot_save_error() : m.rooms_bot_create_error();
  const busy = save.isPending;

  function submit(input: BotCreateInput) {
    if (bot) {
      update.mutate({ ...input, botId: bot.id });
    } else {
      create.mutate(input);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className="max-h-[85svh] grid-cols-1 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bot ? m.rooms_bot_edit({ bot: bot.name }) : m.rooms_bot_title()}</DialogTitle>
          <DialogDescription className="sr-only">{m.rooms_bot_description()}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)}>
            <fieldset className="contents" disabled={busy}>
              <BotAvatarPicker
                disabled={busy}
                name={name || m.rooms_bot_default_name()}
                value={avatar ?? null}
                onChange={(next) => form.setValue('avatar', next, { shouldDirty: true })}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormInput
                  required
                  label={m.rooms_bot_name()}
                  maxLength={64}
                  name="name"
                  placeholder={m.rooms_bot_default_name()}
                />
                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{m.rooms_bot_handle()}</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={BOT.handleMaxLength}
                          placeholder={botHandle(name) || m.rooms_bot_handle_placeholder()}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value || undefined)}
                        />
                      </FormControl>
                      <FormErrorsAndHint />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.rooms_bot_instructions()}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-24"
                        maxLength={4000}
                        placeholder={m.rooms_bot_instructions_placeholder()}
                        {...field}
                      />
                    </FormControl>
                    <FormErrorsAndHint />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelId"
                render={() => (
                  <FormItem>
                    <FormLabel>{m.rooms_bot_model()}</FormLabel>
                    <BotSettingsFields
                      disabled={busy}
                      value={{ harnessId, modelProvider, modelId, thinkingLevel }}
                      onChange={(next) => {
                        form.setValue('harnessId', next.harnessId, { shouldDirty: true });
                        form.setValue('modelProvider', next.modelProvider, { shouldDirty: true });
                        form.setValue('modelId', next.modelId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
                        form.setValue('thinkingLevel', next.thinkingLevel, { shouldDirty: true });
                      }}
                    />
                    <FormErrorsAndHint />
                  </FormItem>
                )}
              />
              <Collapsible open={advanced} onOpenChange={setAdvanced}>
                <div className="flex justify-center">
                  <CollapsibleTrigger asChild>
                    <Button
                      size="xs"
                      type="button"
                      variant="link-muted"
                    >
                      <IconSettings />
                      {m.rooms_bot_advanced()}
                      <IconChevronDown className={cn('transition-transform', advanced && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <div className="-mx-1">
                  <CollapsibleContent>
                    <div className="flex flex-col gap-4 px-1 pt-3 pb-1">
                      <FormField
                        control={form.control}
                        name="permission"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{m.rooms_bot_permission()}</FormLabel>
                            <BotPermissionSelect
                              disabled={busy}
                              value={field.value ?? BOT.defaultPermission}
                              onChange={field.onChange}
                            />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="homeDir"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{m.rooms_bot_home()}</FormLabel>
                            <FormControl>
                              <Input
                                maxLength={512}
                                placeholder={m.rooms_bot_home_placeholder()}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(event) => field.onChange(event.target.value || undefined)}
                              />
                            </FormControl>
                            <FormErrorsAndHint hint={m.rooms_bot_home_hint()} />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="inherit"
                        render={({ field }) => {
                          const inherit = field.value ?? [];

                          return (
                            <FormItem className="gap-1.5">
                              {botInheritResource.options.map((resource) => (
                                <label className="flex items-center gap-2 text-xs text-muted-foreground" key={resource}>
                                  <Checkbox
                                    checked={inherit.includes(resource)}
                                    onCheckedChange={(checked) =>
                                      field.onChange(
                                        checked === true ? [...inherit, resource] : inherit.filter((item) => item !== resource),
                                      )}
                                  />
                                  {BOT_INHERIT_LABELS[resource]()}
                                </label>
                              ))}
                            </FormItem>
                          );
                        }}
                      />
                      {bot ? <MemoryWipeLink disabled={busy || form.formState.isDirty} scope={{ scope: 'bot', ownerId: bot.id }} /> : null}
                      {deletable ? (
                        <Button
                          asChild
                          className="self-start"
                          size="xs"
                          variant="link-destructive"
                        >
                          <Link
                            disabled={busy}
                            params={{ botId: bot.id }}
                            to="/bots/$botId/delete"
                          >
                            <IconTrash />
                            {m.rooms_bot_delete()}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
              <FormErrors error={save.isError ? saveError : null} />
              <DialogFooter>
                <ButtonLoading
                  disabled={busy}
                  loading={busy}
                  type="submit"
                >
                  {bot ? m.rooms_bot_save() : m.rooms_bot_submit()}
                </ButtonLoading>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
        {bot ? <MemoryPanel scope={{ scope: 'bot', ownerId: bot.id }} /> : null}
      </DialogContent>
    </Dialog>
  );
}
