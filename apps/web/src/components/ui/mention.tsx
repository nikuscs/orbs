import { cva } from 'cva';
import { cn } from '@/lib/cn';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

const mentionVariants = cva({
  // The negative margin keeps the pill inside the line it sits in, so a pill never makes its line taller. shadcn's
  // outline badge, keeping the surrounding text colour: `text-foreground` is unreadable inside a user's bubble.
  base: '-my-1 inline-flex max-w-full items-center gap-1 rounded-full border py-px pr-2 pl-0.5 align-middle text-sm leading-4 font-medium whitespace-nowrap',
  variants: {
    variant: {
      outline: 'border-border',
      // The edge in the surrounding text colour, faint; inside a user's bubble it inverts the bubble instead.
      'outline-soft': 'border-current/25 group-data-[role=user]:border-transparent group-data-[role=user]:bg-primary-foreground group-data-[role=user]:text-primary',
      // The one kind with a colour of its own; the text keeps the surrounding colour, so it reads on any bubble.
      skill: 'border-skill/40 bg-skill/15 [&>svg]:text-skill/70',
      muted: 'border-current/25 px-2 text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'outline' },
});

/** An inline pill naming a thing a message points at: a bot, everyone, a room, or a skill. */
function Mention({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof mentionVariants>) {
  return <span className={cn(mentionVariants({ variant }), className)} data-slot="mention" {...props} />;
}

export { Mention };
