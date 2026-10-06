import { m } from '@orbs/i18n/client';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import { Button } from './button';
import type { ComponentProps, ReactNode } from 'react';

function AlertDialog({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs duration-200',
        className,
      )}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: 'default' | 'sm' | 'md'
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'group/alert-dialog-content data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'fixed top-1/2 left-1/2 z-50 grid w-full -translate-1/2 gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 duration-200 outline-none',
          'data-[size=default]:max-w-xs data-[size=md]:max-w-md data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm',
          className,
        )}
        data-size={size}
        data-slot="alert-dialog-content"
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid grid-rows-[auto_1fr] place-items-center gap-2 pt-1 text-center',
        'has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4',
        'sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left',
        'sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
        className,
      )}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3',
        'group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2',
        'sm:flex-row sm:justify-end',
        className,
      )}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

function AlertDialogMedia({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className,
      )}
      data-slot="alert-dialog-media"
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn(
        'text-base leading-none font-medium tracking-normal',
        'sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
        className,
      )}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(
        'text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button asChild size={size} variant={variant}>
      <AlertDialogPrimitive.Action className={cn(className)} data-slot="alert-dialog-action" {...props} />
    </Button>
  );
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Cancel> & Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button asChild size={size} variant={variant}>
      <AlertDialogPrimitive.Cancel className={cn(className)} data-slot="alert-dialog-cancel" {...props} />
    </Button>
  );
}

interface ConfirmationDialogProps extends Omit<ComponentProps<typeof AlertDialog>, 'children' | 'open' | 'onOpenChange'> {
  title: ReactNode
  confirmLabel: ReactNode
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  variant?: ComponentProps<typeof AlertDialogAction>['variant']
  children: ReactNode
}

function ConfirmationDialog({ title, confirmLabel, pending, onConfirm, onOpenChange, variant, children, ...props }: ConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={onOpenChange} {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{m.ui_cancel()}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
  ConfirmationDialog,
};
