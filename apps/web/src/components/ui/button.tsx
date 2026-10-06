import { cva } from 'cva';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/lib/cn';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

const buttonGlossyEffects = [
  // Top highlight
  'before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit]',
  'before:bg-linear-to-b before:from-white/12 before:to-transparent before:p-px',
  'before:mask-exclude before:[mask-clip:content-box,border-box]',
  'before:mask-[linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)]',
  // Glossy overlay
  'after:absolute after:inset-0 after:rounded-[inherit]',
  'after:bg-linear-to-b after:from-white after:to-transparent',
  'after:pointer-events-none after:opacity-[.16]',
  'after:transition after:duration-200 after:ease-out',
  'hover:after:opacity-[.24]',
];

const buttonVariants = cva({
  base: [
    'relative inline-flex items-center justify-center gap-2',
    'rounded-md whitespace-nowrap',
    'text-sm font-medium',
    'cursor-pointer',
    'transition-all duration-150',
    'outline-none focus-visible:outline-none',
    'focus:ring-0! focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  variants: {
    variant: {
      default: ['bg-primary text-primary-foreground hover:bg-primary/90', 'focus-visible:ring-ring'],
      primary: [
        ...buttonGlossyEffects,
        'text-primary-foreground',
        'bg-primary hover:bg-primary/90',
        'shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--color-primary)]',
        'focus:ring-primary focus-visible:ring-primary',
        'active:scale-[0.99] active:transition-none',
      ],
      secondary: [
        'text-secondary-foreground',
        'bg-secondary hover:bg-secondary/90',
        'focus:ring-secondary focus-visible:ring-secondary',
        'active:scale-[0.99] active:transition-none',
      ],
      filled: [
        'text-foreground',
        'border border-input hover:bg-accent hover:text-accent-foreground dark:border-input/70',
        'focus:ring-ring focus-visible:ring-ring',
        'bg-card dark:bg-input/30',
        'active:scale-[0.99] active:transition-none',
      ],
      'filled-accent': [
        'text-primary',
        'border border-input hover:bg-accent hover:text-accent-foreground dark:border-input/70',
        'focus:ring-ring focus-visible:ring-ring',
        'bg-card',
        'active:scale-[0.99] active:transition-none',
      ],
      accent: [
        'text-accent-foreground',
        'bg-accent hover:bg-accent/90',
        'focus:ring-accent focus-visible:ring-accent',
        'active:scale-[0.99] active:transition-none',
      ],
      red: [
        ...buttonGlossyEffects,
        'text-destructive-foreground',
        'bg-destructive hover:bg-destructive/90',
        'shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--color-destructive)]',
        'focus:ring-destructive focus-visible:ring-destructive',
        'active:scale-[0.99] active:transition-none',
      ],
      green: [
        ...buttonGlossyEffects,
        'text-success-foreground',
        'bg-success hover:bg-success/90',
        'shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--color-success)]',
        'focus:ring-success focus-visible:ring-success',
        'active:scale-[0.99] active:transition-none',
      ],
      yellow: [
        ...buttonGlossyEffects,
        'text-amber-800',
        'bg-warning hover:bg-warning/90',
        'shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--color-warning)]',
        'focus:ring-warning focus-visible:ring-warning',
        'active:scale-[0.99] active:transition-none',
      ],
      blue: [
        ...buttonGlossyEffects,
        'text-white',
        'bg-primary hover:bg-primary/90',
        'shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--color-primary)]',
        'focus:ring-primary focus-visible:ring-primary',
        'active:scale-[0.99] active:transition-none',
      ],
      outline: [
        'text-foreground',
        'border border-input hover:bg-accent hover:text-accent-foreground',
        'focus:ring-input focus-visible:ring-input',
        'active:scale-[0.99] active:transition-none',
      ],
      'outline-primary': [
        'text-primary',
        'border border-primary hover:bg-primary/5',
        'focus:ring-primary focus-visible:ring-primary',
        'active:scale-[0.99] active:transition-none',
      ],
      'outline-green': [
        'text-success',
        'border border-success hover:bg-success/5',
        'focus:ring-success focus-visible:ring-success',
        'active:scale-[0.99] active:transition-none',
      ],
      'outline-yellow': [
        'text-warning',
        'border border-warning hover:bg-warning/5',
        'focus:ring-warning focus-visible:ring-warning',
        'active:scale-[0.99] active:transition-none',
      ],
      'outline-red': [
        'text-destructive',
        'border border-destructive hover:bg-destructive/5',
        'focus:ring-destructive focus-visible:ring-destructive',
        'active:scale-[0.99] active:transition-none',
      ],
      transparent: ['hover:text-accent-foreground', 'hover:bg-transparent', 'focus:ring-input focus-visible:ring-input'],
      ghost: [
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-primary',
        'active:scale-[0.99] active:transition-none',
      ],
      quiet: [
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-primary',
        'active:scale-[0.99] active:transition-none',
      ],
      link: ['text-primary', 'underline-offset-4 hover:underline', 'focus:ring-0 focus:ring-input focus-visible:ring-2'],
      'link-muted': ['text-muted-foreground', 'underline-offset-4 hover:underline', 'focus:ring-0 focus:ring-input focus-visible:ring-2'],
      'link-destructive': ['text-destructive', 'underline-offset-4 hover:underline', 'focus:ring-0 focus:ring-input focus-visible:ring-2 focus-visible:ring-destructive'],
      select: [
        'w-full justify-between',
        'px-3 py-2 focus:ring-2',
        'ring-inset',
        'ring-1 ring-input hover:bg-accent hover:text-accent-foreground',
        'data-[invalid=true]:text-destructive data-[invalid=true]:placeholder-destructive/80 data-[invalid=true]:ring-destructive',
        'data-[invalid=true]:focus:ring-destructive data-[invalid=true]:focus-visible:ring-destructive',
        'data-[invalid=true]:hover:bg-destructive/5 data-[invalid=true]:hover:text-destructive',
      ],
    },
    size: {
      default: 'h-10 px-4 py-2',
      xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      xl: 'h-12 px-10',
      xxl: 'h-14 px-12',
      icon: 'size-10 rounded-full',
      'icon-xs': "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
      'icon-sm': 'size-8 rounded-full',
    },
  },
  compoundVariants: [
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'default', class: 'h-9.5' },
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'sm', class: 'h-8.5' },
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'lg', class: 'h-10.5' },
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'xl', class: 'h-11.5' },
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'xxl', class: 'h-13.5' },
    { variant: ['primary', 'red', 'green', 'yellow', 'blue'], size: 'icon', class: 'size-9.5' },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
});

function Button({
  variant,
  size,
  className,
  asChild = false,
  type = 'button',
  ref,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({
        variant,
        size,
      }), className)}
      data-slot="button"
      ref={ref}
      type={type}
      {...props}
    />
  );
}

export { Button, buttonVariants };
