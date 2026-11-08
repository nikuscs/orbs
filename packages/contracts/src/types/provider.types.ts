import { z } from 'zod';

export const PROVIDER = {
  maxProviderId: 128,
  maxAnswer: 4_096,
  maxMessage: 2_000,
  maxUrl: 2_048,
  maxLabel: 200,
  maxOptions: 32,
} as const;

export const providerId = z.string().trim().min(1).max(PROVIDER.maxProviderId);
export const providerAuthType = z.enum(['api_key', 'oauth']);
export const providerSessionStatus = z.enum(['pending', 'completed', 'cancelled', 'failed']);

export const providerAuthSource = z.enum([
  'stored',
  'runtime',
  'environment',
  'fallback',
  'models_json_key',
  'models_json_command',
]);

export const providerLogin = z.object({
  providerId,
  authType: providerAuthType,
});

export const providerSessionId = z.object({
  id: z.uuid(),
});

export const providerComplete = providerSessionId.extend({
  promptId: z.uuid(),
  answer: z.string().min(1).max(PROVIDER.maxAnswer),
});

export const providerLogout = z.object({
  providerId,
});

export const providerCancelResult = z.void();
export const providerLogoutResult = z.void();

const providerMessage = z.string().min(1).max(PROVIDER.maxMessage);
const providerUrl = z.string().min(1).max(PROVIDER.maxUrl);
const providerLabel = z.string().min(1).max(PROVIDER.maxLabel);

export const providerPromptOption = z.object({
  id: z.string().min(1).max(PROVIDER.maxLabel),
  label: providerLabel,
  description: z.string().min(1).max(PROVIDER.maxMessage).optional(),
});

const providerPromptFields = z.object({
  id: z.uuid(),
});

export const providerPrompt = z.discriminatedUnion('type', [
  providerPromptFields.extend({
    type: z.literal('text'),
    message: providerMessage,
    placeholder: z.string().min(1).max(PROVIDER.maxLabel).optional(),
  }),
  providerPromptFields.extend({
    type: z.literal('secret'),
    message: providerMessage,
    placeholder: z.string().min(1).max(PROVIDER.maxLabel).optional(),
  }),
  providerPromptFields.extend({
    type: z.literal('select'),
    message: providerMessage,
    options: z.array(providerPromptOption).min(1).max(PROVIDER.maxOptions),
  }),
  providerPromptFields.extend({
    type: z.literal('manual_code'),
    message: providerMessage,
    placeholder: z.string().min(1).max(PROVIDER.maxLabel).optional(),
  }),
]);

export const providerEvent = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('info'),
    message: providerMessage,
    links: z.array(z.object({
      url: providerUrl,
      label: providerLabel.optional(),
    })).optional(),
  }),
  z.object({
    type: z.literal('auth_url'),
    url: providerUrl,
    instructions: z.string().min(1).max(PROVIDER.maxMessage).optional(),
  }),
  z.object({
    type: z.literal('device_code'),
    userCode: z.string().min(1).max(PROVIDER.maxLabel),
    verificationUri: providerUrl,
    intervalSeconds: z.number().positive().optional(),
    expiresInSeconds: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal('progress'),
    message: providerMessage,
  }),
]);

export const providerSession = z.object({
  id: z.uuid(),
  providerId,
  authType: providerAuthType,
  status: providerSessionStatus,
  expiresAt: z.number().int(),
  prompt: providerPrompt.optional(),
  events: z.array(providerEvent),
  error: z.string().min(1).max(PROVIDER.maxMessage).optional(),
});

export const provider = z.object({
  id: providerId,
  name: z.string().min(1).max(PROVIDER.maxLabel),
  authTypes: z.array(providerAuthType).max(2),
  loginLabel: z.string().min(1).max(PROVIDER.maxMessage).optional(),
  loginCommand: z.string().min(1).max(PROVIDER.maxLabel).optional(),
  isSubscription: z.boolean(),
  isConfigured: z.boolean(),
  credentialType: providerAuthType.optional(),
  source: providerAuthSource.optional(),
  label: z.string().min(1).max(PROVIDER.maxMessage).optional(),
});

export const providerList = z.object({
  providers: z.array(provider),
  session: providerSession.nullable(),
});

export type ProviderAuthType = z.infer<typeof providerAuthType>;
export type ProviderLoginInput = z.infer<typeof providerLogin>;
export type ProviderCompleteInput = z.infer<typeof providerComplete>;
export type ProviderLogoutInput = z.infer<typeof providerLogout>;
export type ProviderSessionIdInput = z.infer<typeof providerSessionId>;
export type ProviderPrompt = z.infer<typeof providerPrompt>;
export type ProviderEvent = z.infer<typeof providerEvent>;
export type ProviderSession = z.infer<typeof providerSession>;
export type Provider = z.infer<typeof provider>;
export type ProviderList = z.infer<typeof providerList>;
