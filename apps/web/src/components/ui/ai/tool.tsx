import { m } from '@orbs/i18n/client';
import { cva } from 'cva';
import { cn } from '@/lib/cn';
import IconLucideBan from '~icons/lucide/ban';
import IconLucideCheck from '~icons/lucide/check';
import IconLucideChevronDown from '~icons/lucide/chevron-down';
import IconLucideHammer from '~icons/lucide/hammer';
import IconLucideLoaderCircle from '~icons/lucide/loader-circle';
import IconLucideShieldQuestion from '~icons/lucide/shield-question';
import IconLucideX from '~icons/lucide/x';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../collapsible';
import type { ToolUIPart } from 'ai';
import type { VariantProps } from 'cva';
import type { ComponentProps, ReactNode } from 'react';

const toolEase = 'duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:animate-none';

export function ToolGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('-mx-1.5 flex w-fit max-w-full min-w-0 flex-col py-1.5', className)} {...props} />;
}

export function ToolGroupToggle({ open, avatar, state, className, children, ...props }: ComponentProps<'button'> & {
  open: boolean
  avatar?: ReactNode
  state: ToolUIPart['state']
}) {
  return (
    <button
      aria-expanded={open}
      className={cn(
        'group/toggle flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left transition-colors duration-100 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className,
      )}
      type="button"
      {...props}
    >
      {avatar ? <span aria-hidden="true" className="flex shrink-0">{avatar}</span> : null}
      <span className="relative flex-center size-3.5 shrink-0 text-muted-foreground">
        <IconLucideHammer className={cn('size-3 transition-opacity duration-100 group-hover/toggle:opacity-0 group-focus-visible/toggle:opacity-0', open && 'opacity-0')} />
        <IconLucideChevronDown
          className={cn(
            'absolute size-3 transition-[opacity,transform] duration-150 group-hover/toggle:opacity-100 group-focus-visible/toggle:opacity-100 motion-reduce:transition-none',
            open ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
          )}
        />
      </span>
      <span className="shrink-0 text-xxs font-medium text-foreground tabular-nums">{children}</span>
      <span className="ml-auto flex shrink-0 pl-1">
        <ToolStatus state={state} />
      </span>
    </button>
  );
}

const toolGroupItemVariants = cva({
  base: ['grid transition-[grid-template-rows,opacity]', toolEase],
  variants: {
    collapsed: {
      true: 'grid-rows-[0fr] opacity-0',
      false: 'grid-rows-[1fr] opacity-100',
    },
    enter: {
      true: 'animate-in fade-in slide-in-from-bottom-1',
      false: '',
    },
  },
  defaultVariants: {
    collapsed: false,
    enter: false,
  },
});

export function ToolGroupItem({ collapsed, enter, className, children, ...props }: ComponentProps<'div'> & VariantProps<typeof toolGroupItemVariants>) {
  return (
    <div aria-hidden={collapsed ?? undefined} className={cn(toolGroupItemVariants({ collapsed, enter }), className)} inert={collapsed ?? undefined} {...props}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function Tool({ className, ...props }: ComponentProps<typeof Collapsible>) {
  return <Collapsible className={cn('flex min-w-0 flex-col', className)} {...props} />;
}

export function ToolStatus({ state }: { state: ToolUIPart['state'] }) {
  const labels = {
    'input-streaming': m.ui_tool_state_pending(),
    'input-available': m.ui_tool_state_running(),
    'approval-requested': m.ui_tool_state_approval(),
    'approval-responded': m.ui_tool_state_running(),
    'output-available': m.ui_tool_state_completed(),
    'output-error': m.ui_tool_state_error(),
    'output-denied': m.ui_tool_state_denied(),
  } satisfies Record<ToolUIPart['state'], string>;

  const running = <IconLucideLoaderCircle className="size-3 animate-spin text-muted-foreground motion-reduce:animate-none" />;

  const icons = {
    'input-streaming': running,
    'input-available': running,
    'approval-requested': <IconLucideShieldQuestion className="size-3 text-foreground" />,
    'approval-responded': running,
    'output-available': <IconLucideCheck className="size-3 text-muted-foreground" />,
    'output-error': <IconLucideX className="size-3 text-destructive" />,
    'output-denied': <IconLucideBan className="size-3 text-muted-foreground" />,
  } satisfies Record<ToolUIPart['state'], ReactNode>;

  return (
    <span className="flex-center size-3.5 shrink-0" title={labels[state]}>
      {icons[state]}
      <span className="sr-only">{labels[state]}</span>
    </span>
  );
}

export function ToolTrigger({ avatar, icon, name, preview, state, className, ...props }: ComponentProps<typeof CollapsibleTrigger> & {
  avatar?: ReactNode
  icon: ReactNode
  name: string
  preview?: string
  state: ToolUIPart['state']
}) {
  return (
    <CollapsibleTrigger
      className={cn(
        'group/tool flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left transition-colors duration-100 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className,
      )}
      {...props}
    >
      {avatar ? <span aria-hidden="true" className="flex shrink-0">{avatar}</span> : null}
      <span className="relative flex-center size-3.5 shrink-0 text-muted-foreground">
        <span className="flex transition-opacity duration-100 group-hover/tool:opacity-0 group-focus-visible/tool:opacity-0 group-data-[state=open]/tool:opacity-0 [&>svg]:size-3">{icon}</span>
        <IconLucideChevronDown className="absolute size-3 -rotate-90 opacity-0 transition-[opacity,transform] duration-150 group-hover/tool:opacity-100 group-focus-visible/tool:opacity-100 group-data-[state=open]/tool:rotate-0 group-data-[state=open]/tool:opacity-100 motion-reduce:transition-none" />
      </span>
      <span className="shrink-0 font-mono text-xxs font-medium text-foreground">{name}</span>
      {preview ? <span className="min-w-0 truncate font-mono text-xxs text-muted-foreground">{preview}</span> : null}
      <span className="ml-auto flex shrink-0 pl-1">
        <ToolStatus state={state} />
      </span>
    </CollapsibleTrigger>
  );
}

export function ToolContent({ className, children, ...props }: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent className={cn(toolEase, className)} {...props}>
      <div className="mt-0.5 mb-1 ml-3.25 flex min-w-0 flex-col gap-2 border-l py-0.5 pl-3.5">{children}</div>
    </CollapsibleContent>
  );
}

const toolCodeVariants = cva({
  base: 'scrollbar-thin max-h-64 max-w-full overflow-auto font-mono text-xxs leading-relaxed whitespace-pre',
  variants: {
    variant: {
      default: 'text-muted-foreground',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function ToolCode({ variant, className, ...props }: ComponentProps<'pre'> & VariantProps<typeof toolCodeVariants>) {
  return <pre className={cn(toolCodeVariants({ variant }), className)} {...props} />;
}
