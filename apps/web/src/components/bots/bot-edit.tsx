import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useBotDelete, useBotUpdate, useChatReset } from '@repo/client/react';
import { botForm } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { BotMcpPanel } from '@repo/ui/bots/bot-mcp-panel';
import { Button } from '@repo/ui/button';
import { Form, FormErrors } from '@repo/ui/forms/form';
import { PanelContent, PanelDescription, PanelRow, PanelTitle } from '@repo/ui/panel';
import { SectionDialogBody, SectionDialogSaveBar } from '@repo/ui/section-dialog';
import { SettingsConfirm } from '@repo/ui/settings/settings-confirm';
import { SettingsGroup } from '@repo/ui/settings/settings-group';
import { SettingsSubview } from '@repo/ui/settings/settings-subview';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { match, P } from 'ts-pattern';
import { BotDialogNav } from '@/components/bots/bot-dialog-nav';
import { BotFormSection } from '@/components/bots/bot-form-section';
import { BotFormSkills } from '@/components/bots/bot-form-skills';
import { BotMcpRemove } from '@/components/bots/bot-mcp-remove';
import { RoutinesEdit } from '@/components/routines/routines-edit';
import { RoutinesList } from '@/components/routines/routines-list';
import { TodosList } from '@/components/todos/todos-list';
import { BOT_FORM_SECTIONS, BOT_NAV } from '@/services/bot/bot.constants';
import { rpc } from '@/services/rpc/rpc.client';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconTrash from '~icons/lucide/trash-2';
import type { BotDialogView } from '@/types/bot.types';
import type { Bot, BotForm, BotSection } from '@repo/contracts/universal';

interface BotEditProps {
  bot: Bot
  bots: Bot[]
  view: Exclude<BotDialogView, { kind: 'create' }>
}

