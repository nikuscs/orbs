import { m } from '@repo/i18n/client';
import Electrobun, { ApplicationMenu, BrowserView, BrowserWindow, PATHS, Screen, Tray, Utils } from 'electrobun/main';
import { DESKTOP_BUILD } from './desktop-build';
import { desktopNetworkFind, desktopNetworkHost, desktopNetworkProbe, desktopNetworkSelf, desktopNetworkTailscale } from './desktop-network';
import { desktopNotify } from './desktop-notify';
import { desktopProcessRuns, desktopServerLeftovers, desktopServerPairLink, desktopServerStart } from './desktop-server';
import { desktopLoginEnabled, desktopLoginSet, desktopSettingsPrompt, desktopSettingsRead, desktopSettingsWrite, desktopStateRead, desktopStateWrite } from './desktop-settings';
import { desktopWindowAppearance, desktopWindowTitleBarDoubleClick, desktopWindowToolbar } from './desktop-window';
import { DESKTOP } from './desktop.constants';
import { desktopConnectionMessage, desktopConnectParams, desktopCopyMessage, desktopMenuClick, desktopNetwork, desktopNewWindow, desktopNotifyMessage, desktopPairMessage, desktopSettings, desktopThemeMessage, desktopTitleBarMessage } from './types/desktop.types';
import type * as DesktopTypes from './types/desktop.types';
import type { ElectrobunEvent } from 'electrobun/main';

let server: DesktopTypes.DesktopServer | null = null;
let mainWindow: BrowserWindow | null = null;
let connectWindow: BrowserWindow | null = null;
let connectScreen: DesktopTypes.DesktopConnectScreen = 'choose';
let operation: Promise<void> | null = null;
let quitting: Promise<void> | null = null;
let quitReady = false;
let frameTimer: Timer | undefined;
let tray: Tray | null = null;

const appName = DESKTOP_BUILD.name;

const headless = process.env[DESKTOP.headless.env] === '1';
const atLogin = process.env[DESKTOP.login.env] === '1';
// Electrobun always enables the WebKit inspector, so release builds hide the native menu that offers "Inspect Element".
const nativeMenuBlock = process.env.DESKTOP_WEB_DEV ? '' : "window.addEventListener('contextmenu', (event) => event.preventDefault());";
// The webview has no navigator.clipboard on plain-http remote origins, so copies always go through the host.
const clipboardBridge = "{ const copy = (text) => { window.__electrobunSendToHost({ copy: String(text) }); return Promise.resolve(); }; if (navigator.clipboard) navigator.clipboard.writeText = copy; else Object.defineProperty(navigator, 'clipboard', { value: { writeText: copy } }); }";
// Electrobun drags the window from JS, so macOS never sees a title bar double-click; forward it to the host.
// This Mac's own daemon pairs the app without a code: the connect page asks the host for a one-time link.
const pairBridge = "if (location.pathname === '/connect' && !location.hash.includes('code=')) window.__electrobunSendToHost({ pair: true });";
const titleBarBridge = "window.addEventListener('dblclick', (event) => { const target = event.target instanceof Element ? event.target : null; if (target?.closest('.electrobun-webkit-app-region-drag') && !target.closest('.electrobun-webkit-app-region-no-drag')) window.__electrobunSendToHost({ titleBar: 'double-click' }); });";

function desktopDockSync(): void {
  Utils.setDockIconVisible(Boolean(mainWindow ?? connectWindow));
}

function desktopRemote(): string | undefined {
  const { connection } = desktopStateRead();

  return connection === 'local' ? undefined : connection;
}

