import type { Database } from '#/types/database.types';
import type { TenantDirectory } from '#/types/tenant.types';
import type { AuthService } from '#services/auth/auth.service';
import type { BotService } from '#services/bot/bot.service';
import type { MailService } from '#services/mail/mail.service';
import type { OrganizationService } from '#services/organization/organization.service';
import type { StorageService } from '#services/storage/storage.service';
import type { TenantService } from '#services/tenant/tenant.service';
import type { EnvServer } from '@orbs/env/server';
import type { RateLimiter } from '@orpc/ratelimit';

export interface ServicesDeps {
  env: EnvServer;
  database: { main: Database };
  storage: StorageService;
  tenants: TenantDirectory;
  rateLimiters: Record<'rpc' | 'auth' | 'ingest', RateLimiter>;
}

export interface Services {
  env: EnvServer;
  database: ServicesDeps['database'];
  mail: MailService;
  rateLimiters: ServicesDeps['rateLimiters'];
  organization: OrganizationService;
  auth: AuthService;
  bot: BotService;
  storage: StorageService;
  tenant: TenantService;
}
