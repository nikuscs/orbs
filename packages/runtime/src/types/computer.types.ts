import type { computerTask } from '../services/computer/computer.task';
import type { Context } from '@earendil-works/chord/context';
import type * as PiTypes from '@earendil-works/pi-durable';
import type * as UniversalTypes from '@repo/contracts/universal';

export interface ComputerBotParams {
  botId: string;
}

export type ComputerHostState = 'off' | 'running' | 'sleeping';

export interface ComputerImage {
  data: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ComputerScreenshotParams extends ComputerBotParams {
  windowId?: number;
  maxDimension?: number;
  format: 'png' | 'jpeg';
}

export interface ComputerWindow {
  id: number;
  title: string;
  app: string;
  isFocused: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export type ComputerAction =
  | { action: 'click' | 'double_click' | 'right_click' | 'move'; x: number; y: number }
  | { action: 'drag'; x: number; y: number; toX: number; toY: number }
  | { action: 'scroll'; x: number; y: number; dx: number; dy: number }
  | { action: 'type'; text: string }
  | { action: 'key'; keys: string[] };

export interface ComputerActParams extends ComputerBotParams {
  input: ComputerAction;
}

export interface ComputerTreeParams extends ComputerBotParams {
  windowId?: number;
}

export interface ComputerViewerTicketParams extends ComputerBotParams {
  mode: UniversalTypes.ComputerViewerMode;
  principal: { id: string; displayName: string };
  ttlSeconds: number;
}

export interface ComputerViewerTicket {
  viewerPath: string;
  expiresAt: number;
}

export type ComputerBrowserCall =
  | { call: 'open'; url: string }
  | { call: 'snapshot' }
  | { call: 'act'; ref: string; action: 'click' | 'fill' | 'select' | 'press' | 'hover'; text?: string }
  | { call: 'tabs'; tab?: { action: 'switch' | 'close'; index: number } };

export interface ComputerBrowserParams extends ComputerBotParams {
  input: ComputerBrowserCall;
}

export interface ComputerBrowserResult {
  url: string;
  title: string;
  text: string;
}

export interface ComputerThumbnailFile {
  data: string;
  mimeType: string;
  takenAt: number;
}

export interface ComputerHost {
  actions: {
    start: (params: ComputerBotParams) => Promise<void>;
    sleep: (params: ComputerBotParams) => Promise<void>;
    shutdown: (params: ComputerBotParams) => Promise<void>;
    remove: (params: ComputerBotParams) => Promise<void>;
    act: (params: ComputerActParams) => Promise<void>;
    browser: (params: ComputerBrowserParams) => Promise<ComputerBrowserResult>;
    viewerTicket: (params: ComputerViewerTicketParams) => Promise<ComputerViewerTicket>;
    thumbnail: (params: ComputerBotParams) => Promise<ComputerThumbnailFile | null>;
  };
  queries: {
    list: () => Promise<string[]>;
    state: (params: ComputerBotParams) => Promise<ComputerHostState>;
    screenshot: (params: ComputerScreenshotParams) => Promise<ComputerImage>;
    windows: (params: ComputerBotParams) => Promise<ComputerWindow[]>;
    tree: (params: ComputerTreeParams) => Promise<string>;
    savedThumbnail: (params: ComputerBotParams) => Promise<ComputerThumbnailFile | null>;
    endpoint: (params: ComputerBotParams) => Promise<string | null>;
  };
  close: () => Promise<void>;
}

export interface ComputerRecord extends PiTypes.JsonObject {
  taskId: number | null;
  state: UniversalTypes.ComputerState;
  startedAt: number | null;
  lastActivityAt: number | null;
  sleptAt: number | null;
  control: UniversalTypes.ComputerControl | null;
  handoff: UniversalTypes.ComputerHandoff | null;
}

export interface ComputerServiceDeps {
  harness: PiTypes.Harness;
  host: ComputerHost;
  botId: string;
}

export interface ComputerContextParams {
  context: Context;
}

export type ComputerTaskState =
  | { phase: 'check'; failures?: number }
  | { phase: 'wait'; until: number }
  | { phase: 'apply'; transition: 'sleep' | 'shutdown'; failures?: number };

export interface ComputerTaskInput {
  botId: string;
}

export type ComputerTaskDefinition = ReturnType<typeof computerTask>;

export interface ComputerActionDeps extends ComputerServiceDeps {
  task: ComputerTaskDefinition;
}

export interface ComputerViewerParams {
  mode: UniversalTypes.ComputerViewerMode;
  isRenewal?: boolean;
  principal: { id: string; displayName: string };
}

export type ComputerTakeControlParams = UniversalTypes.ComputerControl & { isRenewal?: boolean };

export type ComputerHandoffParams = UniversalTypes.ComputerHandoff;

export interface ComputerReleaseControlParams {
  deviceId: string | null;
}

export interface ComputerNextTransition {
  at: number;
  transition: 'sleep' | 'shutdown';
}

export interface ComputerSchedule {
  sleepAt: number | null;
  shutdownAt: number;
  next: ComputerNextTransition;
}