function desktopTrayRender(): void {
  const settings = desktopSettingsRead();
  const busy = Boolean(operation ?? quitting);
  const remote = headless ? undefined : desktopRemote();
  const local = headless || desktopStateRead().connection === 'local';
  const remoteStatus = remote ? m.desktop_tray_remote({ name: appName, host: new URL(remote).host }) : undefined;
  const status = remoteStatus ?? (server ? m.desktop_tray_running({ name: appName }) : m.desktop_tray_stopped({ name: appName }));

  tray?.setMenu([
    { type: 'normal', label: busy ? m.desktop_saving({ name: appName }) : status, enabled: false },
    { type: 'separator' },
    { type: 'normal', label: m.desktop_tray_open({ name: appName }), action: 'open', enabled: !busy },
    { type: 'normal', label: m.desktop_tray_retry({ name: appName }), action: 'retry', hidden: !local || Boolean(server), enabled: !busy },
    { type: 'normal', label: m.desktop_connect_menu(), action: 'connect', enabled: !busy, hidden: headless },
    {
      type: 'normal',
      label: m.desktop_field_network(),
      enabled: !busy,
      hidden: !local,
      submenu: [
        { type: 'normal', label: m.desktop_network_all(), action: 'network:all', checked: settings.network === 'all' },
        { type: 'normal', label: m.desktop_network_local(), action: 'network:local', checked: settings.network === 'local' },
        { type: 'normal', label: m.desktop_network_custom(), action: 'network:custom', checked: settings.network === 'custom' },
        { type: 'normal', label: settings.host ?? '', enabled: false, hidden: settings.network !== 'custom' },
      ],
    },
    {
      type: 'normal',
      label: m.desktop_urls({ name: appName }),
      enabled: Boolean(server) && !busy,
      hidden: !local,
      submenu: (server?.urls ?? []).map((url) => ({
        type: 'normal',
        label: url,
        submenu: [
          { type: 'normal', label: m.desktop_open(), action: `url:open:${url}` },
          { type: 'normal', label: m.desktop_copy(), action: `url:copy:${url}` },
        ],
      })),
    },
    { type: 'normal', label: m.desktop_tailscale_stopped(), enabled: false, hidden: server?.tailscale !== 'stopped' },
    { type: 'normal', label: m.desktop_tailscale_missing(), enabled: false, hidden: server?.tailscale !== 'missing' },
    { type: 'normal', label: m.desktop_port_fallback({ name: appName, port: DESKTOP.ports[0] }), enabled: false, hidden: !server?.portFallback },
    ...headless ? [] : [
      { type: 'normal', label: m.desktop_tray_login(), action: 'login', checked: desktopLoginEnabled() },
      { type: 'separator' },
      { type: 'normal', label: m.desktop_tray_quit({ name: appName }), action: 'quit', enabled: !busy },
    ] as const,
  ]);
}

function desktopFrameVisible(frame: DesktopTypes.DesktopFrame): boolean {
  return Screen.getAllDisplays().some(({ workArea }) => frame.x < workArea.x + workArea.width
    && frame.x + frame.width > workArea.x
    && frame.y < workArea.y + workArea.height
    && frame.y + frame.height > workArea.y);
}

function desktopFrameDefault(): DesktopTypes.DesktopFrame {
  const { workArea } = Screen.getPrimaryDisplay();
  const width = Math.min(DESKTOP.mainWindow.width, workArea.width);
  const height = Math.min(DESKTOP.mainWindow.height, workArea.height);

  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
    width,
    height,
  };
}

function desktopFrameSave(): void {
  clearTimeout(frameTimer);
  frameTimer = setTimeout(() => {
    if (mainWindow) {
      desktopStateWrite({ window: mainWindow.getFrame() });
    }
  }, DESKTOP.saveDelayMs);
}

