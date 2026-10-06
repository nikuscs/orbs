import { z } from 'zod';
import type { EnvServer } from '@orbs/env/server';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailDriver {
  send: (message: MailMessage) => Promise<void>;
}

export interface MailServiceDeps {
  env: EnvServer;
}

export interface MailActionLinkParams {
  to: string;
  url: string;
}

export const mailCloudflareResponse = z.object({ success: z.literal(true) });
