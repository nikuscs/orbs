import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type * as React from 'react';

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
  showRequired?: boolean
  disabled?: boolean
}

function Label({ className, required, showRequired, disabled, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'inline-flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      data-slot="label"
      {...props}
    >
      <span className="contents">{children}</span>
      {required && showRequired !== false ? <span className="text-xs text-destructive/40">*</span> : null}
    </LabelPrimitive.Root>
  );
}

function LabelDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

export { Label, LabelDescription };
