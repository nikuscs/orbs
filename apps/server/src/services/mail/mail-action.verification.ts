import { m } from '@orbs/i18n/server';
import type { MailActionLinkParams, MailDriver } from '#/types/mail.types';

export function mailActionVerification(driver: MailDriver, params: MailActionLinkParams): Promise<void> {
  return driver.send({
    to: params.to,
    subject: m.mail_verification_subject(),
    text: `${m.mail_verification_intro()}\n\n${params.url}`,
    html: `<p>${m.mail_verification_intro()}</p><p><a href="${params.url}">${m.mail_verification_action()}</a></p>`,
  });
}
