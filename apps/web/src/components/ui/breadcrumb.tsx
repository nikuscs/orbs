import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import ChevronRightICon from '~icons/lucide/chevron-right';
import MoreHorizontal from '~icons/lucide/ellipsis';
import type { ComponentProps, ReactNode } from 'react';

function Breadcrumb({
  ref,
  ...props
}: ComponentProps<'nav'> & {
  separator?: ReactNode
  ref?: React.Ref<HTMLElement>
}) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" ref={ref} {...props} />;
}

function BreadcrumbList({ className, ref, ...props }: ComponentProps<'ol'> & { ref?: React.Ref<HTMLOListElement> }) {
  return (
    <ol
      className={cn('flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5', className)}
      data-slot="breadcrumb-list"
      ref={ref}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ref, ...props }: ComponentProps<'li'> & { ref?: React.Ref<HTMLLIElement> }) {
  return <li className={cn('inline-flex items-center gap-1.5', className)} data-slot="breadcrumb-item" ref={ref} {...props} />;
}

function BreadcrumbLink({
  asChild,
  className,
  ref,
  ...props
}: ComponentProps<'a'> & {
  asChild?: boolean
  ref?: React.Ref<HTMLAnchorElement>
}) {
  const Comp = asChild ? SlotPrimitive.Slot : 'a';

  return <Comp className={cn('transition-colors hover:text-foreground', className)} data-slot="breadcrumb-link" ref={ref} {...props} />;
}

function BreadcrumbPage({ className, ref, ...props }: ComponentProps<'span'> & { ref?: React.Ref<HTMLSpanElement> }) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      className={cn('font-normal text-foreground', className)}
      data-slot="breadcrumb-page"
      ref={ref}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
  return (
    <li aria-hidden="true" className={cn('[&>svg]:size-3.5', className)} data-slot="breadcrumb-separator" role="presentation" {...props}>
      {children ?? <ChevronRightICon />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span aria-hidden="true" className={cn('flex-center size-9', className)} data-slot="breadcrumb-ellipsis" role="presentation" {...props}>
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