function desktopMainOpen(url: string): void {
  mainWindow?.close();

  const saved = desktopStateRead().window;

  const window = new BrowserWindow({
    title: appName,
    url,
    preload: `document.documentElement.dataset.shell = 'desktop'; window.__botsAddresses = ${JSON.stringify(server?.urls.filter((address) => address !== server?.url) ?? [])}; window.__botsHost = ${JSON.stringify(desktopNetworkHost())}; ${clipboardBridge} ${titleBarBridge} ${server?.canAutoPair && new URL(url).origin === new URL(server.url).origin ? pairBridge : ''} ${nativeMenuBlock}`,
    frame: saved && desktopFrameVisible(saved) ? saved : desktopFrameDefault(),
    titleBarStyle: 'hiddenInset',
    trafficLightOffset: DESKTOP.mainWindow.trafficLights,
    hidden: true,
  });

  const pointer = window.ptr;

  if (pointer) {
    desktopWindowToolbar(pointer);
  }

  Electrobun.events.on(`host-message-${window.webview.id}`, (event: unknown) => {
    const theme = desktopThemeMessage.safeParse(event).data?.data.detail.theme;
    const notify = desktopNotifyMessage.safeParse(event).data?.data.detail.notify;
    const copy = desktopCopyMessage.safeParse(event).data?.data.detail.copy;

    if (theme && pointer) {
      desktopWindowAppearance(pointer, theme);
    }

    if (notify) {
      void desktopNotify({ notify, serverUrl: new URL(url).origin });
    }

    if (copy !== undefined) {
      Utils.clipboardWriteText(copy);
    }

    if (pointer && desktopTitleBarMessage.safeParse(event).success) {
      desktopWindowTitleBarDoubleClick(pointer);
    }

    if (desktopConnectionMessage.safeParse(event).success) {
      desktopConnectOpen('choose');
    }

    if (server?.canAutoPair && new URL(url).origin === new URL(server.url).origin && desktopPairMessage.safeParse(event).success) {
      void desktopServerPairLink(server).then((link) => link && window.webview.loadURL(link));
    }
  });

  Electrobun.events.on(`new-window-open-${window.webview.id}`, (event: unknown) => {
    const link = desktopNewWindow.safeParse(event).data?.data.detail.url;

    if (link) {
      Utils.openExternal(link);
    }
  });

  window.on('resize', desktopFrameSave);
  window.on('move', desktopFrameSave);
  window.on('close', () => {
    if (mainWindow !== window) {
      return;
    }

    mainWindow = null;
    desktopDockSync();
  });
  mainWindow = window;
  desktopDockSync();
  window.show();
}

async function desktopServerRun(settings: DesktopTypes.DesktopSettings, open = true): Promise<DesktopTypes.DesktopSaveResult> {
  try {
    const started = await desktopServerStart(settings);

    server = started;
    desktopTrayRender();

    if (headless || atLogin) {
      void started.exited.then(() => {
        if (server === started && !quitting) {
          process.kill(process.pid, 'SIGKILL');
        }
      });
    }

    if (open) {
      desktopMainOpen(server.url);
    }

    return {};
  } catch (error) {
    return { error: m.desktop_error_start({ name: appName, path: error instanceof Error ? error.message : '' }) };
  }
}

async function desktopError(message: string): Promise<void> {
  await Utils.showMessageBox({
    type: 'error',
    title: appName,
    message,
  });
}

async function desktopLock<T>(task: () => Promise<T>, busy: T): Promise<T> {
  if (operation ?? quitting) {
    return busy;
  }

  const run = task();

  operation = run.then(() => undefined, () => undefined);
  desktopTrayRender();

  try {
    return await run;
  } finally {
    operation = null;
    desktopTrayRender();
  }
}

async function desktopExclusive(task: () => Promise<void>): Promise<void> {
  try {
    await desktopLock(task, undefined);
  } catch (error) {
    await desktopError(error instanceof Error ? error.message : String(error));
  }
}

async function desktopNetworkChange(network?: DesktopTypes.DesktopSettings['network']): Promise<void> {
  const settings = desktopSettingsRead();

  const host = network === 'custom' ? await desktopSettingsPrompt(settings.host ?? '') : undefined;

  if (host === null) {
    return;
  }

  const parsed = desktopSettings.safeParse(network ? { network, host } : settings);

  if (!parsed.success) {
    await desktopError(m.desktop_error_invalid());
    return;
  }

  desktopSettingsWrite(parsed.data);
  const running = server;

  server = null;
  desktopTrayRender();
  await running?.stop();

  const result = await desktopServerRun(parsed.data, Boolean(mainWindow));

  if (result.error) {
    await desktopError(result.error);
  }
}

