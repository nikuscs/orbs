import { m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import { MCP_PRESETS } from '../services/mcp/mcp.constants';
import { SETTINGS } from '../services/settings/settings.constants';
import { useRpc } from './use-rpc';
import type { BotMcpParams } from '../types/bot.types';
import type { SettingsProviderStatus } from '../types/settings.types';
import type { McpCatalog } from '@repo/contracts/universal';

export function useBotMcp({ botId, login: target }: BotMcpParams) {
  const { rpc } = useRpc();
  const queryClient = useQueryClient();
  const [started, setStarted] = useState<string | null>(null);

  const login = useQuery({
    ...rpc.mcpAuth.status.queryOptions({ input: { botId, name: started ?? '' } }),
    enabled: started !== null,
    refetchInterval: (query) => (query.state.data === undefined || query.state.data.status === 'pending' ? SETTINGS.providerPollMs : false),
  });

  const discover = useQuery(rpc.mcp.discover.queryOptions({ input: { botId } }));

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

  const status = (server: McpCatalog['servers'][number]): SettingsProviderStatus => match({ server, isPending: pending === server.name })
    .with({ isPending: true }, () => ({ tone: 'warning' as const, label: m.bots_mcp_waiting() }))
    .with({ server: { auth: 'required' } }, () => ({ tone: 'warning' as const, label: m.bots_mcp_login_required() }))
    .with({ server: { status: 'connected' } }, () => ({ tone: 'success' as const, label: m.bots_mcp_connected() }))
    .with({ server: { status: 'connecting' } }, () => ({ tone: 'default' as const, label: m.bots_mcp_connecting() }))
    .with({ server: { status: 'error' } }, () => ({ tone: 'destructive' as const, label: m.bots_mcp_error() }))
    .with({ server: { status: 'disabled' } }, () => ({ tone: 'default' as const, label: m.bots_mcp_disabled() }))
    .otherwise(() => ({ tone: 'default' as const, label: m.bots_mcp_not_connected() }));

  return {
    servers: discover.data?.servers ?? [],
    presets: MCP_PRESETS.map((preset) => ({
      ...preset,
      isAdded: discover.data?.servers.some((server) => server.name === preset.name) ?? false,
      description: match(preset.name)
        .with('cloudflare', () => m.bots_mcp_preset_cloudflare())
        .with('linear', () => m.bots_mcp_preset_linear())
        .with('notion', () => m.bots_mcp_preset_notion())
        .with('sentry', () => m.bots_mcp_preset_sentry())
        .exhaustive(),
    })),
    add: (preset: typeof MCP_PRESETS[number]) => add.mutate({
      botId,
      name: preset.name,
      url: preset.url,
    }),
    adding: add.isPending ? add.variables.name : null,
    isEmpty: discover.data?.servers.length === 0,
    pending,
    status,
    isBusy: start.isPending || complete.isPending || cancel.isPending || logout.isPending,
    problem: match({
      isLoadFailed: discover.isError || prepare.isError,
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
