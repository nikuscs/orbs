import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { botDefaultSettings, botHandle } from '@repo/client/client';
import { useBotCreate } from '@repo/client/react';
import { botForm } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { BotFormAvatar } from '@repo/ui/bots/bot-form-avatar';
import { BotFormProfile } from '@repo/ui/bots/bot-form-profile';
import { Button } from '@repo/ui/button';
import { Form, FormErrors } from '@repo/ui/forms/form';
import { PanelRow } from '@repo/ui/panel';
import { SectionDialog, SectionDialogBody, SectionDialogNav, SectionDialogNavTitle, SectionDialogSaveBar } from '@repo/ui/section-dialog';
import { SettingsGroup } from '@repo/ui/settings/settings-group';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useForm, useFormContext, useWatch } from 'react-hook-form';
import { BotEdit } from '@/components/bots/bot-edit';
import { BotFormModel } from '@/components/bots/bot-form-model';
import { useMutationPending } from '@/hooks/use-mutation-pending';
import { rpc } from '@/services/rpc/rpc.client';
import IconChevronLeft from '~icons/lucide/chevron-left';
import type { BotDialogView } from '@/types/bot.types';
import type { BotForm } from '@repo/contracts/universal';

interface BotDialogProps {
  view: BotDialogView
  onClose: () => void
}

export function BotDialog({ view, onClose }: BotDialogProps) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());

  const bot = view.kind === 'create' ? undefined : bots.find((item) => item.id === view.botId);

  const isBusy = useMutationPending([
    rpc.bots.create.mutationKey(),
    rpc.bots.delete.mutationKey(),
    rpc.commands.execute.mutationKey(),
    rpc.routines.update.mutationKey(),
    rpc.routines.remove.mutationKey(),
    rpc.todos.remove.mutationKey(),
  ]);

  return (
    <SectionDialog
      description={m.bots_description()}
      isBusy={isBusy}
      title={m.bots_title()}
      onClose={onClose}
    >
      {view.kind === 'create' ? <BotDialogCreate /> : null}
      {view.kind !== 'create' && bot ? (
        <BotEdit
          bot={bot}
          bots={bots}
          key={bot.id}
          view={view}
        />
      ) : null}
    </SectionDialog>
  );
}

function BotDialogCreate() {
  const navigate = useNavigate();
  const { data: models } = useQuery({ ...rpc.models.list.queryOptions(), retry: false });
  const settings = models ? botDefaultSettings({ models, thinkingLevel: 'medium' }) : null;

  const form = useForm({
    resolver: standardSchemaResolver(botForm),
    defaultValues: {
      avatar: null,
      fallbackModel: null,
      name: m.rooms_bot_default_name(),
      handle: '',
      instructions: '',
      modelProvider: settings?.modelProvider ?? '',
      modelId: settings?.modelId ?? '',
      thinkingLevel: settings?.thinkingLevel ?? 'medium',
      permission: 'ask',
      inherit: ['skills', 'mcp', 'plugins'],
      sharedSkills: null,
      sharedMcp: null,
      disabledSkills: null,
    },
  });

  const create = useBotCreate({
    onCreated: (bot) => void navigate({
      to: '/bots/$botId/$tab',
      params: { botId: bot.id, tab: 'instructions' },
      replace: true,
    }),
  });

  const submit = form.handleSubmit(create.create);

  useEffect(() => {
    function createShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();

      if (create.isPending) {
        return;
      }

      void submit();
    }

    document.addEventListener('keydown', createShortcut);

    return () => document.removeEventListener('keydown', createShortcut);
  }, [create.isPending, submit]);

  return (
    <Form {...form}>
      <SectionDialogNav
        activeKey=""
        footer={(
          <Button
            asChild
            size="sm"
            variant="ghost"
          >
            <Link replace to="/bots">
              <IconChevronLeft />
              {m.bots_back()}
            </Link>
          </Button>
        )}
        header={(
          <div className="flex flex-col gap-4">
            <SectionDialogNavTitle>{m.bots_new()}</SectionDialogNavTitle>
            <BotDialogDraft busy={create.isPending} />
          </div>
        )}
        label={m.bots_new()}
      >
        {null}
      </SectionDialogNav>
      <SectionDialogBody
        description={m.bots_create_hint()}
        footer={(
          <SectionDialogSaveBar
            isPending={create.isPending}
            message={m.bots_new()}
            saveLabel={m.bots_create()}
            onSave={() => void submit()}
          />
        )}
        title={m.bots_create()}
      >
        <form className="flex flex-col gap-8" onSubmit={submit}>
          <fieldset className="contents" disabled={create.isPending}>
            <SettingsGroup isTitleVisible title={m.bots_identity()}>
              <PanelRow className="block">
                <BotFormProfile />
              </PanelRow>
            </SettingsGroup>
            <BotFormModel isGrouped busy={create.isPending} />
          </fieldset>
        </form>
        <FormErrors error={create.problem} />
      </SectionDialogBody>
    </Form>
  );
}

interface BotDialogDraftProps {
  busy: boolean
}

function BotDialogDraft({ busy }: BotDialogDraftProps) {
  const form = useFormContext<BotForm>();
  const [name, handle, modelId] = useWatch({ control: form.control, name: ['name', 'handle', 'modelId'] });
  const { data: models } = useQuery({ ...rpc.models.list.queryOptions(), retry: false });
  const model = models?.find((item) => item.id === modelId);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-2 py-4 text-center">
      <BotFormAvatar busy={busy} density="compact" />
      <div className="mt-1 flex w-full flex-col items-center gap-0.5 border-t pt-4">
        <span className="max-w-full truncate font-medium">{name || m.rooms_bot_default_name()}</span>
        <span className="max-w-full truncate text-xs text-muted-foreground">@{handle || botHandle({ name: name || m.rooms_bot_default_name() })}</span>
        {model ? <span className="mt-2 max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{model.name}</span> : null}
      </div>
    </div>
  );
}
