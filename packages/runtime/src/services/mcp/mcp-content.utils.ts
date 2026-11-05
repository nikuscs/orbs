import { toLlmContent } from '@earendil-works/pi-mcp';
import { ATTACHMENT } from '@repo/contracts/universal';
import { log } from '@repo/logger/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { match, P } from 'ts-pattern';
import type { McpContentFile, McpContentTarget, McpContentWriteTarget } from '../../types/mcp.types';
import type * as PiMcpTypes from '@earendil-works/pi-mcp';

const maxNameLength = 120;
const maxCollisions = 100;

export async function mcpContent(target: McpContentTarget, result: PiMcpTypes.CallToolResult): Promise<PiMcpTypes.LlmContent[]> {
  if (result.content.length === 0) {
    return toLlmContent(result);
  }

  const parts = await Promise.all(result.content.map(async (block): Promise<PiMcpTypes.LlmContent[]> => {
    const file = mcpContentFile(block);

    return file === undefined ? toLlmContent({ ...result, content: [block] }) : [{ type: 'text', text: await mcpContentSave(target, file) }];
  }));

  return parts.flat();
}

function mcpContentFile(block: PiMcpTypes.ContentBlock): McpContentFile | undefined {
  return match(block)
    .with({ type: 'resource', resource: { blob: P.string } }, (resource) => ({
      uri: resource.resource.uri,
      mimeType: resource.resource.mimeType,
      data: resource.resource.blob,
    }))
    .with({ type: 'audio' }, (audio) => ({ mimeType: audio.mimeType, data: audio.data }))
    .otherwise(() => undefined);
}

function mcpContentName(uri: string | undefined): string {
  const segment = (uri ?? '').split(/[?#]/, 1)[0]?.split('/').pop() ?? '';
  let decoded = segment;

  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }

  const name = decoded.replace(/[^A-Za-z0-9._ -]/g, '_').trim().replace(/^\.+/, '').slice(0, maxNameLength).trim();

  return name === '' ? 'attachment' : name;
}

function mcpContentExtension(name: string, mimeType: string | undefined): string | undefined {
  const mime = mimeType?.split(';', 1)[0]?.trim().toLowerCase();
  const own = extname(name).slice(1).toLowerCase();

  return Object.entries(ATTACHMENT.sendTypes).find(([extension]) => extension === own)?.[0]
    ?? Object.entries(ATTACHMENT.sendTypes).find(([, type]) => type === mime)?.[0];
}

async function mcpContentSave({ root, botId }: McpContentTarget, file: McpContentFile): Promise<string> {
  const name = mcpContentName(file.uri);
  const bytes = Buffer.from(file.data, 'base64');
  const extension = mcpContentExtension(name, file.mimeType);
  const label = `${name} (${file.mimeType ?? 'unknown'}, ${bytes.byteLength} bytes)`;

  if (extension === undefined || bytes.byteLength > ATTACHMENT.sendMaxBytes) {
    return `[File not saved: ${label} is not an allowed type or is too large.]`;
  }

  const base = extname(name).slice(1).toLowerCase() === extension ? name.slice(0, -(extension.length + 1)) : name;
  const directory = join(root, 'agents', botId, 'downloads');

  try {
    await mkdir(directory, { recursive: true });

    const fileName = await mcpContentWrite({
      directory,
      base,
      extension,
      bytes,
    }, 1);

    return match(fileName)
      .with(P.string, (saved) => `[Saved file: downloads/${saved} (${file.mimeType ?? 'unknown'}, ${bytes.byteLength} bytes). It is in your folder; use your file tools to move or send it.]`)
      .otherwise(() => `[File not saved: ${name}: could not find a free file name.]`);
  } catch (error) {
    log.warn({
      tag: 'mcp',
      message: 'Could not save an MCP file.',
      botId,
      error,
    });

    return `[File not saved: ${name}: could not write the file.]`;
  }
}

async function mcpContentWrite(target: McpContentWriteTarget, attempt: number): Promise<string | undefined> {
  if (attempt > maxCollisions) {
    return undefined;
  }

  const fileName = `${attempt === 1 ? target.base : `${target.base} (${attempt})`}.${target.extension}`;

  try {
    await writeFile(join(target.directory, fileName), target.bytes, { flag: 'wx' });

    return fileName;
  } catch (error) {
    return match(error)
      .with({ code: 'EEXIST' }, () => mcpContentWrite(target, attempt + 1))
      .otherwise(() => {
        throw error;
      });
  }
}