function desktopProbeMessage(probe: DesktopTypes.DesktopProbe): string {
  if (probe.status === 'invalid') {
    return m.desktop_error_remote_invalid();
  }

  if (probe.status === 'self') {
    return m.desktop_error_remote_self();
  }

  return probe.status === 'foreign' ? m.desktop_error_remote_foreign({ name: appName, url: probe.url }) : m.desktop_error_remote_unreachable({ name: appName, url: probe.url });
}

async function desktopLocked(task: () => Promise<DesktopTypes.DesktopSaveResult>): Promise<DesktopTypes.DesktopSaveResult> {
  try {
    return await desktopLock(task, { error: m.desktop_saving({ name: appName }) });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function desktopLocalUse(): Promise<DesktopTypes.DesktopSaveResult> {
  const result = server ? {} : await desktopServerRun(desktopSettingsRead(), false);

  if (server) {
    desktopStateWrite({ connection: 'local' });
    connectWindow?.close();
    desktopMainOpen(server.url);
  }

  return result;
}

async function desktopRemoteConnect(address: string): Promise<DesktopTypes.DesktopSaveResult> {
  const answer = await desktopNetworkProbe(address);
  const self = answer.status === 'ok' && server !== null && await desktopNetworkSelf(answer.url, server);
  const probe: DesktopTypes.DesktopProbe = self ? { status: 'self', url: answer.url } : answer;

  if (probe.status !== 'ok') {
    return { error: desktopProbeMessage(probe) };
  }

  desktopStateWrite({ connection: probe.url });

  const running = server;

  server = null;
  await running?.stop();
  connectWindow?.close();
  desktopMainOpen(probe.url);

  return {};
}

async function desktopRemoteOpen(origin?: BrowserWindow | null): Promise<DesktopTypes.DesktopSaveResult> {
  const remote = desktopRemote();
  const probe = remote ? await desktopNetworkProbe(remote) : null;

  if (quitting || (origin !== undefined && connectWindow !== origin)) {
    return {};
  }

  if (probe?.status === 'ok') {
    connectWindow?.close();
    desktopMainOpen(probe.url);

    return {};
  }

  if (!connectWindow) {
    desktopConnectOpen('unreachable');
  }

  return { error: probe ? desktopProbeMessage(probe) : undefined };
}

function desktopConnectOpen(screen: DesktopTypes.DesktopConnectScreen): void {
  if (connectWindow) {
    if (connectScreen !== screen) {
      connectScreen = screen;
      connectWindow.webview.loadURL(DESKTOP.connectUrl);
    }

    connectWindow.show();

    return;
  }

  connectScreen = screen;

  const rpc = BrowserView.defineRPC<DesktopTypes.DesktopRPC>({
    maxRequestTime: Infinity,
    handlers: {
      requests: {
        connectLoad: async () => {
          const remote = desktopRemote();
          const address = remote ?? server?.url;
          const remoteNetwork = remote && await desktopNetworkTailscale(remote) ? 'tailscale' : 'unknown';
          const network = remote ? remoteNetwork : 'local';

          return {
            name: appName,
            screen: connectScreen,
            remote: Boolean(remote),
            address: remote ?? '',
            current: address ? { address, network } : null,
          };
        },
        connectHealth: async () => {
          const address = desktopRemote() ?? server?.url;

          return Boolean(address && (await desktopNetworkProbe(address)).status === 'ok');
        },
        connect: (params) => {
          const parsed = desktopConnectParams.safeParse(params);

          if (!parsed.success) {
            return { error: m.desktop_error_remote_invalid() };
          }

          const { address } = parsed.data;

          return desktopLocked(() => (address === undefined ? desktopLocalUse() : desktopRemoteConnect(address)));
        },
        connectRetry: () => {
          const origin = connectWindow;

          return desktopLocked(() => desktopRemoteOpen(origin));
        },
        connectFind: () => desktopNetworkFind(server),
      },
      messages: {},
    },
  });

  const { workArea } = Screen.getPrimaryDisplay();

  const window = new BrowserWindow({
    title: appName,
    url: DESKTOP.connectUrl,
    frame: {
      ...DESKTOP.connectWindow,
      x: workArea.x + Math.round((workArea.width - DESKTOP.connectWindow.width) / 2),
      y: workArea.y + Math.round((workArea.height - DESKTOP.connectWindow.height) / 2),
    },
    titleBarStyle: 'hiddenInset',
    preload: nativeMenuBlock,
    rpc,
  });

  window.on('close', () => {
    connectWindow = null;
    desktopDockSync();
  });
  connectWindow = window;
  desktopDockSync();
}

async function desktopQuit(): Promise<void> {
  await operation;

  const running = server;

  server = null;
  desktopTrayRender();
  await running?.stop();
  quitReady = true;
  Utils.quit(0);
}

function desktopOpen(): void {
  const window = mainWindow ?? connectWindow;

  if (window) {
    window.show();
  } else if (server) {
    desktopMainOpen(server.url);
  } else if (desktopRemote()) {
    void desktopLocked(desktopRemoteOpen);
  } else if (!desktopStateRead().connection) {
    desktopConnectOpen('choose');
  }
}

function desktopShellStart(): void {
  ApplicationMenu.setApplicationMenu([
    {
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'showAll' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: m.desktop_menu_edit(),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
      ],
    },
    {
      label: m.desktop_menu_window(),
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'toggleFullScreen' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
  ]);

  tray = new Tray({
    image: DESKTOP.tray.image,
    template: true,
    width: DESKTOP.tray.width,
    height: DESKTOP.tray.height,
  });
  tray.on('tray-clicked', (event) => {
    const action = desktopMenuClick.safeParse(event).data?.data.action;

    if (action === 'open') {
      desktopOpen();
    } else if (action === 'retry') {
      void desktopExclusive(() => desktopNetworkChange());
    } else if (action === 'connect') {
      desktopConnectOpen('choose');
    } else if (action?.startsWith('network:')) {
      const network = desktopNetwork.safeParse(action.slice('network:'.length)).data;

      if (network) {
        void desktopExclusive(() => desktopNetworkChange(network));
      }
    } else if (action?.startsWith('url:copy:')) {
      Utils.clipboardWriteText(action.slice('url:copy:'.length));
    } else if (action?.startsWith('url:open:')) {
      Utils.openExternal(action.slice('url:open:'.length));
    } else if (action === 'login') {
      desktopLoginSet(!desktopLoginEnabled());
      desktopTrayRender();
    } else if (action === 'quit') {
      Utils.quit(0);
    }
  });
  desktopTrayRender();

  if (!headless && desktopLoginEnabled()) {
    desktopLoginSet(true);
  }

  Electrobun.events.on('reopen', desktopOpen);
}

async function desktopHeadlessStart(): Promise<void> {
  await desktopServerRun(desktopSettingsRead(), false);

  if (!server) {
    Utils.quit(1);
  }
}

if (desktopProcessRuns(desktopStateRead().appPid, PATHS.RESOURCES_FOLDER)) {
  Utils.quit(0);
}

desktopStateWrite({ appPid: process.pid });

desktopShellStart();

Electrobun.events.on('before-quit', (event: ElectrobunEvent<unknown, { allow: boolean }>) => {
  if (quitReady || (!server && !operation && !quitting)) {
    return;
  }

  event.response = { allow: false };
  quitting ??= desktopQuit();
});

process.on('SIGTERM', () => Utils.quit(0));

await desktopExclusive(async () => {
  if (headless) {
    await desktopHeadlessStart();
    return;
  }

  const { connection } = desktopStateRead();

  if (connection !== 'local') {
    await desktopServerLeftovers();

    if (atLogin) {
      return;
    }

    if (connection) {
      await desktopRemoteOpen();
    } else {
      desktopConnectOpen('choose');
    }

    return;
  }

  const result = await desktopServerRun(desktopSettingsRead(), !atLogin);

  if (!result.error) {
    return;
  }

  const { response } = await Utils.showMessageBox({
    type: 'error',
    title: appName,
    message: result.error,
    detail: m.desktop_tray_recovery({ name: appName }),
    buttons: [m.desktop_tray_keep_running(), m.desktop_quit()],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 1) {
    Utils.quit(0);
  }
});

desktopDockSync();