export function BotEdit({ bot, bots, view }: BotEditProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const form = useForm({
    resolver: standardSchemaResolver(botForm),
    resetOptions: { keepDirtyValues: true },
    values: {
      avatar: bot.avatar,
      fallbackModel: bot.fallbackModel,
      name: bot.name,
      handle: bot.handle,
      instructions: bot.instructions,
      modelProvider: bot.modelProvider,
      modelId: bot.modelId,
      thinkingLevel: bot.thinkingLevel,
      permission: bot.permission,
      inherit: bot.inherit,
      sharedSkills: bot.sharedSkills,
      sharedMcp: bot.sharedMcp,
      disabledSkills: bot.disabledSkills,
    },
  });

  const save = useBotUpdate(m.bots_saved());

  const section = match(view)
    .returnType<BotSection>()
    .with({ kind: 'section' }, ({ section: current }) => current)
    .with({ kind: 'routine-edit' }, { kind: 'routine-delete' }, () => 'routines')
    .with({ kind: 'todo-delete' }, () => 'todos')
    .with({ kind: 'mcp-remove' }, () => 'mcp')
    .with({ kind: 'delete' }, { kind: 'reset' }, () => 'danger')
    .exhaustive();

  const current = BOT_NAV.find((item) => item.id === section) ?? BOT_NAV[0];
  const isSubview = view.kind !== 'section';

  function openSection(tab: BotSection) {
    void navigate({
      to: '/bots/$botId/$tab',
      params: { botId: bot.id, tab },
      replace: true,
    });
  }

  const submit = form.handleSubmit(
    ({ sharedMcp: _mcp, ...input }: BotForm) => save.mutate({
      ...input,
      inherit: [...input.inherit.filter((resource) => resource !== 'mcp'), ...bot.inherit.filter((resource) => resource === 'mcp')],
      handle: input.handle === '' ? bot.handle : input.handle,
      botId: bot.id,
    }, {
      onSuccess: () => {
        form.reset(form.getValues());
        void router.invalidate();
      },
    }),
    (errors) => {
      const failed = Object.entries(BOT_FORM_SECTIONS).find(([field]) => field in errors);

      if (failed && failed[1] !== section) {
        openSection(failed[1]);
      }
    },
  );

  useEffect(() => {
    function saveShortcut(event: KeyboardEvent) {
      if (isSubview || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();

      if (!form.formState.isDirty || save.isPending) {
        return;
      }

      void submit();
    }

    document.addEventListener('keydown', saveShortcut);

    return () => document.removeEventListener('keydown', saveShortcut);
  }, [form, isSubview, save.isPending, submit]);

  return (
    <>
      <BotDialogNav
        bot={bot}
        bots={bots}
        section={section}
      />
      <SectionDialogBody
        description={isSubview ? undefined : current.description()}
        footer={form.formState.isDirty ? (
          <SectionDialogSaveBar
            isPending={save.isPending}
            onDiscard={() => form.reset(undefined, { keepDirtyValues: false })}
            onSave={() => void submit()}
          />
        ) : null}
        key={`${view.kind}-${section}`}
        title={isSubview ? undefined : current.label()}
      >
        <Form {...form}>
          {match(view)
            .with({ kind: 'section', section: P.union('profile', 'instructions', 'model', 'tools') }, ({ section: formSection }) => (
              <BotFormSection
                busy={save.isPending}
                section={formSection}
                onSubmit={() => void submit()}
              />
            ))
            .with({ kind: 'section', section: 'skills' }, () => (
              <form onSubmit={submit}>
                <fieldset className="contents" disabled={save.isPending}>
                  <BotFormSkills botId={bot.id} busy={save.isPending} />
                </fieldset>
              </form>
            ))
            .with({ kind: 'section', section: 'mcp' }, () => <BotMcpPanel bot={bot} />)
            .with({ kind: 'section', section: 'todos' }, () => <TodosList bot={bot} />)
            .with({ kind: 'section', section: 'routines' }, () => <RoutinesList bot={bot} />)
            .with({ kind: 'section', section: 'danger' }, () => <BotEditDanger bot={bot} isDeletable={bots.length > 1} />)
            .with({ kind: 'delete' }, () => (bots.length > 1
              ? <BotEditDelete bot={bot} onBack={() => openSection('danger')} />
              : <BotEditDanger bot={bot} isDeletable={false} />))
            .with({ kind: 'reset' }, () => <BotEditReset bot={bot} onBack={() => openSection('danger')} />)
            .with({ kind: 'routine-edit' }, ({ routineId }) => (
              <BotEditRoutine
                bot={bot}
                routineId={routineId}
                onBack={() => openSection('routines')}
              />
            ))
            .with({ kind: 'routine-delete' }, ({ routineId }) => (
              <BotEditRoutineDelete
                bot={bot}
                routineId={routineId}
                onBack={() => openSection('routines')}
              />
            ))
            .with({ kind: 'todo-delete' }, ({ todoId }) => (
              <BotEditTodoDelete
                bot={bot}
                todoId={todoId}
                onBack={() => openSection('todos')}
              />
            ))
            .with({ kind: 'mcp-remove' }, ({ server }) => <BotMcpRemove bot={bot} server={server} />)
            .exhaustive()}
        </Form>
      </SectionDialogBody>
    </>
  );
}

interface BotEditDangerProps {
  bot: Bot
  isDeletable: boolean
}

function BotEditDanger({ bot, isDeletable }: BotEditDangerProps) {
  return (
    <SettingsGroup title={m.bots_danger()}>
      <PanelRow className="flex-wrap">
        <PanelContent>
          <PanelTitle>{m.bots_reset_chat()}</PanelTitle>
          <PanelDescription>{m.bots_reset_chat_hint()}</PanelDescription>
        </PanelContent>
        <Button
          asChild
          size="sm"
          variant="outline"
        >
          <Link
            replace
            params={{ botId: bot.id }}
            to="/bots/$botId/reset"
          >
            <IconRotateCcw />
            {m.bots_reset_chat()}
          </Link>
        </Button>
      </PanelRow>
      <PanelRow className="flex-wrap">
        <PanelContent>
          <PanelTitle>{m.rooms_bot_delete()}</PanelTitle>
          <PanelDescription>{isDeletable ? m.bots_delete_hint() : m.bots_delete_last()}</PanelDescription>
        </PanelContent>
        {isDeletable ? (
          <Button
            asChild
            size="sm"
            variant="destructive"
          >
            <Link
              replace
              params={{ botId: bot.id }}
              to="/bots/$botId/delete"
            >
              <IconTrash />
              {m.rooms_bot_delete()}
            </Link>
          </Button>
        ) : null}
      </PanelRow>
    </SettingsGroup>
  );
}

interface BotEditResetProps {
  bot: Bot
  onBack: () => void
}

function BotEditReset({ bot, onBack }: BotEditResetProps) {
  const reset = useChatReset({ botId: bot.id, onDone: onBack });

  return (
    <SettingsSubview
      backLabel={m.bots_danger()}
      description={m.rooms_reset_description({ bot: bot.name })}
      isBackDisabled={reset.isPending}
      title={m.rooms_reset_title({ bot: bot.name })}
      onBack={onBack}
    >
      <SettingsGroup title={m.bots_reset_chat()}>
        <SettingsConfirm
          confirmLabel={m.rooms_member_reset()}
          confirmText={bot.name}
          error={reset.problem}
          pending={reset.isPending}
          onCancel={onBack}
          onConfirm={reset.reset}
        />
      </SettingsGroup>
    </SettingsSubview>
  );
}

interface BotEditDeleteProps {
  bot: Bot
  onBack: () => void
}

function BotEditDelete({ bot, onBack }: BotEditDeleteProps) {
  const navigate = useNavigate();
  const remove = useBotDelete({ botId: bot.id, onDeleted: () => navigate({ to: '/bots', replace: true }) });

  return (
    <SettingsSubview
      backLabel={m.bots_danger()}
      description={m.rooms_bot_delete_description()}
      isBackDisabled={remove.isPending}
      title={m.rooms_bot_delete_title({ bot: bot.name })}
      onBack={onBack}
    >
      <SettingsGroup title={m.rooms_bot_delete()}>
        <SettingsConfirm
          confirmLabel={m.rooms_bot_delete()}
          confirmText={bot.name}
          error={remove.problem}
          pending={remove.isPending}
          onCancel={onBack}
          onConfirm={remove.remove}
        />
      </SettingsGroup>
    </SettingsSubview>
  );
}

interface BotEditRoutineProps {
  bot: Bot
  routineId: string
  onBack: () => void
}

function BotEditRoutine({ bot, routineId, onBack }: BotEditRoutineProps) {
  const list = useQuery(rpc.routines.list.queryOptions({ input: { botId: bot.id } }));
  const routine = list.data?.find((item) => item.id === routineId);

  return match({ routine, isError: list.isError })
    .with({ routine: P.nonNullable }, ({ routine: found }) => (
      <SettingsSubview
        backLabel={m.rooms_routines()}
        description={m.rooms_routines_edit_hint()}
        title={m.rooms_routines_edit_title({ name: found.name })}
        onBack={onBack}
      >
        <RoutinesEdit
          bot={bot}
          routine={found}
          onDone={onBack}
        />
      </SettingsSubview>
    ))
    .with({ isError: true }, () => <FormErrors error={m.rooms_routines_error()} />)
    .otherwise(() => null);
}

interface BotEditRoutineDeleteProps {
  bot: Bot
  routineId: string
  onBack: () => void
}

function BotEditRoutineDelete({ bot, routineId, onBack }: BotEditRoutineDeleteProps) {
  const queryClient = useQueryClient();
  const list = useQuery(rpc.routines.list.queryOptions({ input: { botId: bot.id } }));
  const routine = list.data?.find((item) => item.id === routineId);

  const remove = useMutation(rpc.routines.remove.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rpc.routines.key() });
      onBack();
    },
  }));

  return match({ routine, isError: list.isError })
    .with({ routine: P.nonNullable }, ({ routine: found }) => (
      <SettingsSubview
        backLabel={m.rooms_routines()}
        description={m.rooms_routines_delete_description({ bot: bot.name })}
        isBackDisabled={remove.isPending}
        title={m.rooms_routines_delete_title({ name: found.name })}
        onBack={onBack}
      >
        <SettingsGroup title={m.rooms_routines_delete()}>
          <SettingsConfirm
            confirmLabel={m.rooms_routines_delete()}
            error={remove.isError ? m.rooms_routines_action_failed() : null}
            pending={remove.isPending}
            onCancel={onBack}
            onConfirm={() => remove.mutate({ botId: bot.id, routineId: found.id })}
          />
        </SettingsGroup>
      </SettingsSubview>
    ))
    .with({ isError: true }, () => <FormErrors error={m.rooms_routines_error()} />)
    .otherwise(() => null);
}

