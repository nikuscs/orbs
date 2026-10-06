import { cva } from 'cva';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import type { UIMessage } from 'ai';
import type { VariantProps } from 'cva';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role']
}

export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        'group flex w-full items-end justify-end gap-2 py-2',
        from !== 'user' && 'flex-row-reverse justify-end',
        className,
      )}
      data-role={from === 'user' ? 'user' : 'assistant'}
      {...props}
    />
  );
}

export function MessageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex max-w-full min-w-0 flex-col gap-1 group-data-[role=assistant]:items-start group-data-[role=user]:items-end md:max-w-[80%]', className)} {...props} />;
}

const messageContentVariants = cva({
  base: [
    'flex flex-col gap-2 overflow-hidden rounded-2xl px-4 py-3 text-sm',
    'group-data-[role=user]:bg-primary group-data-[role=user]:text-primary-foreground',
    'group-data-[role=assistant]:bg-secondary group-data-[role=assistant]:text-foreground',
  ],
  variants: {
    tail: {
      true: 'group-data-[role=assistant]:rounded-bl-lg group-data-[role=user]:rounded-br-lg',
      false: '',
    },
  },
  defaultVariants: {
    tail: true,
  },
});

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof messageContentVariants>

// iOS-style bubble tail: a small filled wedge tucked under the bottom corner nearest the sender.
export function MessageContent({ children, className, tail = true, ...props }: MessageContentProps) {
  return (
    <div className="relative w-fit max-w-full">
      <div className={cn(messageContentVariants({ tail }), className)} {...props}>
        {children}
      </div>
      {tail ? (
        <>
          <svg aria-hidden className="absolute -right-2.5 bottom-0 hidden size-5 fill-primary group-data-[role=user]:block" viewBox="0 0 20 20">
            <path d="M0 0 H10 V12 C10 16 13 19 18 20 C13 20 11 20 10 20 H0 Z" />
          </svg>
          <svg aria-hidden className="absolute bottom-0 -left-2.5 hidden size-5 fill-secondary group-data-[role=assistant]:block" viewBox="0 0 20 20">
            <path d="M20 0 H10 V12 C10 16 7 19 2 20 C7 20 9 20 10 20 H20 Z" />
          </svg>
        </>
      ) : null}
    </div>
  );
}

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string
  name?: string
}

export function MessageAvatar({ src, name, className, ...props }: MessageAvatarProps) {
  return (
    <Avatar className={cn('size-8 ring-1 ring-border', className)} {...props}>
      <AvatarImage alt="" className="my-0" src={src} />
      <AvatarFallback>{name?.slice(0, 2) ?? 'ME'}</AvatarFallback>
    </Avatar>
  );
}
