import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import { TooltipHelper } from './tooltip';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';

export type CardProps = ComponentProps<typeof Card>

function CardPanel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-[calc(var(--radius-md)+3px)] border border-black/4 p-0.75 dark:border-white/4', className)}
      data-slot="card-panel"
      {...props}
    />
  );
}

function Card({ className, asChild, ...props }: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'div';
  return <Comp className={cn('relative flex flex-col rounded-md border bg-card text-card-foreground shadow-sm', className)} data-slot="card" {...props} />;
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 p-6 pb-2 has-data-[slot=card-action]:grid has-data-[slot=card-action]:auto-rows-min has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-action]:gap-2',
        className,
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, asChild = false, ...props }: ComponentProps<'h3'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'h3';
  return <Comp className={cn('leading-none font-medium', className)} data-slot="card-title" {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-xs font-light text-muted-foreground', className)} data-slot="card-description" {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6 pt-1', className)} data-slot="card-content" {...props} />;
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} data-slot="card-action" {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center', className)} data-slot="card-footer" {...props} />;
}

function CardListItem({ className, asChild, ...props }: ComponentProps<'li'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'li';
  return (
    <Comp
      className={cn(
        'group bg-card px-4 py-2 hover:bg-muted/50 data-[state=selected]:bg-muted',
        'cursor-pointer rounded-md border border-input/40',
        'flex w-full flex-row items-center justify-between gap-4',
        className,
      )}
      data-slot="card-list-item"
      {...props}
    />
  );
}

function CardListGroup({ className, asChild, ...props }: ComponentProps<'ul'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'ul';
  return <Comp className={cn('flex-center flex-col gap-2', className)} data-slot="card-list-group" {...props} />;
}

export interface CardRowItem {
  key: string
  name: string | ReactNode
  value: string | ReactNode
  helper?: string
  props?: ComponentProps<typeof CardListItem>
}

function CardList({
  title,
  subtitle,
  list,
  className,
  ...props
}: Omit<CardProps, 'title' | 'subtitle'> & {
  title?: ReactNode
  subtitle?: ReactNode
  list: CardRowItem[]
}) {
  return (
    <Card {...props} className={className}>
      <CardHeader>
        {title ? <CardTitle>{title}</CardTitle> : null}
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CardListGroup>
          {list.map((item) => (
            <CardListItem {...item.props} key={item.key}>
              <div className="relative flex shrink-0 items-start justify-start gap-1 text-sm font-medium">
                {item.helper ? <TooltipHelper leading={item.name}>{item.helper}</TooltipHelper> : item.name}
              </div>
              <div className={cn('flex text-xs text-muted-foreground')}>{item.value}</div>
            </CardListItem>
          ))}
        </CardListGroup>
      </CardContent>
    </Card>
  );
}

export interface CardBentoProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  className?: string
  background: ReactNode
  icon: ReactNode
  description: string
  hoverEffect?: boolean
}

function CardBento({ name, className, background, icon, description, hoverEffect = true, ...props }: CardBentoProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-lg',
        'bg-card',
        'transform-gpu border border-input/60',
        'shadow-sm',
        className,
      )}
      data-slot="card-bento"
      {...props}
    >
      {background}
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 bg-linear-to-t from-card to-transparent p-6">
        <div className="transition-all duration-300 group-hover:-translate-y-2">
          {icon ? (
            <div className="size-12 origin-left transform-gpu text-3xl text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75">
              {icon}
            </div>
          ) : null}
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">{name}</h3>
          <p className="max-w-lg text-xs text-neutral-400 sm:text-sm">{description}</p>
        </div>
      </div>
      {hoverEffect ? (
        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10" />
      ) : null}
    </div>
  );
}

export { Card, CardPanel, CardHeader, CardAction, CardFooter, CardTitle, CardDescription, CardContent, CardList, CardListItem, CardListGroup, CardBento };
