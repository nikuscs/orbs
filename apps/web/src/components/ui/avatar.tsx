import { cva } from 'cva';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

const avatarVariants = cva({
  base: 'relative flex shrink-0 overflow-hidden rounded-full',
  variants: {
    size: {
      xs: 'size-6',
      sm: 'size-8',
      md: 'size-10',
      lg: 'size-12',
      xl: 'size-14',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

function Avatar({ size, className, ...props }: ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>) {
  return <AvatarPrimitive.Root className={cn(avatarVariants({ size }), className)} data-slot="avatar" {...props} />;
}

function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full object-cover', className)} data-slot="avatar-image" {...props} />;
}

function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return <AvatarPrimitive.Fallback className={cn('flex-center size-full rounded-full bg-muted text-xxs', className)} data-slot="avatar-fallback" {...props} />;
}

export { Avatar, AvatarImage, AvatarFallback };
