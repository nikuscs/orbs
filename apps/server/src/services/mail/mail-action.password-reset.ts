import { m } from '@orbs/i18n/server';
import type { MailActionLinkParams, MailDriver } from '#/types/mail.types';

export function mailActionPasswordReset(driver: MailDriver, params: MailActionLinkParams): Promise<void> {
  return driver.send({
    to: params.to,
    subject: m.mail_password_reset_subject(),
    text: `${m.mail_password_reset_intro()}\n\n${params.url}`,
    html: `<p>${m.mail_password_reset_intro()}</p><p><a href="${params.url}">${m.mail_password_reset_action()}</a></p>`,
  });
}
