import { PATHS } from 'electrobun/main';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DESKTOP_BUILD } from './desktop-build';
import { desktopNetworkAdvertise, desktopNetworkOrigins, desktopNetworkProbe, desktopNetworkUrl } from './desktop-network';
import { desktopHome, desktopStateRead, desktopStateWrite } from './desktop-settings';
import { DESKTOP } from './desktop.constants';
import type { DesktopServer, DesktopSettings } from './types/desktop.types';

export function desktopProcessRuns(pid: number | undefined, marker: string): boolean {
  if (!pid || pid === process.pid) {
    return false;
  }

  const result = Bun.spawnSync(['ps', '-p', String(pid), '-o', 'command='], { stdout: 'pipe', stderr: 'ignore' });

  return result.exitCode === 0 && result.stdout.toString().replaceAll(/\/[^/\s]+\/\.\.(?=\/)/gu, '').includes(marker);
}

async function desktopWaitFor(ready: () => boolean | Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  async function desktopAttempt(): Promise<boolean> {
    if (await ready()) {
      return true;
    }

    if (Date.now() >= deadline) {
      return false;
    }

    await Bun.sleep(DESKTOP.healthIntervalMs);

    return desktopAttempt();
  }

  return desktopAttempt();
}

const webDev = process.env.DESKTOP_WEB_DEV;

function desktopDaemonEntry(): string[] {
  return webDev
    ? [process.execPath, resolve(webDev, DESKTOP.dev.daemon)]
    : [process.execPath, join(PATHS.VIEWS_FOLDER, DESKTOP.bundle.daemon)];
}

function desktopLeftovers(pids: number[]): number[] {
  return pids.filter((pid) => DESKTOP.markers.some((marker) => desktopProcessRuns(pid, marker)));
}

export async function desktopServerLeftovers(): Promise<void> {
  const { serverPids = [] } = desktopStateRead();
  const running = desktopLeftovers(serverPids);

  if (running.length === 0) {
    return;
  }

  for (const pid of running) {
    process.kill(pid, 'SIGTERM');
  }

  if (!await desktopWaitFor(() => desktopLeftovers(serverPids).length === 0, DESKTOP.leftoverTimeoutMs)) {
    for (const pid of desktopLeftovers(serverPids)) {
      process.kill(pid, 'SIGKILL');
    }
  }

  desktopStateWrite({ serverPids: undefined });
}

async function desktopPortAnswers(hostname: string, port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname,
      port,
      socket: { data: () => undefined },
    });

    socket.end();

    return true;
  } catch {
    return false;
  }
}

/** A server already running for this data folder, such as dev servers or a daemon started from the CLI. The app uses it and never stops it. */
async function desktopServerAdopt(): Promise<DesktopServer | null> {
  if (!existsSync(join(desktopHome.root, DESKTOP.daemonSocket))) {
    return null;
  }

  const urls = DESKTOP.ports.map((port) => desktopNetworkUrl(DESKTOP.localHost, port));
  const probes = await Promise.all(urls.map((url) => desktopNetworkProbe(url, DESKTOP.healthIntervalMs * 10)));
  const index = probes.findIndex((probe) => probe.status === 'ok');

  if (index === -1) {
    return null;
  }

  const port = DESKTOP.ports[index];
  const url = urls[index];

  const origins = await desktopNetworkOrigins(port);

  return {
    url,
    port,
    portFallback: false,
    tailscale: origins.tailscale,
    urls: [url, ...origins.urls],
    daemonEntry: desktopDaemonEntry(),
    canAutoPair: false,
    exited: Promise.withResolvers<number>().promise,
    stop: async () => undefined,
  };
}

