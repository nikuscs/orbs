import { m } from '@orbs/i18n/client';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import X from '~icons/lucide/x';
import type { ComponentProps } from 'react';

/**
 * Dialog Root
 * Note: This is required due to SSR issue when dialog is default open on SSR
 * @see https://github.com/radix-ui/primitives/issues/1386
 */
function Dialog({ open, defaultOpen, ...props }: DialogPrimitive.DialogProps) {
  const isOpen = open ?? defaultOpen ?? false;

  return <DialogPrimitive.Root data-slot="dialog" open={isOpen} {...props} />;
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.DialogPortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs',
        className,
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({
  close = true,
  closeLabel = m.ui_close(),
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  close?: boolean
  closeLabel?: string
}) {
  return (
    <DialogPortal>
      <DialogOverlay className="grid place-items-center overflow-y-auto p-4">
        <DialogPrimitive.Content
          className={cn(
            'bg-background data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'relative z-50 my-4 grid w-full max-w-lg gap-4 rounded-lg border p-6 shadow-lg duration-200 dark:border-border/30',
            className,
          )}
          data-slot="dialog-content"
          {...props}
        >
          {children}
          {close ? (
            <DialogPrimitive.Close
              className={cn(
                "absolute top-3 right-3 flex-center size-7 cursor-pointer rounded-md ring-offset-background before:absolute before:-inset-2 before:content-[''] focus:ring-ring",
                'text-muted-foreground/70 transition-colors hover:bg-muted hover:text-muted-foreground',
                'focus:ring-2 focus:ring-offset-2 focus:outline-hidden',
                'disabled:cursor-not-allowed disabled:opacity-50',
                '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
              )}
            >
              <X className="size-4" />
              <span className="sr-only">{closeLabel}</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('-mx-6 -mt-6 mb-2 flex flex-col gap-1 border-b border-border/50 px-6 pt-4 pb-3 text-left', className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('-mx-6 mt-2 -mb-6 flex flex-col-reverse gap-2 border-t border-border/50 px-6 py-3 sm:flex-row sm:justify-end', className)}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base leading-none font-semibold', className)} data-slot="dialog-title" {...props} />;
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-xs text-muted-foreground', className)} data-slot="dialog-description" {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
