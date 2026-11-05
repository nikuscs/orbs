import { z } from 'zod';
import type { RPCSchema } from 'electrobun';

export const desktopNetwork = z.enum(['all', 'local', 'custom']);

const desktopTheme = z.enum(['light', 'dark']);
export type DesktopTheme = z.infer<typeof desktopTheme>;

export const desktopMenuClick = z.object({ data: z.object({ action: z.string() }) });

export const desktopConnectionMessage = z.object({ data: z.object({ detail: z.object({ connection: z.literal(true) }) }) });

export const desktopThemeMessage = z.object({ data: z.object({ detail: z.object({ theme: desktopTheme }) }) });

const desktopNotify = z.object({
  title: z.string(),
  body: z.string(),
  botId: z.uuid().optional(),
});

export const desktopNotifyMessage = z.object({ data: z.object({ detail: z.object({ notify: desktopNotify }) }) });

export type DesktopNotify = z.infer<typeof desktopNotify>;

export interface DesktopNotifyParams {
  notify: DesktopNotify;
  serverUrl: string;
}

export const desktopPairMessage = z.object({ data: z.object({ detail: z.object({ pair: z.literal(true) }) }) });

export const desktopCopyMessage = z.object({ data: z.object({ detail: z.object({ copy: z.string() }) }) });

export const desktopTitleBarMessage = z.object({ data: z.object({ detail: z.object({ titleBar: z.literal('double-click') }) }) });

export const desktopNewWindow = z.object({ data: z.object({ detail: z.object({ url: z.url({ protocol: /^https?$/u }) }) }) });

export const desktopSettings = z.object({
  network: desktopNetwork,
  host: z.string().trim().min(1).optional(),
}).refine((settings) => settings.network !== 'custom' || Boolean(settings.host));

export type DesktopSettings = z.infer<typeof desktopSettings>;

const desktopFrame = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export type DesktopFrame = z.infer<typeof desktopFrame>;

export const desktopState = z.object({
  appPid: z.number().int().optional(),
  serverPids: z.array(z.number().int()).optional(),
  network: desktopNetwork.optional(),
  host: z.string().trim().min(1).optional(),
  window: desktopFrame.optional(),
  connection: z.union([z.literal('local'), z.url()]).optional(),
});

export type DesktopState = z.infer<typeof desktopState>;

export const desktopTailscaleStatus = z.object({
  BackendState: z.string(),
  Self: z.object({ DNSName: z.string(), TailscaleIPs: z.array(z.string()) }),
  Peer: z.record(z.string(), z.object({
    DNSName: z.string(),
    TailscaleIPs: z.array(z.string()),
    Online: z.boolean().optional(),
  })).optional(),
});

/** App name and bundle ID that electrobun.config.ts stores in the build. */
export const desktopBuild = z.object({ name: z.string().min(1), identifier: z.string().min(1) });

export const desktopHealth = z.object({ status: z.literal('ok'), app: z.literal('bots') });

export type DesktopTailscale = 'running' | 'stopped' | 'missing';

export type DesktopProbe = { status: 'invalid' } | { status: 'ok' | 'self' | 'foreign' | 'unreachable'; url: string };

export interface DesktopOrigins {
  tailscale: DesktopTailscale;
  urls: string[];
}

export interface DesktopServer extends DesktopOrigins {
  url: string;
  daemonEntry: string[];
  port: number;
  portFallback: boolean;
  exited: Promise<number>;
  stop: () => Promise<void>;
}

export interface DesktopSaveResult {
  error?: string;
}

export type DesktopConnectScreen = 'choose' | 'unreachable';

export interface DesktopFound {
  name: string;
  url: string;
}

export interface DesktopConnectView {
  name: string;
  screen: DesktopConnectScreen;
  remote: boolean;
  address: string;
  current: { address: string; network: 'local' | 'tailscale' | 'unknown' } | null;
}

export const desktopConnectParams = z.object({ address: z.string().optional() });

export type DesktopConnectParams = z.infer<typeof desktopConnectParams>;

export interface DesktopRPC {
  bun: RPCSchema<{
    requests: {
      connectLoad: { params: undefined; response: DesktopConnectView };
      connectHealth: { params: undefined; response: boolean };
      connect: { params: DesktopConnectParams; response: DesktopSaveResult };
      connectRetry: { params: undefined; response: DesktopSaveResult };
      connectFind: { params: undefined; response: DesktopFound[] };
    };
    messages: Record<never, never>;
  }>;
  webview: RPCSchema<{ requests: Record<never, never>; messages: Record<never, never> }>;
}
