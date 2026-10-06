import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/cn';
import type { ComponentProps, ReactNode } from 'react';
import type { ToastT } from 'sonner';

type ToasterProps = ComponentProps<typeof Sonner>

function Toaster({ theme = 'light', ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      theme={theme}
      toastOptions={{
        closeButton: false,
        duration: 5000,
        classNames: {
          toast: cn(
            'group toast',
            'group-[.toaster]:bg-popover!',
            'group-[.toaster]:text-foreground!',
            'group-[.toaster]:border!',
            'group-[.toaster]:dark:border-white/8!',
            'group-[.toaster]:border-white/10!',
            'group-[.toaster]:shadow-lg!',
            'group-[.toaster]:rounded-xl!',
          ),
          title: 'group-[.toast]:text-xs! group-[.toast]:font-normal!',
          description: 'group-[.toast]:text-muted-foreground! group-[.toast]:leading-none!',
          actionButton: 'group-[.toast]:bg-primary! group-[.toast]:text-primary-foreground!',
          cancelButton: 'group-[.toast]:bg-muted! group-[.toast]:text-muted-foreground!',
        },
      }}
      {...props}
    />
  );
}

interface SonnerToastyProps extends Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> {
  id?: number | string
}

interface ToastContentProps {
  message?: ReactNode
  emoji?: string | null
  className?: string
  type?: 'success' | 'error' | 'default'
}

interface SuccessOutcome {
  data?: { message?: string }
  error?: never
}

interface ErrorOutcome {
  error: {
    client?: {
      userMessage?: string
      icon?: string
    }
  }
  data?: never
}

type ToastMessage = ReactNode | SuccessOutcome | ErrorOutcome

function ToastContent({ message, emoji, className, type = 'default' }: ToastContentProps) {
  const fallbackMessages = {
    success: 'Operation successful',
    error: 'Something went wrong',
    default: 'An error occurred',
  } as const;

  const fallbackMessage = fallbackMessages[type];

  return (
    <div
      className={cn('shadow-elevation relative isolate flex w-full min-w-0 items-center rounded-xl bg-background p-2.5 pr-4 md:w-[320px]', className)}
    >
      {emoji ? (
        <span
          aria-hidden
          className="absolute inset-0 z-0 flex items-center overflow-hidden rounded-[inherit] mask-[linear-gradient(to_right,#000,transparent_75%)]"
        >
          <span className="origin-left translate-x-[-75%] scale-800 text-[2em] opacity-10 blur-xs saturate-150">{emoji}</span>
        </span>
      ) : null}
      <div className="relative flex min-w-0 items-center gap-1 select-none">
        {emoji ? <span className="flex-center size-8 flex-none text-xl">{emoji}</span> : null}
        <span className="text-xs! whitespace-pre-wrap text-secondary-foreground/70">{message ?? fallbackMessage}</span>
      </div>
    </div>
  );
}

function toastIdFromMessage(message: ReactNode) {
  if (message instanceof Object || message === null || message === undefined || message === true || message === false) {
    return undefined;
  }

  const text = `${message}`;

  if (message !== text) {
    return undefined;
  }

  let hash = 0;

  for (const char of text) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
  }

  return hash.toString();
}

function isOutcome(msg: ToastMessage): msg is SuccessOutcome | ErrorOutcome {
  return msg instanceof Object && (Object.hasOwn(msg, 'error') || Object.hasOwn(msg, 'data'));
}

function isSuccessOutcome(msg: ToastMessage): msg is SuccessOutcome {
  return isOutcome(msg) && !msg.error;
}

function isErrorOutcome(msg: ToastMessage): msg is ErrorOutcome {
  return isOutcome(msg) && Boolean(msg.error);
}

function toasty(messageOrOutcome: ToastMessage, emoji?: string | null, rest?: SonnerToastyProps) {
  let displayMessage: ReactNode;
  let displayEmoji: string | null | undefined;
  let toastType: 'success' | 'error' | 'default' = 'default';

  if (isSuccessOutcome(messageOrOutcome)) {
    displayMessage = messageOrOutcome.data?.message;
    displayEmoji = emoji ?? '✅';
    toastType = 'success';
  } else if (isErrorOutcome(messageOrOutcome)) {
    displayMessage = messageOrOutcome.error.client?.userMessage;
    displayEmoji = messageOrOutcome.error.client?.icon ?? emoji ?? '🔴';
    toastType = 'error';
  } else {
    displayMessage = messageOrOutcome;
    displayEmoji = emoji;
  }

  const toastId = rest?.id ?? toastIdFromMessage(displayMessage);

  return sonnerToast.custom(() => <ToastContent className={rest?.className} emoji={displayEmoji} message={displayMessage} type={toastType} />, {
    ...rest,
    id: toastId,
  });
}

export { Toaster, toasty };

export type { ToastMessage, SuccessOutcome, ErrorOutcome, SonnerToastyProps };
