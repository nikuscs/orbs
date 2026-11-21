import { Errors } from '@repo/errors/universal';
import { setTimeout as sleep } from 'node:timers/promises';
import { match, P } from 'ts-pattern';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostCloseBrowser, computerHostPoll, computerHostSdk, computerHostTruncate } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';
import type { SpacesdForwardLike } from '@trycua/cua';
import type { Browser, Page } from 'playwright-core';

async function computerHostBrowserAttach(tunnel: SpacesdForwardLike): Promise<Browser | null> {
  const { chromium } = await import('playwright-core');

  return chromium.connectOverCDP(`http://${tunnel.localAddr()}`, { timeout: COMPUTER_HOST.cdpConnectTimeoutMs }).catch(() => null);
}

async function computerHostBrowserLaunch(runtime: HostTypes.ComputerHostRuntime, session: HostTypes.ComputerHostSession): Promise<void> {
  const { SpacesdCommand } = await computerHostSdk(runtime);

  await session.client.spawn(SpacesdCommand.create({
    program: COMPUTER_HOST.chromium.program,
    args: [...COMPUTER_HOST.chromium.args],
    env: new Map(Object.entries(COMPUTER_HOST.chromium.env)),
    stdin: false,
    tag: COMPUTER_HOST.chromium.tag,
    killOnDisconnect: false,
  }));
}

export async function computerHostBrowserConnect(
  runtime: HostTypes.ComputerHostRuntime,
  session: HostTypes.ComputerHostSession,
): Promise<HostTypes.ComputerHostBrowserSession> {
  return match(session.browser)
    .with({ browser: P.when((browser: Browser) => browser.isConnected()) }, (open) => Promise.resolve(open))
    .otherwise(() => computerHostBrowserOpenSession(runtime, session));
}

async function computerHostBrowserOpenSession(
  runtime: HostTypes.ComputerHostRuntime,
  session: HostTypes.ComputerHostSession,
): Promise<HostTypes.ComputerHostBrowserSession> {
  await computerHostCloseBrowser(session);
  const tunnel = await session.client.forwardTcp(COMPUTER_HOST.cdpPort, undefined);

  const browser = await match(await computerHostBrowserAttach(tunnel))
    .with(P.nonNullable, (attached) => Promise.resolve(attached))
    .otherwise(async () => {
      await computerHostBrowserLaunch(runtime, session);

      return computerHostPoll(() => computerHostBrowserAttach(tunnel), Date.now() + COMPUTER_HOST.browserReadyTimeoutMs);
    });

  const opened = await match(browser)
    .with(P.nonNullable, (attached) => Promise.resolve({
      browser: attached,
      tunnel,
      page: null,
    }))
    .otherwise(async () => {
      await tunnel.stop();
      throw new Errors.INTERNAL_ERROR({ internal: 'Chromium did not become reachable in time.' });
    });

  session.browser = opened;

  return opened;
}

function computerHostBrowserTabs(connection: HostTypes.ComputerHostBrowserSession): Page[] {
  return connection.browser.contexts().flatMap((context) => context.pages()).filter((page) => !page.url().startsWith('devtools://'));
}

async function computerHostBrowserPage(connection: HostTypes.ComputerHostBrowserSession): Promise<Page> {
  return match(connection.page)
    .with(P.nonNullable, (open) => match(open.isClosed())
      .with(false, () => Promise.resolve(open))
      .with(true, () => computerHostBrowserNewPage(connection))
      .exhaustive())
    .otherwise(() => computerHostBrowserNewPage(connection));
}

async function computerHostBrowserNewPage(connection: HostTypes.ComputerHostBrowserSession): Promise<Page> {
  const existing = computerHostBrowserTabs(connection).at(-1);
  const context = connection.browser.contexts().at(0);

  const page = await match({ existing, context })
    .with({ existing: P.nonNullable }, (found) => Promise.resolve(found.existing))
    .with({ context: P.nonNullable }, (found) => found.context.newPage())
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: 'Chromium has no browser context.' });
    });

  connection.page = page;

  return page;
}

export async function computerHostBrowserDescribe(connection: HostTypes.ComputerHostBrowserSession): Promise<ComputerTypes.ComputerBrowserResult> {
  const page = await computerHostBrowserPage(connection);
  const pages = computerHostBrowserTabs(connection);
  const tabs = await Promise.all(pages.map(async (tab, index) => `${tab === page ? '*' : ' '} [${index}] ${await tab.title().catch(() => '')} - ${tab.url()}`));
  const snapshot = await page.ariaSnapshot({ mode: 'ai', timeout: COMPUTER_HOST.browserActionTimeoutMs });

  return {
    url: page.url(),
    title: await page.title(),
    text: computerHostTruncate(`Tabs:\n${tabs.join('\n')}\n\n${snapshot}`),
  };
}

export async function computerHostBrowserOpen(connection: HostTypes.ComputerHostBrowserSession, url: string): Promise<void> {
  const page = await computerHostBrowserPage(connection);

  await page.goto(url, { waitUntil: 'load', timeout: COMPUTER_HOST.browserNavigationTimeoutMs });
  await page.bringToFront();
}

export async function computerHostBrowserAct(connection: HostTypes.ComputerHostBrowserSession, input: HostTypes.ComputerHostBrowserAct): Promise<void> {
  const page = await computerHostBrowserPage(connection);
  const ref = input.ref.replace(/^\[?ref=/, '').replace(/\]$/, '');
  const target = page.locator(`aria-ref=${ref}`);
  const options = { timeout: COMPUTER_HOST.browserActionTimeoutMs };

  await match(input.action)
    .with('click', () => target.click(options))
    .with('hover', () => target.hover(options))
    .with('fill', () => target.fill(input.text ?? '', options))
    .with('select', () => target.selectOption(input.text ?? '', options))
    .with('press', () => target.press(input.text ?? 'Enter', options))
    .exhaustive();

  await page.waitForLoadState('domcontentloaded', { timeout: COMPUTER_HOST.browserActionTimeoutMs }).catch(() => null);
  await sleep(COMPUTER_HOST.settleMs);
}

export async function computerHostBrowserTab(connection: HostTypes.ComputerHostBrowserSession, tab: HostTypes.ComputerHostBrowserTab): Promise<void> {
  const target = match(computerHostBrowserTabs(connection).at(tab.index))
    .with(P.nonNullable, (found) => found)
    .otherwise(() => {
      throw new Errors.INTERNAL_ERROR({ internal: `There is no tab ${tab.index}.` });
    });

  await match(tab.action)
    .with('switch', async () => {
      connection.page = target;
      await target.bringToFront();
    })
    .with('close', async () => {
      await target.close();
      connection.page = null;
    })
    .exhaustive();
}
