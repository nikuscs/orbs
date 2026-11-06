import { m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import { MCP } from '../services/mcp/mcp.constants';
import { SETTINGS } from '../services/settings/settings.constants';
import { useBotUpdate } from './use-bot-update';
import { useRpc } from './use-rpc';
import type { BotMcpParams, BotMcpRow } from '../types/bot.types';
import type { SettingsProviderStatus } from '../types/settings.types';

export function useBotMcp({ bot, login: target }: BotMcpParams) {
  const botId = bot.id;
  const { rpc } = useRpc();
  const queryClient = useQueryClient();
  const [started, setStarted] = useState<string | null>(null);

  const login = useQuery({
    ...rpc.mcpAuth.status.queryOptions({ input: { botId, name: started ?? '' } }),
    enabled: started !== null,
    refetchInterval: (query) => (query.state.data === undefined || query.state.data.status === 'pending' ? SETTINGS.providerPollMs : false),
  });

  const discover = useQuery(rpc.mcp.discover.queryOptions({ input: { botId } }));
  const shared = useQuery(rpc.mcp.shared.queryOptions({ input: { botId } }));
  const update = useBotUpdate();

  const sharedNames = [...new Set((shared.data ?? []).map((server) => server.name))].sort((left, right) => left.localeCompare(right));
  const chosen = bot.sharedMcp?.length ? sharedNames.filter((name) => bot.sharedMcp?.includes(name)) : sharedNames;
  const selected = new Set(bot.inherit.includes('mcp') ? chosen : []);
  const servers = discover.data?.servers ?? [];

  const rows: Omit<BotMcpRow, 'needsLogin'>[] = [
    ...servers.map((server) => ({
      name: server.name,
      server,
      isShared: !server.isOwned && sharedNames.includes(server.name),
      isOn: true,
    })),
    ...sharedNames
      .filter((name) => !servers.some((server) => server.name === name))
      .map((name) => ({ name, server: null, isShared: true, isOn: false })),
  ].sort((left, right) => left.name.localeCompare(right.name));

  function toggle(name: string, isOn: boolean) {
    const picked = sharedNames.filter((candidate) => (candidate === name ? isOn : selected.has(candidate)));
    const without = bot.inherit.filter((item) => item !== 'mcp');

    update.mutate({
      botId,
      inherit: picked.length === 0 ? without : [...without, 'mcp'],
      sharedMcp: picked.length === sharedNames.length ? [] : picked,
    });
  }

  const add = useMutation(rpc.mcp.add.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rpc.mcp.discover.key() }),
  }));

  const prepare = useMutation(rpc.mcp.connect.mutationOptions({
    onSuccess: (catalog) => queryClient.setQueryData(rpc.mcp.discover.queryKey({ input: { botId } }), catalog),
  }));

  const { mutate: prepareServers } = prepare;

  useEffect(() => {
    prepareServers({ botId });
  }, [botId, prepareServers]);
  const isDone = login.data !== undefined && login.data.status !== 'pending';
  const pending = isDone ? null : started;

  const refresh = () => queryClient.invalidateQueries({ queryKey: rpc.mcp.discover.key() });

  useEffect(() => {
    if (isDone) {
      void queryClient.invalidateQueries({ queryKey: rpc.mcp.discover.key() });
    }
  }, [isDone, queryClient, rpc]);

  const stop = () => {
    setStarted(null);
    void refresh();
  };

  const start = useMutation(rpc.mcpAuth.start.mutationOptions());
  const complete = useMutation(rpc.mcpAuth.complete.mutationOptions({ onSuccess: stop }));
  const cancel = useMutation(rpc.mcpAuth.cancel.mutationOptions({ onSuccess: stop }));
  const logout = useMutation(rpc.mcpAuth.logout.mutationOptions({ onSuccess: () => void refresh() }));

  async function connect(name: string) {
    queryClient.removeQueries({ queryKey: rpc.mcpAuth.status.key() });
    const { redirectUrl, returnUrl, open } = target();

    const result = await start.mutateAsync({
      botId,
      name,
      redirectUrl,
      returnUrl,
    });

    await match(result)
      .with({ status: 'authorized' }, async () => refresh())
      .with({ status: 'redirect' }, async ({ authorizationUrl }) => {
        setStarted(name);
        await open(authorizationUrl);
        await refresh();
      })
      .exhaustive();
  }

  const status = ({ name, server }: Omit<BotMcpRow, 'needsLogin'>): SettingsProviderStatus => match({ server, isPending: pending === name })
    .with({ server: null }, () => ({ tone: 'default' as const, label: m.bots_mcp_disabled() }))
    .with({ isPending: true }, () => ({ tone: 'warning' as const, label: m.bots_mcp_waiting() }))
    .with({ server: { auth: 'required' } }, () => ({ tone: 'warning' as const, label: m.bots_mcp_login_required() }))
    .with({ server: { status: 'connected' } }, () => ({ tone: 'success' as const, label: m.bots_mcp_connected() }))
    .with({ server: { status: 'connecting' } }, () => ({ tone: 'default' as const, label: m.bots_mcp_connecting() }))
    .with({ server: { status: 'error' } }, () => ({ tone: 'destructive' as const, label: m.bots_mcp_error() }))
    .with({ server: { status: 'disabled' } }, () => ({ tone: 'default' as const, label: m.bots_mcp_disabled() }))
    .otherwise(() => ({ tone: 'default' as const, label: m.bots_mcp_not_connected() }));

  return {
    rows: rows.map((row) => ({ ...row, needsLogin: row.isOn && (pending === row.name || row.server?.auth === 'required') })),
    toggle,
    presets: MCP.presets.filter((preset) => !discover.data?.servers.some((server) => server.name === preset.name)),
    add: (preset: typeof MCP.presets[number]) => add.mutate({
      botId,
      name: preset.name,
      url: preset.url,
    }),
    adding: add.isPending ? add.variables.name : null,
    isEmpty: discover.isSuccess && shared.isSuccess && rows.length === 0,
    pending,
    status,
    isBusy: start.isPending || complete.isPending || cancel.isPending || logout.isPending || update.isPending,
    problem: match({
      isLoadFailed: discover.isError || prepare.isError || shared.isError,
      isLoginFailed: start.isError || complete.isError,
      isAddFailed: add.isError,
    })
      .with({ isLoadFailed: true }, () => m.bots_mcp_load_failed())
      .with({ isLoginFailed: true }, () => m.bots_mcp_failed())
      .with({ isAddFailed: true }, () => m.bots_mcp_add_failed())
      .otherwise(() => null),
    connect: (name: string) => void connect(name).catch(() => setStarted(null)),
    paste: (callbackUrl: string) => pending && complete.mutate({
      botId,
      name: pending,
      callbackUrl,
    }),
    cancel: () => pending && cancel.mutate({ botId, name: pending }),
    logout: (name: string) => logout.mutate({ botId, name }),
  };
}
