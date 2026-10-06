import { cva } from 'cva';
import { Children } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './skeleton';
import type { ComponentProps, ReactNode } from 'react';

const emptyVariants = cva({
  base: 'group/empty flex-center min-w-0 flex-1 flex-col gap-6 rounded-lg border-dashed p-6 text-center text-balance',
  variants: { size: { default: 'md:p-12', sm: '' } },
  defaultVariants: { size: 'default' },
});

interface EmptyProps extends ComponentProps<'div'> {
  size?: 'default' | 'sm'
}

function Empty({ className, size = 'default', ...props }: EmptyProps) {
  return (
    <div
      className={cn(emptyVariants({ size }), className)}
      data-size={size}
      data-slot="empty"
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex max-w-sm flex-col items-center gap-2 text-center', className)} data-slot="empty-header" {...props} />;
}

function EmptyTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-lg font-medium tracking-tight group-data-[size=sm]/empty:text-sm', className)} data-slot="empty-title" {...props} />;
}

function EmptyDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <div
      className={cn('max-w-md text-center text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary', className)}
      data-slot="empty-description"
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-2 text-sm text-balance', className)} data-slot="empty-content" {...props} />;
}

const emptyIconBox =
  'bg-background dark:bg-muted size-14 group-data-[size=sm]/empty:size-10 grid place-items-center rounded-xl shadow-lg ring-1 ring-border transition duration-500 group-hover:duration-200 [&_svg]:size-7 group-data-[size=sm]/empty:[&_svg]:size-5 [&_svg]:text-muted-foreground';

function EmptyIcons({ children }: { children: ReactNode }) {
  const icons = Children.toArray(children);

  if (icons.length === 0) {
    return null;
  }

  return (
    <div className="isolate mb-2 flex justify-center">
      {icons.length === 3 ? (
        <>
          <div className={cn(emptyIconBox, 'relative top-1.5 left-3 -rotate-6 group-hover:-translate-x-1 group-hover:-translate-y-0.5 group-hover:-rotate-8')}>
            {icons[0]}
          </div>
          <div className={cn(emptyIconBox, 'relative z-10 group-hover:-translate-y-1')}>{icons[1]}</div>
          <div className={cn(emptyIconBox, 'relative top-1.5 right-3 rotate-6 group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:rotate-8')}>
            {icons[2]}
          </div>
        </>
      ) : (
        <div className={cn(emptyIconBox, 'group-hover:-translate-y-1')}>{icons[0]}</div>
      )}
    </div>
  );
}

function EmptyCard({ className, ...props }: ComponentProps<'div'>) {
  return <Empty className={cn('group rounded-xl border-2 border-border px-14 py-20', className)} {...props} />;
}

interface EmptyBlurredStateProps extends ComponentProps<'div'> {
  children: ReactNode
  icons?: [ReactNode, ReactNode, ReactNode]
  title: string
  description: string
  action?: ReactNode
  minHeight?: string
}

function EmptyBlurredState({ children, icons, title, description, action, minHeight, style, className, ...props }: EmptyBlurredStateProps) {
  const mergedStyle = minHeight ? { ...style, minHeight } : style;

  return (
    <div className={cn('relative', className)} style={mergedStyle} {...props}>
      <div aria-hidden="true" className="pointer-events-none opacity-90 blur-[2px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex-center">
        <div className="group relative flex flex-col items-center gap-2">
          <div className="absolute -inset-x-12 -inset-y-8 rounded-3xl bg-background/80 blur-xl dark:bg-background/40" />
          <div className="relative flex flex-col items-center gap-2">
            {icons ? (
              <EmptyIcons>
                {icons[0]}
                {icons[1]}
                {icons[2]}
              </EmptyIcons>
            ) : null}
            <EmptyTitle className="text-base">{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
            {action ? <div className="mt-2">{action}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPlaceholderRows({ count = 6 }: { count?: number }) {
  return (
    <div className="rounded-lg border">
      {Array.from({ length: count }, (_, index) => (
        <div className="flex gap-3 border-b px-4 py-2 last:border-b-0" key={index}>
          <div className="mt-0.5 size-4 shrink-0 rounded-lg border border-input shadow-xs dark:bg-input/30" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="hidden h-3 flex-1 sm:block" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Empty, EmptyCard, EmptyHeader, EmptyIcons, EmptyTitle, EmptyDescription, EmptyContent, EmptyBlurredState, EmptyPlaceholderRows };
