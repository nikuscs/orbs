import { cva } from 'cva';
import { createContext, use, useState } from 'react';
import { createPortal } from 'react-dom';
import { match } from 'ts-pattern';
import { cn } from '@/lib/cn';
import IconLucideFileText from '~icons/lucide/file-text';
import IconLucideLoader2 from '~icons/lucide/loader-2';
import IconLucidePlus from '~icons/lucide/plus';
import IconLucideReply from '~icons/lucide/reply';
import IconLucideSend from '~icons/lucide/send';
import IconLucideSquare from '~icons/lucide/square';
import IconLucideX from '~icons/lucide/x';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton } from '../input-group';
import type { ChatStatus } from 'ai';
import type { VariantProps } from 'cva';
import type * as ReactTypes from 'react';

export interface PromptInputMessage {
  text: string
}

export type PromptInputProps = Omit<ReactTypes.HTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage, event: ReactTypes.FormEvent<HTMLFormElement>) => boolean | Promise<boolean>
}

// Where `PromptInputDrawer` renders: outside the `InputGroup`, whose `overflow-hidden` would clip it.
const PromptInputDrawerSlot = createContext<HTMLDivElement | null>(null);

/** The composer, following Vercel AI Elements: an `InputGroup` whose addons hold the actions around the field; it resets once `onSubmit` reports the message sent, so a failed send keeps what was typed. */
export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const [drawer, setDrawer] = useState<HTMLDivElement | null>(null);

  const handleSubmit: ReactTypes.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.elements.namedItem('message');

    const text = field instanceof HTMLInputElement ? field.value : '';

    void Promise.resolve(onSubmit({ text }, event)).then((sent) => {
      if (sent && field instanceof HTMLInputElement && field.value === text && form.isConnected) {
        form.reset();
      }
    });
  };

  return (
    <form className={cn('relative w-full', className)} onSubmit={handleSubmit} {...props}>
      {/* The drawer's bottom edge runs 1rem under the composer, so it looks pulled out from behind it. */}
      <div className="absolute inset-x-5 bottom-[calc(100%-1rem)]" ref={setDrawer} />
      <PromptInputDrawerSlot value={drawer}>
        {/* Actions sit on the last line, so they stay put while the field grows; the solid dark fill hides the drawer behind it. */}
        <InputGroup className="relative h-auto flex-wrap items-end overflow-hidden rounded-3xl bg-background shadow-sm has-[>[data-align=block-start]]:flex-row dark:bg-card">{children}</InputGroup>
      </PromptInputDrawerSlot>
    </form>
  );
}

const promptInputDrawerVariants = cva({
  base: 'flex max-h-72 flex-col overflow-y-auto rounded-t-xl border border-b-0 p-1 pb-5 shadow-sm',
  variants: {
    variant: {
      default: 'bg-popover text-popover-foreground',
      destructive: 'border-destructive/20 bg-[color-mix(in_oklab,var(--destructive)_8%,var(--popover))] text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

/** A panel tucked behind the composer's top edge, as wide as the composer minus its corners; it scrolls when tall. */
export function PromptInputDrawer({
  variant,
  className,
  children,
}: VariantProps<typeof promptInputDrawerVariants> & { className?: string; children: ReactTypes.ReactNode }) {
  const drawer = use(PromptInputDrawerSlot);

  if (!drawer) {
    return null;
  }

  return createPortal(
    <div className={cn(promptInputDrawerVariants({ variant }), className)}>
      {children}
    </div>,
    drawer,
  );
}

export function PromptInputQuote({ children, removeLabel, onRemove }: { children: ReactTypes.ReactNode; removeLabel: string; onRemove: () => void }) {
  return (
    <InputGroupAddon align="block-start">
      <div className="flex w-full min-w-0 items-center gap-2 rounded-xl bg-muted py-1 pr-1 pl-3 text-xs font-normal text-muted-foreground">
        <IconLucideReply className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <PromptInputButton
          aria-label={removeLabel}
          size="icon-xs"
          title={removeLabel}
          onClick={onRemove}
        >
          <IconLucideX className="size-3.5" />
        </PromptInputButton>
      </div>
    </InputGroupAddon>
  );
}

export function PromptInputAttachment({ name, preview, image, status, removeLabel, onRemove }: {
  name: string
  preview: string
  image: boolean
  status: 'uploading' | 'ready' | 'failed'
  removeLabel: string
  onRemove: () => void
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-muted p-1 text-xs text-muted-foreground data-[status=failed]:text-destructive" data-status={status}>
      {image ? <img alt="" className="size-8 rounded-lg object-cover" src={preview} /> : <IconLucideFileText className="ml-2 size-3.5 shrink-0" />}
      <span className="max-w-40 truncate">{name}</span>
      {status === 'uploading' ? <IconLucideLoader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" /> : null}
      <PromptInputButton
        aria-label={removeLabel}
        size="icon-xs"
        title={removeLabel}
        onClick={onRemove}
      >
        <IconLucideX className="size-3.5" />
      </PromptInputButton>
    </div>
  );
}

export function PromptInputButton({ className, variant = 'ghost', size = 'icon-sm', ...props }: ReactTypes.ComponentProps<typeof InputGroupButton>) {
  return <InputGroupButton className={cn('rounded-full', className)} size={size} variant={variant} {...props} />;
}

export function PromptInputActionMenu(props: ReactTypes.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu {...props} />;
}

export function PromptInputActionMenuTrigger({ children, ...props }: ReactTypes.ComponentProps<typeof PromptInputButton>) {
  return (
    <DropdownMenuTrigger asChild>
      <PromptInputButton {...props}>{children ?? <IconLucidePlus className="size-4" />}</PromptInputButton>
    </DropdownMenuTrigger>
  );
}

export function PromptInputActionMenuContent(props: ReactTypes.ComponentProps<typeof DropdownMenuContent>) {
  return <DropdownMenuContent align="start" {...props} />;
}

export function PromptInputActionMenuItem(props: ReactTypes.ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem {...props} />;
}

export type PromptInputSubmitProps = ReactTypes.ComponentProps<typeof PromptInputButton> & {
  status?: ChatStatus
}

export function PromptInputSubmit({ variant = 'default', status, children, ...props }: PromptInputSubmitProps) {
  const icon = match(status)
    .with('submitted', () => <IconLucideLoader2 className="size-4 animate-spin motion-reduce:animate-none" />)
    .with('streaming', () => <IconLucideSquare className="size-3.5" />)
    .with('error', () => <IconLucideX className="size-4" />)
    .otherwise(() => <IconLucideSend className="size-4" />);

  return (
    <PromptInputButton type="submit" variant={variant} {...props}>
      {children ?? icon}
    </PromptInputButton>
  );
}
