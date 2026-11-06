import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useBotUpdate } from '@repo/client/react';
import { botForm } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { Stack, usePreventRemove, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { match, P } from 'ts-pattern';
import { useCSSVariable } from 'uniwind';
import { BotLoadState } from '@/components/bots/bot-load-state';
import { BotSettingsShared } from '@/components/bots/bot-settings-shared';
import { actionSheetShow } from '@/components/ui/action-sheet';
import { useBotShared } from '@/hooks/use-bot-shared';
import { useConnection } from '@/hooks/use-connection';
import type { BotSharedResource } from '@/types/bot-shared.types';
import type { RpcSession } from '@/types/rpc.types';
import type { Bot } from '@repo/contracts/universal';

interface BotSharedScreenProps {
  botId: string;
  resource: BotSharedResource;
}

export function BotSharedScreen({ botId, resource }: BotSharedScreenProps) {
  const { session } = useConnection();

  return match(session)
    .with(P.nonNullable, (current) => (
      <BotSharedScreenLoader
        botId={botId}
        resource={resource}
        session={current}
      />
    ))
    .otherwise(() => null);
}

interface BotSharedScreenLoaderProps {
  session: RpcSession;
  botId: string;
  resource: BotSharedResource;
}

function BotSharedScreenLoader({ session, botId, resource }: BotSharedScreenLoaderProps) {
  const bots = useQuery(session.rpc.bots.list.queryOptions());

  return match(bots.data?.find((item) => item.id === botId))
    .with(P.nonNullable, (bot) => (
      <BotSharedScreenForm
        bot={bot}
        key={bot.id}
        resource={resource}
        session={session}
      />
    ))
    .otherwise(() => (
      <BotLoadState
        isError={bots.isError}
        isMissing={bots.isSuccess}
        onRetry={() => void bots.refetch()}
      />
    ));
}

interface BotSharedScreenFormProps {
  session: RpcSession;
  bot: Bot;
  resource: BotSharedResource;
}

function BotSharedScreenForm({ session, bot, resource }: BotSharedScreenFormProps) {
  const router = useRouter();

  const list = useBotShared({
    session,
    botId: bot.id,
    resource,
  });

  const [primary, primaryForeground] = useCSSVariable(['--color-primary', '--color-primary-foreground']).map(String);

  const form = useForm({
    resolver: standardSchemaResolver(botForm.pick({
      inherit: true,
      sharedSkills: true,
    })),
    resetOptions: { keepDirtyValues: true },
    values: {
      inherit: bot.inherit,
      sharedSkills: bot.sharedSkills,
    },
  });

  const { isDirty } = form.formState;

  const disablePrevention = usePreventRemove(isDirty, ({ repeat }) => actionSheetShow({
    title: m.mobile_bot_discard_title(),
    cancelLabel: m.mobile_bot_keep_editing(),
    choices: [{
      label: m.mobile_bot_discard(),
      isDestructive: true,
      onSelect: () => {
        form.reset();
        repeat();
      },
    }],
  }));

  const save = useBotUpdate(m.bots_saved());

  const submit = form.handleSubmit((input) => save.mutate({
    botId: bot.id,
    inherit: input.inherit,
    [list.field]: input[list.field],
  }, {
    onSuccess: () => {
      disablePrevention();
      form.reset(form.getValues());
      router.back();
    },
  }));

  return (
    <FormProvider {...form}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          disabled={!isDirty || save.isPending}
          style={{ color: primaryForeground }}
          tintColor={primary}
          variant="done"
          onPress={() => void submit()}
        >
          {m.rooms_bot_save()}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <View className="flex-1 bg-background">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerClassName="px-4 pt-4 pb-12"
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <BotSettingsShared
            isDisabled={save.isPending}
            list={list}
            resource={resource}
          />
        </ScrollView>
      </View>
    </FormProvider>
  );
}
