import { z } from 'zod';
import { AUTH } from '#services/auth/auth.constants';
import type { DatabaseOrganization } from '#/types/database.types';
import type { authOptions } from '#services/auth/auth.options';
import type { MailService } from '#services/mail/mail.service';
import type { OrganizationService } from '#services/organization/organization.service';
import type { TenantService } from '#services/tenant/tenant.service';
import type { EnvServer } from '@orbs/env/server';
import type { Auth, BetterAuthOptions } from 'better-auth';

export const authEmailField = z.email();

export const authSignInForm = z.object({
  email: authEmailField,
  password: z.string().min(AUTH.password.minLength).max(AUTH.password.maxLength),
});

export type AuthSignInFormData = z.infer<typeof authSignInForm>;

export const authSignUpForm = z.object({
  name: z.string().min(2),
  email: authEmailField,
  password: z.string().min(AUTH.password.minLength).max(AUTH.password.maxLength),
  acceptTerms: z.boolean().refine((value) => value),
});

export type AuthSignUpFormData = z.infer<typeof authSignUpForm>;

export const authForgotPasswordForm = z.object({
  email: authEmailField,
});

export type AuthForgotPasswordFormData = z.infer<typeof authForgotPasswordForm>;

const authResetPasswordFields = z.object({
  password: z.string().min(AUTH.password.minLength).max(AUTH.password.maxLength),
  confirmPassword: z.string(),
});

export const authResetPasswordForm = authResetPasswordFields.refine(
  (data) => data.password === data.confirmPassword,
  { message: 'auth_passwords_do_not_match', path: ['confirmPassword'] },
);

export type AuthResetPasswordFormData = z.infer<typeof authResetPasswordForm>;

export const authSignUpSearch = z.object({
  email: authEmailField.optional(),
  intended: z.string().optional(),
});

export type AuthSignUpSearch = z.infer<typeof authSignUpSearch>;

export const authLayoutSearch = z.looseObject({
  error: z.string().optional(),
  error_description: z.string().optional(),
  redirectTo: z.string().optional(),
  state: z.string().optional(),
});

export type AuthLayoutSearch = z.infer<typeof authLayoutSearch>;

export const authResetPasswordSearch = z.object({
  token: z.string().optional(),
});

export type AuthResetPasswordSearch = z.infer<typeof authResetPasswordSearch>;

export const authVerifyEmailSearch = z.object({
  email: z.string().catch(''),
});

export type AuthVerifyEmailSearch = z.infer<typeof authVerifyEmailSearch>;

export const authApiKeyCreateInput = z.object({
  name: z.string().trim().min(1).max(64),
});

export const authApiKeyDeleteInput = z.object({
  keyId: z.string().min(1),
});

export const authAdminUsersInput = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(AUTH.adminUsersLimit).default(50),
  offset: z.number().int().min(0).default(0),
});

export const authAdminBanInput = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
  expiresInDays: z.number().int().positive().optional(),
});

export const authAdminUnbanInput = z.object({
  userId: z.string().min(1),
});

export interface AuthOptionsParams {
  env: EnvServer;
  database: BetterAuthOptions['database'];
  databaseHooks?: BetterAuthOptions['databaseHooks'];
  mail: MailService;
}

export interface AuthServiceDeps {
  env: EnvServer;
  database: BetterAuthOptions['database'];
  mail: MailService;
  organization: OrganizationService;
  disconnect: TenantService['actions']['disconnect'];
}

export interface AuthInstanceDeps {
  auth: AuthInstance;
  sessions: WeakMap<Headers, Promise<AuthSession | null>>;
  organization: Pick<OrganizationService, 'queries'>;
  disconnect: TenantService['actions']['disconnect'];
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    username: string | null;
    role: string | null;
    ban: AuthBan | null;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
  organization: DatabaseOrganization;
}

export interface AuthQuerySessionParams {
  headers: Headers;
  onCookie?: (cookie: string) => void;
}

export type AuthInstance = Auth<ReturnType<typeof authOptions>>;

export interface AuthApiKey {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: Date;
  lastRequest: Date | null;
}

export interface AuthApiKeyCreated extends AuthApiKey {
  key: string;
}

export interface AuthQueryApiKeysParams {
  headers: Headers;
  organizationId: string;
}

export interface AuthQueryApiKeyParams {
  key: string;
}

export interface AuthApiKeyVerified {
  id: string;
  organizationId: string;
}

export const authEndedSession = z.object({ id: z.string(), activeOrganizationId: z.string().nullish() });

export interface AuthActionCreateApiKeyParams {
  headers: Headers;
  organizationId: string;
  name: string;
}

export interface AuthActionDeleteApiKeyParams {
  headers: Headers;
  organizationId: string;
  keyId: string;
}

export interface AuthBanState {
  banned?: boolean | number | null;
  banExpires?: Date | string | null;
}

export interface AuthBan {
  until: string | null;
}

export interface AuthAdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  ban: AuthBan | null;
  banReason: string | null;
  createdAt: Date;
}

export interface AuthAdminUsers {
  users: AuthAdminUser[];
  total: number;
}

export interface AuthQueryUsersParams {
  headers: Headers;
  search?: string;
  limit: number;
  offset: number;
}

export interface AuthActionBanUserParams {
  headers: Headers;
  userId: string;
  reason?: string;
  expiresInDays?: number;
}

export interface AuthActionUnbanUserParams {
  headers: Headers;
  userId: string;
}
