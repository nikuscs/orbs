import type { MailDriver } from '#/types/mail.types';

export function mailDriver(): MailDriver {
  return {
    send: async (message) => {
      process.stdout.write(`${JSON.stringify({
        tag: 'mail',
        to: message.to,
        subject: message.subject,
        text: message.text,
      })}\n`);
    },
  };
}
