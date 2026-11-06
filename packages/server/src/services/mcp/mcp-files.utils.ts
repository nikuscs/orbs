import { mkdir, readdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { match } from 'ts-pattern';
import { mcpDocument } from '@repo/runtime/server';
import { MCP } from './mcp.constants';
import type { McpServiceDeps } from '../../types/mcp.types';

export async function mcpFiles(path: string, visited = new Set<string>()): Promise<string[]> {
  const canonical = await realpath(path);

  return match(visited.has(canonical))
    .with(true, () => [])
    .with(false, async () => {
      const ancestors = new Set([...visited, canonical]);
      const entry = await stat(canonical);

      return match(entry.isDirectory())
        .with(false, () => [canonical])
        .with(true, async () => {
          const entries = await readdir(canonical, { withFileTypes: true });

          const results = await Promise.all(entries
            .filter((child) => !['node_modules', '.git'].includes(child.name))
            .map(async (child) => {
              const childPath = join(canonical, child.name);

              const isDirectory = child.isDirectory()
              || (child.isSymbolicLink() && (await stat(childPath)).isDirectory());

              const shouldScan = isDirectory || child.name === 'mcp.json' || child.name.endsWith('.mcp.json');

              return match(shouldScan)
                .with(true, () => mcpFiles(childPath, ancestors))
                .with(false, () => [])
                .exhaustive();
            }));

          return [...new Set(results.flat())].sort();
        })
        .exhaustive();
    })
    .exhaustive();
}

export function mcpFilesOwnedPath({ root }: Pick<McpServiceDeps, 'root'>, botId: string) {
  return join(root, 'data', 'bots', botId, MCP.ownedFile);
}

export async function mcpFilesRead(deps: Pick<McpServiceDeps, 'root'>, botId: string) {
  const path = mcpFilesOwnedPath(deps, botId);

  try {
    return mcpDocument.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    return match(error)
      .with({ code: 'ENOENT' }, () => ({ mcpServers: {} }))
      .otherwise((failure) => {
        throw failure;
      });
  }
}

export async function mcpFilesWrite(deps: Pick<McpServiceDeps, 'root'>, botId: string, document: Awaited<ReturnType<typeof mcpFilesRead>>) {
  const path = mcpFilesOwnedPath(deps, botId);
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;

  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

export function mcpFilesDerivedKey(botId: string, name: string, index: number) {
  return `${MCP.derivedPrefix}${botId}.${name}.${index}`;
}

export async function mcpFilesDerivedClear(deps: Pick<McpServiceDeps, 'credentials'>, botId: string, name: string, fromIndex = 0) {
  const clears = Array.from({ length: MCP.maxHeaders - fromIndex }, (_, offset) => ({ key: mcpFilesDerivedKey(botId, name, fromIndex + offset), value: null }));
  const { set } = deps.credentials.actions;
  await Promise.all(clears.map((clear) => set(clear)));
}
