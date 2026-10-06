import { m } from '@orbs/i18n/client';
import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import { cva } from 'cva';
import { cn } from '@/lib/cn';
import IconLucideArrowDown from '~icons/lucide/arrow-down';
import { Button } from './button';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

function MessageScrollerProvider(props: ComponentProps<typeof MessageScrollerPrimitive.Provider>) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

function MessageScroller({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      className={cn('group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden', className)}
      data-slot="message-scroller"
      {...props}
    />
  );
}

const messageScrollerViewportVariants = cva({
  base: 'scrollbar-thin size-full min-h-0 min-w-0 scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-none data-pending-scroll:invisible',
  variants: {
    fade: {
      end: 'scroll-fade-b',
      // Both edges, for a transcript with something floating over its top (the chat's title pill).
      both: 'scroll-fade-y',
    },
  },
  defaultVariants: { fade: 'end' },
});

function MessageScrollerViewport({
  className,
  fade,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Viewport> & VariantProps<typeof messageScrollerViewportVariants>) {
  return <MessageScrollerPrimitive.Viewport className={cn(messageScrollerViewportVariants({ fade }), className)} data-slot="message-scroller-viewport" {...props} />;
}

function MessageScrollerContent({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return <MessageScrollerPrimitive.Content className={cn('flex h-max min-h-full flex-col gap-8', className)} data-slot="message-scroller-content" {...props} />;
}

// The registry row also sets `content-visibility: auto` with a 10rem placeholder height. Opening at the end then
// lands on guessed heights, and each row that renders at its real height moves the end again, so a room slid to its
// latest message in steps. A room loads at most 200 messages per page, so rows always render.
function MessageScrollerItem({ className, scrollAnchor = false, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      className={cn('min-w-0 shrink-0', className)}
      data-slot="message-scroller-item"
      scrollAnchor={scrollAnchor}
      {...props}
    />
  );
}

function MessageScrollerButton({
  direction = 'end',
  className,
  children,
  render,
  variant = 'outline',
  size = 'icon-sm',
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Button> & Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <MessageScrollerPrimitive.Button
      className={cn(
        // The composer's surface: its dark `bg-input/30` made solid, since this button floats over messages.
        'absolute inset-s-1/2 -translate-x-1/2 rounded-full bg-background shadow-sm transition-[translate,scale,opacity] duration-200 dark:bg-[color-mix(in_oklab,var(--input)_30%,var(--background))]',
        'data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)]',
        'data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)]',
        'data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180',
        className,
      )}
      data-direction={direction}
      data-size={size}
      data-slot="message-scroller-button"
      data-variant={variant}
      direction={direction}
      render={render ?? <Button size={size} variant={variant} />}
      {...props}
    >
      {children ?? (
        <>
          <IconLucideArrowDown />
          <span className="sr-only">{direction === 'end' ? m.ui_scroll_end() : m.ui_scroll_start()}</span>
        </>
      )}
    </MessageScrollerPrimitive.Button>
  );
}

export { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport };
