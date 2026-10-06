import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsFromNames } from '@/lib/initials';
import type { AuthSession } from '@orbs/server/client';
import type { ComponentProps } from 'react';

interface UserAvatarProps extends ComponentProps<typeof Avatar> {
  user: Pick<AuthSession['user'], 'name' | 'image'>
  alt?: string
  fallback?: string
  src?: string | null
}

export function UserAvatar({ user, alt, fallback, src, ...props }: UserAvatarProps) {
  const display = alt ?? user.name;
  const image = user.image && URL.canParse(user.image) && ['http:', 'https:'].includes(new URL(user.image).protocol) ? user.image : undefined;
  const avatar = src ?? image;

  return (
    <Avatar {...props}>
      <AvatarImage alt={display} src={avatar} />
      <AvatarFallback>{fallback ?? initialsFromNames([display])}</AvatarFallback>
    </Avatar>
  );
}
