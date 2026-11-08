import { z } from 'zod';

export const AVATAR = {
  maxBytes: 8 * 1024 * 1024,
  mediaTypes: ['image/png', 'image/jpeg', 'image/webp'],
  size: 512,
  notificationSize: 256,
  pathPrefix: '/avatars/',
  generateDescriptionMaxLength: 500,
} as const;

export const avatarImageId = z.uuid();

export const avatarUpload = z.object({
  file: z.file().min(1).max(AVATAR.maxBytes).refine((file) => (
    AVATAR.mediaTypes.some((mediaType) => mediaType === file.type.split(';', 1)[0]?.trim())
  )),
});

export type AvatarUploadInput = z.infer<typeof avatarUpload>;

export const avatarGenerate = z.object({
  description: z.string().trim().min(1).max(AVATAR.generateDescriptionMaxLength),
});

export type AvatarGenerateInput = z.infer<typeof avatarGenerate>;

export const avatarSettings = z.object({ generatorUrl: z.url({ protocol: /^https?$/ }).max(512) });
export const avatarConfigure = avatarSettings.partial();

export const avatarStatus = avatarSettings.extend({ isAvailable: z.boolean(), model: z.string().nullable() });

export type AvatarSettings = z.infer<typeof avatarSettings>;
export type AvatarStatus = z.infer<typeof avatarStatus>;
export type AvatarConfigureInput = z.infer<typeof avatarConfigure>;
