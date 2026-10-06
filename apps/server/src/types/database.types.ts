import type { BotPermission, BotThinkingLevel } from '#/types/bot.types';
import type { EnvServer } from '@orbs/env/server';
import type * as KyselyTypes from 'kysely';

export interface DatabaseUserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: number;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  role: string | null;
  banned: number | null;
  banReason: string | null;
  banExpires: string | null;
  username: string | null;
  displayUsername: string | null;
}

export interface DatabaseOrganizationTable {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: string | null;
  createdAt: string;
}

export type DatabaseOrganization = KyselyTypes.Selectable<DatabaseOrganizationTable>;

export interface DatabaseMemberTable {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
}

export interface DatabaseBotTable {
  avatar: string | null;
  id: string;
  organizationId: string;
  name: string;
  handle: string;
  instructions: string;
  harnessId: string;
  modelProvider: string;
  modelId: string;
  thinkingLevel: BotThinkingLevel;
  permission: BotPermission;
  homeDir: string;
  inherit: string;
  createdAt: string;
}

export type DatabaseBot = KyselyTypes.Selectable<DatabaseBotTable>;
export type DatabaseBotUpdate = KyselyTypes.Updateable<DatabaseBotTable>;

export interface DatabaseOrganizationSettingsTable {
  organizationId: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface DatabaseMemoryTable {
  mergedInto: string | null;
  id: string;
  organizationId: string;
  scope: 'global' | 'bot' | 'room';
  botId: string | null;
  ownerId: string;
  subjectKind: 'user' | 'bot' | 'room';
  subjectId: string;
  text: string | null;
  revision: number;
  origin: 'manual' | 'automatic';
  sources: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseMemoryOperationTable {
  expectedRevision: number | null;
  organizationId: string;
  id: string;
  memoryId: string;
  revision: number;
}

export interface DatabaseMemorySourceTable {
  organizationId: string;
  messageId: string;
  memoryId: string;
}

export interface DatabaseSchema {
  memorySource: DatabaseMemorySourceTable;
  memory: DatabaseMemoryTable;
  memoryOperation: DatabaseMemoryOperationTable;
  user: DatabaseUserTable;
  organization: DatabaseOrganizationTable;
  member: DatabaseMemberTable;
  bot: DatabaseBotTable;
  organizationSettings: DatabaseOrganizationSettingsTable;
}

export interface Database {
  db: KyselyTypes.Kysely<DatabaseSchema>;
  batch: (queries: KyselyTypes.Compilable[]) => Promise<void>;
}

export interface DatabaseConnection<Schema> extends Pick<Database, 'batch'> {
  db: KyselyTypes.Kysely<Schema>;
  all: <O>(query: KyselyTypes.Compilable<O>) => O[];
  run: (query: KyselyTypes.Compilable) => void;
  transaction: <T>(operation: () => T) => T;
  migrate: () => Promise<void>;
  close: () => void;
}

export interface DatabaseConnectionParams {
  path: string;
  migrations: Record<string, string>;
  env: EnvServer;
}

