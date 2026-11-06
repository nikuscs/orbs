import type { BotSection } from '@repo/contracts/universal';
import type { ComponentType } from 'react';

export interface BotFormSharedItem {
  name: string
  detail: string
  keywords: string
}

export interface BotFormSharedMessages {
  search: string
  noMatch: string
  loadFailed: string
  note: string
  empty?: string
}

export interface BotNavItem {
  id: BotSection
  label: () => string
  description: () => string
  icon: ComponentType<{ className?: string }>
}

export type BotDialogView =
  | { kind: 'create' }
  | { kind: 'section'; botId: string; section: BotSection }
  | { kind: 'delete'; botId: string }
  | { kind: 'reset'; botId: string }
  | { kind: 'routine-edit'; botId: string; routineId: string }
  | { kind: 'routine-delete'; botId: string; routineId: string }
  | { kind: 'todo-delete'; botId: string; todoId: string }
  | { kind: 'mcp-remove'; botId: string; server: string };
