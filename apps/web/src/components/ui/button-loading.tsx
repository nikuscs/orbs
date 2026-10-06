import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import IconSpinner from '~icons/svg-spinners/90-ring-with-bg';
import { buttonVariants } from './button';
import type { Button } from './button';
import type { ComponentProps, ReactNode } from 'react';

export interface ButtonLoadingProps extends Omit<ComponentProps<typeof Button>, 'loading'> {
  loading: boolean
  loadingIcon?: () => ReactNode
}

function ButtonLoading({ variant, size, className, loading, asChild = false, ref, ...rest }: ButtonLoadingProps) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({
        variant,
        size,
      }), 'gap-x-2 select-none', className)}
      disabled={loading}
      ref={ref}
      {...rest}
    >
      {asChild ? (
        rest.children
      ) : (
        <>
          {loading && !rest.loadingIcon ? <IconSpinner className="animate-spin" /> : null}
          {rest.children}
        </>
      )}
    </Comp>
  );
}

export { ButtonLoading };
