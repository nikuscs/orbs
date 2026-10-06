import { useId } from 'react';
import { cn } from '@/lib/cn';
import type * as React from 'react';

function Input({ className, type, id, ...props }: React.ComponentProps<'input'>) {
  const autoId = useId();

  return (
    <input
      className={cn(
        // Base
        'flex h-10 w-full min-w-0 px-3 py-2 [[type=color]]:p-1',
        'rounded-md border border-input',
        'bg-transparent dark:bg-input/30',
        'text-base md:text-sm',
        'shadow-xs',
        'outline-none',
        'transition-[color,box-shadow]',

        // Placeholder
        'placeholder:text-sm placeholder:text-muted-foreground',

        // Selection
        'selection:bg-primary selection:text-primary-foreground',

        // Focus
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50',
        'focus-visible:ring-[3px]',

        // Disabled
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',

        // Invalid (data attribute)
        'data-[invalid=true]:border-destructive/80',
        'data-[invalid=true]:ring-destructive/20',
        'data-[invalid=true]:text-destructive',
        'data-[invalid=true]:placeholder:text-destructive/80',

        // Invalid (aria)
        'aria-invalid:border-destructive/80',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        'aria-invalid:text-destructive',
        'aria-invalid:placeholder:text-destructive/80',

        // File input
        'file:inline-flex file:h-7',
        'file:border-0 file:bg-transparent',
        'file:text-sm file:font-medium',
        'file:text-foreground',

        className,
      )}
      data-slot="input"
      id={id ?? autoId}
      type={type}
      {...props}
    />
  );
}

export { Input };
