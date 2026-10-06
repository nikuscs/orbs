import { Errors } from '@orbs/errors/universal';
import { mailCloudflareResponse } from '#/types/mail.types';
import type { MailDriver } from '#/types/mail.types';
import type { EnvServer } from '@orbs/env/server';

export function mailCloudflareDriver(env: EnvServer): MailDriver {
  const accountId = env.MAIL_CLOUDFLARE_ACCOUNT_ID;
  const token = env.MAIL_CLOUDFLARE_TOKEN;

  if (!accountId || !token) {
    throw new Errors.INTERNAL_ERROR({ internal: 'MAIL_DRIVER=cloudflare needs MAIL_CLOUDFLARE_ACCOUNT_ID and MAIL_CLOUDFLARE_TOKEN' });
  }

  return {
    send: async (message) => {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: { address: env.MAIL_FROM_EMAIL, name: env.MAIL_FROM_NAME },
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!mailCloudflareResponse.safeParse(await response.json()).success) {
        throw new Errors.MAIL_SEND_FAILED({ internal: `Cloudflare Email returned ${response.status}` });
      }
    },
  };
}