interface BotEditTodoDeleteProps {
  bot: Bot
  todoId: string
  onBack: () => void
}

function BotEditTodoDelete({ bot, todoId, onBack }: BotEditTodoDeleteProps) {
  const queryClient = useQueryClient();
  const list = useQuery(rpc.todos.list.queryOptions({ input: { botId: bot.id } }));
  const todo = list.data?.find((item) => String(item.id) === todoId);

  const remove = useMutation(rpc.todos.remove.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rpc.todos.key() });
      onBack();
    },
  }));

  return match({ todo, isError: list.isError })
    .with({ todo: P.nonNullable }, ({ todo: found }) => (
      <SettingsSubview
        backLabel={m.rooms_todos()}
        description={m.rooms_todos_delete_description({ bot: bot.name })}
        isBackDisabled={remove.isPending}
        title={m.rooms_todos_delete_title({ title: found.title })}
        onBack={onBack}
      >
        <SettingsGroup title={m.rooms_todos_delete()}>
          <SettingsConfirm
            confirmLabel={m.rooms_todos_delete()}
            error={remove.isError ? m.rooms_todos_action_failed() : null}
            pending={remove.isPending}
            onCancel={onBack}
            onConfirm={() => remove.mutate({ botId: bot.id, todoId: found.id })}
          />
        </SettingsGroup>
      </SettingsSubview>
    ))
    .with({ isError: true }, () => <FormErrors error={m.rooms_todos_error()} />)
    .otherwise(() => null);
}
