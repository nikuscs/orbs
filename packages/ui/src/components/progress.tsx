import { cva } from 'cva';
import { Progress as ProgressPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

const progressIndicatorVariants = cva({
  base: 'size-full flex-1 transition-all motion-reduce:transition-none',
  variants: {
    variant: {
      default: 'bg-primary',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Progress({ className, value, variant, ...props }: ComponentProps<typeof ProgressPrimitive.Root> & VariantProps<typeof progressIndicatorVariants>) {
  return (
    <ProgressPrimitive.Root className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)} data-slot="progress" {...props}>
      <ProgressPrimitive.Indicator
        className={progressIndicatorVariants({ variant })}
        data-slot="progress-indicator"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
