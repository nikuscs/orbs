import { m } from '@orbs/i18n/client';
import { cva } from 'cva';
import { cn } from '@/lib/cn';

const layoutBrandVariants = cva({
  base: 'font-semibold tracking-tight',
  variants: { size: { default: 'text-base', lg: 'text-2xl' } },
  defaultVariants: { size: 'default' },
});

interface LayoutBrandProps {
  className?: string
  size?: 'default' | 'lg'
}

export function LayoutBrand({ className, size }: LayoutBrandProps) {
  return <span className={cn(layoutBrandVariants({ size }), className)}>{m.layout_brand()}</span>;
}
