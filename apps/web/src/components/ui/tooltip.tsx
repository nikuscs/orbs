import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import IconInfo from '~icons/lucide/info';
import type { ComponentProps, ReactNode } from 'react';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  arrow = true,
  className,
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content> & { arrow?: boolean }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          'animate-in bg-foreground text-background fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          'z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className,
        )}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        {arrow ? <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" /> : null}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

function TooltipHelper({
  children,
  icon,
  leading,
  ...props
}: ComponentProps<typeof TooltipContent> & {
  icon?: ReactNode
  leading?: ReactNode
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button aria-label="More info" className="flex-center shrink-0 cursor-pointer gap-1" type="button">
            {icon ?? (
              <>
                <IconInfo className="size-3 opacity-70 hover:opacity-90" />
                {leading ? <span>{leading}</span> : null}
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="w-64 text-xs" {...props}>
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipHelper };
