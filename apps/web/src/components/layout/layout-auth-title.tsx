import { Link } from '@tanstack/react-router';
import { LayoutBrand } from '@/components/layout/layout-brand';
import { cn } from '@/lib/cn';
import BrandsOrbs from '~icons/brands/orbs';
import type { ComponentProps } from 'react';

interface LayoutAuthTitleProps extends ComponentProps<'div'> {
  title: string
  description: string
}

export function LayoutAuthTitle({ title, description, className, ...props }: LayoutAuthTitleProps) {
  return (
    <div className={cn('mb-6 flex flex-col items-center text-center', className)} {...props}>
      <Link className="mb-4 flex flex-col items-center gap-2" to="/">
        <BrandsOrbs aria-hidden="true" className="size-10 text-black dark:text-white" />
        <LayoutBrand size="lg" />
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-xs text-balance text-muted-foreground">{description}</p>
    </div>
  );
}