export async function desktopServerStart(settings: DesktopSettings): Promise<DesktopServer> {
  await desktopServerLeftovers();

  const adopted = await desktopServerAdopt();

  if (adopted) {
    return adopted;
  }

  const host = { all: DESKTOP.allHost, local: DESKTOP.localHost, custom: settings.host ?? DESKTOP.allHost }[settings.network];
  const windowHost = host === DESKTOP.allHost ? DESKTOP.localHost : host;
  const logs = join(desktopHome.root, DESKTOP.logsFolder);
  const logPath = join(logs, DESKTOP.serverLog);

  mkdirSync(logs, { recursive: true });

  async function desktopServerLaunch(port: number): Promise<DesktopServer | null> {
    const daemonPort = port + DESKTOP.daemonPortOffset;

    const busy = await Promise.all([port, daemonPort].flatMap((candidate) => [
      desktopPortAnswers(DESKTOP.localHost, candidate),
      desktopPortAnswers('::1', candidate),
    ]));

    if (busy.some(Boolean)) {
      return null;
    }

    const url = desktopNetworkUrl(windowHost, port);
    const origins = await desktopNetworkOrigins(port);
    const remote = host === DESKTOP.localHost ? [] : origins.urls;
    const log = openSync(logPath, 'a');

    const shared = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DATA_DIR: process.env.DATA_DIR,
      APP_NAME: DESKTOP_BUILD.name,
    };

    const daemon = Bun.spawn(desktopDaemonEntry(), {
      cwd: desktopHome.root,
      stdout: log,
      stderr: log,
      env: {
        ...shared,
        DAEMON_HOST: DESKTOP.localHost,
        DAEMON_PORT: String(daemonPort),
        WEB_PUBLIC_URL: url,
      },
    });

    const web = Bun.spawn(webDev
      ? [process.execPath, ...DESKTOP.dev.web, '--host', host, '--port', String(port)]
      : [process.execPath, join(PATHS.VIEWS_FOLDER, DESKTOP.bundle.web)], {
      cwd: webDev ?? desktopHome.root,
      stdout: log,
      stderr: log,
      env: {
        ...shared,
        WEB_HOST: host,
        WEB_PORT: String(port),
        DAEMON_PORT: String(daemonPort),
      },
    });

    closeSync(log);

    const children = [daemon, web];
    const failed = () => children.some((child) => child.exitCode !== null);
    const answered = await desktopWaitFor(async () => failed() || (await desktopNetworkProbe(url, DESKTOP.probeTimeoutMs)).status === 'ok', DESKTOP.healthTimeoutMs);

    if (!answered || failed()) {
      for (const child of children) {
        child.kill('SIGKILL');
      }

      return null;
    }

    desktopStateWrite({ serverPids: children.map((child) => child.pid) });

    const exited = Promise.race(children.map((child) => child.exited));

    void exited.then(host === DESKTOP.localHost ? undefined : desktopNetworkAdvertise(port));

    return {
      url,
      port,
      portFallback: port !== DESKTOP.ports[0],
      tailscale: origins.tailscale,
      urls: [url, ...remote],
      daemonEntry: desktopDaemonEntry(),
      canAutoPair: true,
      exited,
      stop: async () => {
        for (const child of children) {
          child.kill('SIGTERM');
        }

        await Promise.race([
          Promise.all(children.map((child) => child.exited)),
          Bun.sleep(DESKTOP.stopTimeoutMs).then(() => children.forEach((child) => child.kill('SIGKILL'))),
        ]);
        desktopStateWrite({ serverPids: undefined });
      },
    };
  }

  async function desktopServerTry(ports: number[]): Promise<DesktopServer> {
    if (ports.length === 0) {
      throw new Error(logPath);
    }

    const [port, ...rest] = ports;

    return await desktopServerLaunch(port) ?? desktopServerTry(rest);
  }

  return desktopServerTry(DESKTOP.ports);
}

/** A one-time pairing link for this Mac's own daemon, through its owner-only CLI socket. */
export async function desktopServerPairLink(server: DesktopServer): Promise<string | null> {
  if (!server.canAutoPair) {
    return null;
  }

  const child = Bun.spawn([...server.daemonEntry, 'pair', '--url', server.url], {
    stdout: 'pipe',
    stderr: 'ignore',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DATA_DIR: process.env.DATA_DIR,
    },
  });

  const output = await new Response(child.stdout).text();

  return DESKTOP.pairLink.exec(output)?.[0] ?? null;
}
