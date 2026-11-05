import { getAgentDir } from '@earendil-works/pi-coding-agent';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { match, P } from 'ts-pattern';
import { mcpDocument, mcpServer } from '@repo/runtime/server';
import { mcpFiles, mcpFilesOwnedPath } from './mcp-files.utils';
import type { McpConfigParams, McpServiceDeps } from '../../types/mcp.types';
import type { McpCatalog } from '@repo/contracts/universal';
import type { McpConfig, McpSource } from '@repo/runtime/server';

export async function mcpQueryConfig(
  deps: McpServiceDeps,
  { botId, paths, isInherited, sharedMcp }: McpConfigParams,
): Promise<McpConfig> {
  const { root } = deps;
  const defaults = [join(getAgentDir(), 'mcp.json'), join(homedir(), '.agents/mcp.json')];
  const directory = join(root, 'agents', botId);
  const localPaths = [join(directory, '.agents/mcp.json'), join(directory, '.pi/mcp.json')];

  const sharedPaths = match(isInherited)
    .with(true, () => [...defaults.filter(existsSync), ...paths])
    .with(false, () => [])
    .exhaustive();

  const sharedSources = sharedPaths.map((path) => ({ path, isBotLocal: false, isOwned: false }));
  const localSources = localPaths.filter(existsSync).map((path) => ({ path, isBotLocal: true, isOwned: false }));

  const ownedPath = mcpFilesOwnedPath(deps, botId);
  const ownedSources = existsSync(ownedPath) ? [{ path: ownedPath, isBotLocal: false, isOwned: true }] : [];

  const sources = await Promise.all([...sharedSources, ...localSources, ...ownedSources].map(async ({ path, isBotLocal, isOwned }) => {
    const source = resolve(root, match(path)
      .with('~', () => homedir())
      .when((value) => value.startsWith('~/'), (value) => join(homedir(), value.slice(2)))
      .otherwise((value) => value));

    try {
      const files = await mcpFiles(source);
      const documents = await Promise.all(files.map(mcpQueryConfigRead));

      return documents.map((document) => ({ ...document, isBotLocal, isOwned }));
    } catch {
      return [{ source, servers: {}, error: 'Cannot read MCP source.', isBotLocal, isOwned }];
    }
  }));

  const servers = new Map<string, McpConfig['servers'][number]>();
  const diagnostics: McpCatalog['diagnostics'] = [];

  for (const { source, servers: entries, error, isBotLocal, isOwned } of sources.flat()) {
    match(error)
      .with(P.string, (message) => diagnostics.push({ source, message }))
      .otherwise(() => undefined);

    const picked = Object.entries(entries).filter(([name]) => isBotLocal || isOwned || sharedMcp === null || sharedMcp.includes(name));

    for (const [name, value] of picked) {
      servers.delete(name);

      match({ result: mcpServer.safeParse(value), isBotLocal })
        // SAFETY: a bot can write its own folder, so its MCP files must not pull stored secrets.
        .with({
          result: { success: true, data: P.union({ envCredentials: P.nonNullable }, { headerCredentials: P.nonNullable }) },
          isBotLocal: true,
        }, () => {
          diagnostics.push({
            source,
            server: name,
            message: 'Bot MCP files cannot use stored credentials. Move this server to a shared MCP file.',
          });
        })
        .with({ result: { success: true } }, ({ result: { data } }) => {
          servers.set(name, {
            name,
            source,
            config: data,
            isBotLocal,
          });
        })
        .with({ result: { success: false } }, () => {
          diagnostics.push({
            source,
            server: name,
            message: 'Invalid MCP server. Expected one stdio command or HTTP URL.',
          });
        })
        .exhaustive();
    }
  }

  return { servers: [...servers.values()], diagnostics };

  async function mcpQueryConfigRead(source: string): Promise<McpSource> {
    try {
      const document = mcpDocument.parse(JSON.parse(await readFile(source, 'utf8')));
      return { source, servers: document.mcpServers };
    } catch {
      return { source, servers: {}, error: 'Cannot read MCP file. Expected JSON with an mcpServers object.' };
    }
  }
}
