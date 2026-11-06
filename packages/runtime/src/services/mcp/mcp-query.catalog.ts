import { match, P } from 'ts-pattern';
import { mcpFingerprint } from './mcp.utils';
import type { McpClientParams, McpClientServiceDeps } from '../../types/mcp.types';
import type { McpCatalog } from '@repo/contracts/universal';

export async function mcpQueryCatalog(deps: McpClientServiceDeps, { botId, config }: McpClientParams): Promise<McpCatalog> {
  const diagnostics = [...config.diagnostics];

  const servers = config.servers.map((entry) => {
    const saved = deps.connections.get(`${botId}:${entry.name}`);
    const sourceFingerprint = entry.sourceFingerprint ?? mcpFingerprint(entry);
    const connection = saved?.sourceFingerprint === sourceFingerprint ? saved : undefined;
    const isEnabled = entry.config.enabled !== false && entry.config.disabled !== true;

    const status = match({ isEnabled, connection })
      .with({ isEnabled: false }, () => 'disabled' as const)
      .with({ connection: { error: P.string } }, () => 'error' as const)
      .with({ connection: { client: { connectionState: 'connected' } } }, () => 'connected' as const)
      .with({ connection: { client: { connectionState: 'connecting' } } }, () => 'connecting' as const)
      .otherwise(() => 'disconnected' as const);

    match(connection?.error)
      .with(P.string, (message) => diagnostics.push({
        source: entry.source,
        server: entry.name,
        message,
      }))
      .otherwise(() => undefined);

    return {
      name: entry.name,
      description: entry.config.description ?? '',
      source: entry.source,
      transport: entry.config.command === undefined ? 'http' as const : 'stdio' as const,
      isEnabled,
      status,
      auth: match(connection)
        .with({ needsLogin: true }, () => 'required' as const)
        .with({ authProvider: P.nonNullable }, () => 'authorized' as const)
        .otherwise(() => 'none' as const),
      isOwned: entry.isOwned === true,
      tools: status === 'connected' ? connection?.catalog ?? [] : [],
    };
  });

  return { servers, diagnostics };
}
