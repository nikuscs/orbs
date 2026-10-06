import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import { FloatingArrow } from './floating-arrow';
import type { ComponentProps } from 'react';

function Popover({ ...props }: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverArrow({ ...props }: ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  arrow = true,
  container,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content> & { arrow?: boolean; container?: HTMLElement }) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          'bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          'z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-xl border p-4 shadow-sm outline-hidden',
          className,
        )}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      >
        <div style={{ overflow: 'hidden' }}>{children}</div>
        {arrow ? (
          <PopoverArrow asChild style={{ display: 'block' }}>
            <FloatingArrow className="text-popover" />
          </PopoverArrow>
        ) : null}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverArrow };
