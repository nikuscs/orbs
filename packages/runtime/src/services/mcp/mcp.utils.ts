import { createHash } from 'node:crypto';
import type { McpEntry } from '../../types/mcp.types';

export function mcpFingerprint(entry: McpEntry): string {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
}

export function mcpToolName(server: string, tool: string, fingerprint: string): string {
  const prefix = `mcp_${server}_${tool}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 25);
  const suffix = createHash('sha256').update(JSON.stringify([server, tool, fingerprint])).digest('hex').slice(0, 24);
  return `${prefix}_${suffix}`;
}
