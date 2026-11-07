import { z } from 'zod';
import type * as ComputerTypes from './computer.types';
import type * as CuaSdk from '@trycua/cua';
import type { SpacesdClientLike, SpacesdForwardLike } from '@trycua/cua';
import type { Browser, Page } from 'playwright-core';

export interface ComputerHostCredentials {
  actions: { set(params: { key: string; value: string | null }): Promise<void> };
  queries: { get(params: { key: string }): Promise<string | null> };
}

export interface ComputerHostServiceDeps {
  folder: string;
  credentials: ComputerHostCredentials;
  dockerHost?: string;
}

export const computerHostDriverInspect = z.object({
  State: z.object({ Status: z.string() }),
  NetworkSettings: z.object({
    Ports: z.record(z.string(), z.array(z.object({ HostPort: z.string() })).nullable()).nullish(),
  }),
});

export const computerHostDriverList = z.array(z.object({
  Labels: z.record(z.string(), z.string()).nullish(),
}));

export const computerHostDriverMessage = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

export interface ComputerHostDriverRequestParams {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: object;
  headers?: Record<string, string>;
  accept?: readonly number[];
}

export interface ComputerHostDriverCreateParams {
  botId: string;
  image: string;
  tokenFile: string;
  spacesdFile: string;
  seccomp: string;
}

export interface ComputerHostDriverInspection {
  status: string;
  port: number | null;
}

export interface ComputerHostBrowserSession {
  browser: Browser;
  tunnel: SpacesdForwardLike;
  page: Page | null;
}

export interface ComputerHostWindowRef {
  id: string;
  epoch: string;
}

export interface ComputerHostSession {
  client: SpacesdClientLike;
  browser: ComputerHostBrowserSession | null;
  windowNumbers: Map<string, number>;
  windowRefs: Map<number, ComputerHostWindowRef>;
}

export interface ComputerHostRuntime extends ComputerHostServiceDeps {
  socket: string;
  sessions: Map<string, ComputerHostSession>;
  starting: Map<string, Promise<void>>;
  sdk: Promise<typeof CuaSdk> | null;
}

const computerRect = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(0),
  height: z.number().default(0),
});

export const computerHostResponseScreenshot = z.object({
  image: z.string(),
  imageSize: z.object({ width: z.number().default(0), height: z.number().default(0) }),
});

export const computerHostResponseWindows = z.object({
  windows: z.array(z.object({
    ref: z.object({ id: z.string(), epoch: z.string().default('0') }),
    title: z.string().default(''),
    app: z.object({ name: z.string().default('') }).default({ name: '' }),
    bounds: computerRect.default({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }),
    focused: z.boolean().default(false),
  })).default([]),
});

export const computerHostResponseTree = z.object({
  nodes: z.array(z.object({
    depth: z.number().default(0),
    role: z.string().default(''),
    name: z.string().default(''),
    value: z.string().default(''),
    bounds: computerRect.optional(),
  })).default([]),
  truncated: z.boolean().default(false),
});

export const computerHostResponseTicket = z.object({
  expiresAt: z.string(),
  viewerPath: z.string(),
});

export const computerHostResponseEmpty = z.object({});

export interface ComputerHostInput {
  method: 'ComputerService/Pointer' | 'ComputerService/Keyboard';
  body: object;
}

export type ComputerHostBrowserAct = Extract<ComputerTypes.ComputerBrowserCall, { call: 'act' }>;

export type ComputerHostBrowserTab = NonNullable<Extract<ComputerTypes.ComputerBrowserCall, { call: 'tabs' }>['tab']>;

export interface ComputerHostCaptureParams {
  format: 'png' | 'jpeg';
  maxDimension?: number;
  quality?: number;
  windowId?: number;
}

export interface ComputerHostCaptureBody {
  format: string;
  quality?: number;
  maxDimension?: number;
  window?: ComputerHostWindowRef;
}

export interface ComputerHostTreeBody {
  maxDepth: number;
  maxNodes: number;
  window?: ComputerHostWindowRef;
}
