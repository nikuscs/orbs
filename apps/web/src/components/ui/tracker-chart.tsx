import { cx } from 'cva';
import { HoverCard as HoverCardPrimitives } from 'radix-ui';
import { useState } from 'react';
import { HoverCardStyle } from './hover-card';
import type { HTMLAttributes } from 'react';

export interface TrackerBlockProps {
  key?: string | number
  color?: string
  tooltip?: string
  hoverEffect?: boolean
  defaultBackgroundColor?: string
}

function Block({ color, tooltip, defaultBackgroundColor, hoverEffect }: TrackerBlockProps) {
  const [open, setOpen] = useState(false);

  if (!tooltip) {
    return (
      <div className="size-full overflow-hidden px-[0.5px] transition first:rounded-l-lg first:pl-0 last:rounded-r-lg last:pr-0 sm:px-px">
        <div className={cx('size-full rounded-[1px]', color ?? defaultBackgroundColor, hoverEffect ? 'hover:opacity-50' : '')} />
      </div>
    );
  }

  return (
    <HoverCardPrimitives.Root closeDelay={0} open={open} openDelay={0} onOpenChange={setOpen}>
      <HoverCardPrimitives.Trigger asChild onClick={() => setOpen(true)}>
        <div className="size-full overflow-hidden px-[0.5px] transition first:rounded-l-lg first:pl-0 last:rounded-r-lg last:pr-0 sm:px-px">
          <div className={cx('size-full rounded-[1px]', color ?? defaultBackgroundColor, hoverEffect ? 'hover:opacity-50' : '')} />
        </div>
      </HoverCardPrimitives.Trigger>
      <HoverCardPrimitives.Portal>
        <HoverCardPrimitives.Content
          avoidCollisions
          align="center"
          className={cx(
            HoverCardStyle,
            'w-auto rounded-md px-2 py-1 text-sm shadow-md',
            // background color
            'bg-popover',
          )}
          side="top"
          sideOffset={10}
        >
          {tooltip}
        </HoverCardPrimitives.Content>
      </HoverCardPrimitives.Portal>
    </HoverCardPrimitives.Root>
  );
}

export interface TrackerChartProps extends HTMLAttributes<HTMLDivElement> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
  hoverEffect?: boolean
}

export function TrackerChart({
  data,
  defaultBackgroundColor = 'bg-gray-400 dark:bg-gray-400',
  className,
  hoverEffect,
  ref,
  ...props
}: TrackerChartProps & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div className={cx('group flex h-8 w-full items-center', className)} ref={ref} {...props}>
      {data.map(({ key, ...rest }, index) => (
        <Block defaultBackgroundColor={defaultBackgroundColor} hoverEffect={hoverEffect} key={key ?? index} {...rest} />
      ))}
    </div>
  );
}
