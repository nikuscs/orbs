import type { BotAvatar } from '@/components/bots/bot-avatar';
import type { RoomUIMessage } from '@orbs/server/client';
import type { ComponentProps } from 'react';

type ToolMessagePart = RoomUIMessage['parts'][number];

export type ToolPart = Extract<ToolMessagePart, { toolCallId: string }>;

export type ToolTextPart = Extract<ToolMessagePart, { type: 'text' }>;

export type ToolBlock = { kind: 'text'; index: number; parts: ToolTextPart[] } | { kind: 'tools'; index: number; parts: ToolPart[] };

export interface ToolInputText {
  key: string;
  value: string;
}

export type ToolBot = ComponentProps<typeof BotAvatar>['bot'];

export type ToolIconKind = 'terminal' | 'file' | 'edit' | 'search' | 'folder' | 'web' | 'bot' | 'room' | 'model' | 'todo' | 'question' | 'mcp' | 'tool';

export interface ToolPresentation {
  label: string;
  icon: ToolIconKind;
}

export interface ToolPresentationDefinition {
  label: () => string;
  icon: ToolIconKind;
}

export interface ToolIdentity {
  name: string;
  source?: string;
  identifier: string;
}

export interface ToolBlocksParams {
  parts: RoomUIMessage['parts'];
}

export interface ToolCollapsedParams {
  part: ToolPart;
  grouped: boolean;
  expanded: boolean;
}

export interface ToolGroupStateParams {
  parts: ToolPart[];
}
