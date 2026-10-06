import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type { ComponentProps } from 'react';

function HoverCard({ ...props }: ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

export const HoverCardStyle = 'z-50 w-64 rounded-xl border bg-popover p-4 text-popover-foreground shadow-sm outline-none';

export const HoverCardStyleEffects =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ref,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.Content> & { ref?: React.Ref<React.ComponentRef<typeof HoverCardPrimitive.Content>> }) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        align={align}
        className={cn(HoverCardStyle, HoverCardStyleEffects, className)}
        data-slot="hover-card-content"
        ref={ref}
        sideOffset={sideOffset}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
