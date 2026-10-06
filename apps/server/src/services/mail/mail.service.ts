import { match } from 'ts-pattern';
import { mailActionPasswordReset } from './mail-action.password-reset';
import { mailActionVerification } from './mail-action.verification';
import { mailCloudflareDriver } from './mail-cloudflare.driver';
import { mailDriver } from './mail.driver';
import type * as MailTypes from '#/types/mail.types';

export function makeMailService(deps: MailTypes.MailServiceDeps) {
  const driver = match(deps.env.MAIL_DRIVER)
    .with('terminal', () => mailDriver())
    .with('cloudflare', () => mailCloudflareDriver(deps.env))
    .exhaustive();

  return {
    actions: {
      verification: (params: MailTypes.MailActionLinkParams) => mailActionVerification(driver, params),
      passwordReset: (params: MailTypes.MailActionLinkParams) => mailActionPasswordReset(driver, params),
    },
  };
}

export type MailService = ReturnType<typeof makeMailService>;
