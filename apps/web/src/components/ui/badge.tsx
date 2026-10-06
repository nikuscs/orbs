import { cva } from 'cva';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type { VariantProps } from 'cva';
import type { HTMLAttributes } from 'react';

const badgeVariants = cva({
  base: [
    'inline-flex w-fit items-center justify-center font-medium transition-[color,box-shadow]',
    'border',
    'cursor-pointer overflow-hidden',
    'shrink-0 gap-1 truncate text-xs leading-none [&>svg]:pointer-events-none [&>svg]:size-3',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
  ],
  variants: {
    variant: {
      primary: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
      secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
      outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      'outline-secondary': 'border-input bg-muted text-muted-foreground',
      destructive: [
        'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90',
        'focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
      ],
      success: ['border-transparent bg-success-50 text-green-700', 'dark:bg-success-500/10 dark:text-success-400'],
      warning: ['border-transparent bg-warning-50 text-warning-800', 'dark:bg-warning-400/10 dark:text-warning-500'],
      blue: ['border-transparent bg-blue-50 text-blue-700', 'dark:bg-blue-400/10 dark:text-blue-500'],
      purple: ['border-transparent bg-purple-50 text-purple-700', 'dark:bg-purple-400/10 dark:text-purple-500'],
      muted: 'border-transparent text-foreground/80 opacity-60',
      soft: 'border-transparent text-foreground/70 dark:text-foreground/50',
    },
    padding: {
      none: '',
      primary: 'px-2 py-0.5',
      secondary: 'px-2.5 py-0.5',
      relaxed: 'px-2 py-0.5',
    },
    rounded: {
      full: 'rounded-full',
      lg: 'rounded-lg',
    },
    ring: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    padding: 'relaxed',
    rounded: 'full',
    ring: true,
  },
});

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  className?: string
  asChild?: boolean
  as?: string
}

function Badge({ className, variant, asChild, as = 'div', ref, ...props }: BadgeProps & { ref?: React.Ref<HTMLDivElement> }) {
  const Comp = asChild ? SlotPrimitive.Slot : as;
  return <Comp className={cn(badgeVariants({ variant }), className)} data-slot="badge" ref={ref} {...props} />;
}

const badgeFancyVariants = cva({
  base: 'inline-flex w-fit cursor-pointer items-center rounded-sm font-semibold tracking-[0.01em] uppercase transition-colors [&_svg]:shrink-0',
  variants: {
    variant: {
      primary: [
        'bg-[rgb(254,236,228)] text-[rgb(240,80,35)]',
        'shadow-[0px_0px_0px_1px_rgba(240,80,35,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(71,38,27)] dark:text-[rgb(253,186,116)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(240,80,35,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      destructive: [
        'bg-[rgb(254,226,226)] text-[rgb(220,38,38)]',
        'shadow-[0px_0px_0px_1px_rgba(220,38,38,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(69,26,26)] dark:text-[rgb(252,165,165)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(220,38,38,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      success: [
        'bg-[rgb(220,252,231)] text-[rgb(22,163,74)]',
        'shadow-[0px_0px_0px_1px_rgba(22,163,74,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(22,59,38)] dark:text-[rgb(134,239,172)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(22,163,74,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      warning: [
        'bg-[rgb(254,249,195)] text-[rgb(202,138,4)]',
        'shadow-[0px_0px_0px_1px_rgba(202,138,4,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(66,52,19)] dark:text-[rgb(253,224,71)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(202,138,4,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      secondary: [
        'bg-[rgb(228,228,231)] text-[rgb(113,113,122)]',
        'shadow-[0px_0px_0px_1px_rgba(113,113,122,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(49,49,54)] dark:text-[rgb(212,212,216)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(113,113,122,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      soft: [
        'border border-input/60 bg-muted/40 text-muted-foreground',
        'shadow-[inset_0px_-0.5px_0.5px_rgba(255,255,255,0.24)]',
        'dark:border-input/30 dark:bg-muted/20 dark:shadow-[inset_0px_-0.5px_0.5px_rgba(255,255,255,0.08)]',
      ],
      blue: [
        'bg-[rgb(219,234,254)] text-[rgb(29,78,216)]',
        'shadow-[0px_0px_0px_1px_rgba(29,78,216,0.24),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.64)]',
        'dark:bg-[rgb(23,37,84)] dark:text-[rgb(147,197,253)]',
        'dark:shadow-[0px_0px_0px_1px_rgba(29,78,216,0.5),inset_0px_-0.5px_0.5px_rgba(255,255,255,0.16)]',
      ],
      'glossy-primary': [
        'bg-linear-to-b from-primary to-primary/85 text-white',
        'shadow-[inset_0px_1px_2px_rgba(255,255,255,0.35),inset_0px_-1px_2px_rgba(0,0,0,0.2),0px_2px_6px_rgba(0,0,0,0.15)]',
      ],
      'glossy-destructive': [
        'bg-linear-to-b from-destructive to-destructive/85 text-white',
        'shadow-[inset_0px_1px_2px_rgba(255,255,255,0.35),inset_0px_-1px_2px_rgba(0,0,0,0.2),0px_2px_6px_rgba(0,0,0,0.15)]',
      ],
      'glossy-success': [
        'bg-linear-to-b from-success to-success/85 text-white',
        'shadow-[inset_0px_1px_2px_rgba(255,255,255,0.35),inset_0px_-1px_2px_rgba(0,0,0,0.2),0px_2px_6px_rgba(0,0,0,0.15)]',
      ],
      'glossy-warning': [
        'bg-linear-to-b from-warning to-warning/85 text-white',
        'shadow-[inset_0px_1px_2px_rgba(255,255,255,0.35),inset_0px_-1px_2px_rgba(0,0,0,0.2),0px_2px_6px_rgba(0,0,0,0.15)]',
      ],
      'glossy-secondary': [
        'bg-linear-to-b from-zinc-500 to-zinc-600 text-white',
        'shadow-[inset_0px_1px_2px_rgba(255,255,255,0.35),inset_0px_-1px_2px_rgba(0,0,0,0.2),0px_2px_6px_rgba(0,0,0,0.15)]',
      ],
      'glossy-outline': [
        'border border-input/50 bg-linear-to-b from-white/80 to-white/40 text-foreground/80',
        'shadow-[inset_0px_1px_1px_rgba(255,255,255,0.5),0px_1px_3px_rgba(0,0,0,0.06)]',
        'dark:border-input/30 dark:from-white/10 dark:to-white/5 dark:text-foreground/70',
        'dark:shadow-[inset_0px_1px_1px_rgba(255,255,255,0.08),0px_1px_3px_rgba(0,0,0,0.2)]',
      ],
      outline: [
        'border border-input/70 bg-transparent text-foreground',
        'shadow-[inset_0px_-0.5px_0.5px_rgba(255,255,255,0.24)]',
        'dark:shadow-[inset_0px_-0.5px_0.5px_rgba(255,255,255,0.08)]',
      ],
    },
    size: {
      default: 'gap-1 px-1.5 py-1 text-[11px]/[12px] [&_svg]:size-3',
      compact: 'gap-0.5 px-1.25 py-0.5 text-[9px]/[10px] [&_svg]:size-2.5',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'compact',
  },
});

function BadgeFancy({ className, variant, size, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeFancyVariants>) {
  return <span className={cn(badgeFancyVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants, BadgeFancy, badgeFancyVariants };
