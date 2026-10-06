import { cva } from 'cva';
import { cn } from '@/lib/cn';
import { Button } from './button';
import type { VariantProps } from 'cva';
import type { ComponentProps } from 'react';

function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30',
        'h-9 min-w-0 has-[>textarea]:h-auto',
        'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col',
        'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col',
        'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
        className,
      )}
      data-slot="input-group"
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva({
  base: "flex h-auto items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-4",
  variants: {
    align: {
      'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem]',
      'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem]',
      'block-start': 'order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3',
      'block-end': 'order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3',
    },
  },
  defaultVariants: { align: 'inline-start' },
});

function InputGroupAddon({ className, align = 'inline-start', ...props }: ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="input-group-addon"
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva({
  base: 'flex items-center gap-2 text-sm shadow-none',
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
      sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
      'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
    },
  },
  defaultVariants: { size: 'xs' },
});

function InputGroupButton({ className, type = 'button', variant = 'ghost', size = 'xs', ...props }: Omit<ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>) {
  return <Button className={cn(inputGroupButtonVariants({ size }), className)} data-size={size} type={type} variant={variant} {...props} />;
}

export { InputGroup, InputGroupAddon, InputGroupButton };
