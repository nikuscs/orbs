import { FFIType, ptr } from 'bun:ffi';
import { Utils } from 'electrobun/main';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desktopBlock, desktopClass, desktopFramework, desktopNew, desktopSelector, desktopSend, desktopString } from './desktop-objc';
import { desktopHome } from './desktop-settings';
import { DESKTOP } from './desktop.constants';
import type { DesktopNotify, DesktopNotifyParams } from './types/desktop.types';
import type { Pointer } from 'bun:ffi';

let authorized: Promise<boolean> | null = null;

if (DESKTOP.isDarwin) {
  desktopFramework(DESKTOP.notify.frameworks.notifications);
  desktopFramework(DESKTOP.notify.frameworks.intents);
}

function desktopNotifyCenter() {
  return desktopSend.none(desktopClass('UNUserNotificationCenter'), desktopSelector('currentNotificationCenter'));
}

function desktopNotifyAuthorize(): Promise<boolean> {
  authorized ??= new Promise((resolve) => {
    const done = desktopBlock([FFIType.bool, FFIType.ptr], (granted) => resolve(granted === true));

    if (!done) {
      resolve(false);
      return;
    }

    desktopSend.options(desktopNotifyCenter(), desktopSelector('requestAuthorizationWithOptions:completionHandler:'), DESKTOP.notify.options, done);
  });

  return authorized;
}

async function desktopNotifyAvatar({ serverUrl, botId }: Pick<DesktopNotifyParams, 'serverUrl'> & Pick<DesktopNotify, 'botId'>): Promise<Buffer | null> {
  const response = await fetch(new URL(`${DESKTOP.notify.avatarPath}${botId}.png`, serverUrl), { signal: AbortSignal.timeout(DESKTOP.notify.avatarTimeoutMs) }).catch(() => null);

  return response?.ok ? Buffer.from(await response.arrayBuffer()) : null;
}

/** Shows the bot as the sender: its avatar replaces the app icon (Communication Notifications), or sits beside it as an image when macOS refuses that. */
function desktopNotifyContent({ title, body, botId }: DesktopNotify, avatar: Buffer): Pointer | null {
  const content = desktopNew('UNMutableNotificationContent');
  const id = desktopString(botId ?? '');

  desktopSend.one(content, desktopSelector('setTitle:'), desktopString(title));
  desktopSend.one(content, desktopSelector('setBody:'), desktopString(body));
  desktopSend.one(content, desktopSelector('setThreadIdentifier:'), id);

  const data = desktopSend.bytes(desktopClass('NSData'), desktopSelector('dataWithBytes:length:'), ptr(avatar), avatar.byteLength);
  const image = desktopSend.one(desktopClass('INImage'), desktopSelector('imageWithImageData:'), data);
  const handle = desktopSend.handle(desktopSend.none(desktopClass('INPersonHandle'), desktopSelector('alloc')), desktopSelector('initWithValue:type:'), id, 0);

  const sender = desktopSend.person(
    desktopSend.none(desktopClass('INPerson'), desktopSelector('alloc')),
    desktopSelector('initWithPersonHandle:nameComponents:displayName:image:contactIdentifier:customIdentifier:'),
    handle,
    null,
    desktopString(title),
    image,
    null,
    id,
  );

  const intent = desktopSend.intent(
    desktopSend.none(desktopClass('INSendMessageIntent'), desktopSelector('alloc')),
    desktopSelector('initWithRecipients:outgoingMessageType:content:speakableGroupName:conversationIdentifier:serviceName:sender:attachments:'),
    null,
    DESKTOP.notify.messageTypeText,
    desktopString(body),
    null,
    id,
    null,
    sender,
    null,
  );

  const interaction = desktopSend.two(desktopSend.none(desktopClass('INInteraction'), desktopSelector('alloc')), desktopSelector('initWithIntent:response:'), intent, null);

  desktopSend.integer(interaction, desktopSelector('setDirection:'), DESKTOP.notify.directionIncoming);
  desktopSend.one(interaction, desktopSelector('donateInteractionWithCompletion:'), null);

  const updated = desktopSend.two(content, desktopSelector('contentByUpdatingWithProvider:error:'), intent, null);

  if (updated) {
    return updated;
  }

  const folder = join(desktopHome.root, DESKTOP.notify.folder);
  const file = join(folder, `${crypto.randomUUID()}.png`);

  mkdirSync(folder, { recursive: true });
  writeFileSync(file, avatar);

  const url = desktopSend.one(desktopClass('NSURL'), desktopSelector('fileURLWithPath:'), desktopString(file));
  const attachment = desktopSend.four(desktopClass('UNNotificationAttachment'), desktopSelector('attachmentWithIdentifier:URL:options:error:'), id, url, null, null);
  const attachments = attachment ? desktopSend.one(desktopClass('NSArray'), desktopSelector('arrayWithObject:'), attachment) : null;

  desktopSend.one(content, desktopSelector('setAttachments:'), attachments);

  return content;
}

/** Unsigned builds may not use the modern notification center; the legacy one still takes the avatar as the sender image. */
function desktopNotifyLegacy({ title, body }: DesktopNotify, avatar: Buffer): void {
  const notification = desktopNew('NSUserNotification');
  const data = desktopSend.bytes(desktopClass('NSData'), desktopSelector('dataWithBytes:length:'), ptr(avatar), avatar.byteLength);
  const image = desktopSend.one(desktopSend.none(desktopClass('NSImage'), desktopSelector('alloc')), desktopSelector('initWithData:'), data);
  const center = desktopSend.none(desktopClass('NSUserNotificationCenter'), desktopSelector('defaultUserNotificationCenter'));

  desktopSend.one(notification, desktopSelector('setTitle:'), desktopString(title));
  desktopSend.one(notification, desktopSelector('setInformativeText:'), desktopString(body));
  desktopSend.one(notification, desktopSelector('setSoundName:'), desktopString(DESKTOP.notify.legacySound));
  desktopSend.two(notification, desktopSelector('setValue:forKey:'), image, desktopString(DESKTOP.notify.legacyImageKey));
  desktopSend.main(center, desktopSelector('performSelectorOnMainThread:withObject:waitUntilDone:'), desktopSelector('deliverNotification:'), notification, false);
}

/** A notification from the web app: with a bot, macOS shows the bot avatar; anything that fails falls back to Electrobun's plain notification. */
export async function desktopNotify({ notify, serverUrl }: DesktopNotifyParams): Promise<void> {
  // macOS Communication Notifications (Intents framework with bot avatars) are Darwin-specific; use Electrobun's cross-platform notifications on Linux.
  if (!DESKTOP.isDarwin) {
    Utils.showNotification(notify);
    return;
  }

  const avatar = notify.botId ? await desktopNotifyAvatar({ serverUrl, botId: notify.botId }) : null;

  if (!avatar) {
    Utils.showNotification(notify);
    return;
  }

  const content = await desktopNotifyAuthorize() ? desktopNotifyContent(notify, avatar) : null;
  const done = content ? desktopBlock([FFIType.ptr], (error) => error && desktopNotifyLegacy(notify, avatar)) : null;

  if (!content || !done) {
    desktopNotifyLegacy(notify, avatar);
    return;
  }

  const request = desktopSend.three(desktopClass('UNNotificationRequest'), desktopSelector('requestWithIdentifier:content:trigger:'), desktopString(crypto.randomUUID()), content, null);

  desktopSend.two(desktopNotifyCenter(), desktopSelector('addNotificationRequest:withCompletionHandler:'), request, done);
}
