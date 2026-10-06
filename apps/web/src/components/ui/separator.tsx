import { cva } from 'cva';
import { Separator as SeparatorPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type { VariantProps } from 'cva';
import type * as React from 'react';

const separatorVariants = cva({
  base: 'pointer-events-none shrink-0',
  variants: {
    variant: {
      solid: 'bg-border',
      dotted: 'bg-transparent text-muted-foreground',
    },
    orientation: {
      horizontal: 'w-full',
      vertical: 'h-full',
    },
  },
  compoundVariants: [
    {
      variant: 'solid',
      orientation: 'horizontal',
      className: 'h-px',
    },
    {
      variant: 'solid',
      orientation: 'vertical',
      className: 'w-px',
    },
    {
      variant: 'dotted',
      orientation: 'horizontal',
      className: 'h-px [background:linear-gradient(90deg,currentColor_4px,transparent_4px)_50%_50%/8px_1px_repeat_no-repeat]',
    },
    {
      variant: 'dotted',
      orientation: 'vertical',
      className: 'w-px [background:linear-gradient(180deg,currentColor_4px,transparent_4px)_50%_50%/1px_8px_repeat_no-repeat]',
    },
  ],
  defaultVariants: {
    variant: 'solid',
    orientation: 'horizontal',
  },
});

interface SeparatorProps extends Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, 'orientation'>, VariantProps<typeof separatorVariants> {}

function Separator({ className, variant = 'solid', orientation = 'horizontal', decorative = true, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      className={cn(separatorVariants({ variant, orientation }), className)}
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...props}
    />
  );
}

const separatorWithLabelVariants = cva({
  base: 'relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center',
  variants: {
    variant: {
      solid: 'after:border-t after:border-border/60',
      dotted: 'pointer-events-none after:h-px after:text-muted-foreground/20 after:[background:linear-gradient(90deg,currentColor_4px,transparent_4px)_50%_50%/8px_1px_repeat_no-repeat]',
    },
  },
  defaultVariants: {
    variant: 'solid',
  },
});

interface SeparatorWithLabelProps extends React.ComponentProps<'div'>, VariantProps<typeof separatorWithLabelVariants> {
  label: string
}

function SeparatorWithLabel({ label, variant = 'solid', className, ...props }: SeparatorWithLabelProps) {
  return (
    <div className={separatorWithLabelVariants({ variant })} data-slot="separator-with-label" {...props}>
      <span className={cn('relative z-10 rounded-full border bg-card px-2.5 py-0.5 text-xxs font-medium text-muted-foreground/90', className)}>{label}</span>
    </div>
  );
}

export { Separator, SeparatorWithLabel, separatorVariants, separatorWithLabelVariants };
