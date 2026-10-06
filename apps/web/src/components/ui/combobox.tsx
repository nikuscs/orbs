import { useState } from 'react';
import { cn } from '@/lib/cn';
import IconCheck from '~icons/lucide/check';
import IconChevronDown from '~icons/lucide/chevron-down';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import type { ReactNode } from 'react';

export interface ComboboxOption {
  value: string
  label: string
  icon?: ReactNode
}

export interface ComboboxGroup {
  label?: string
  options: ComboboxOption[]
}

interface ComboboxProps {
  value: string
  groups: ComboboxGroup[]
  onValueChange: (value: string) => void
  placeholder: string
  'aria-label': string
  search?: { placeholder: string; empty: string }
  disabled?: boolean
  className?: string
}

export function Combobox({ value, groups, onValueChange, placeholder, search, disabled, className, ...props }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = groups.flatMap((group) => group.options).find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          aria-label={props['aria-label']}
          className={cn(
            'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm whitespace-nowrap shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
            '[&_svg]:pointer-events-none [&_svg]:shrink-0',
            className,
          )}
          disabled={disabled}
          type="button"
        >
          <span className={cn('flex min-w-0 items-center gap-2', !selected && 'text-muted-foreground')}>
            {selected?.icon}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <IconChevronDown className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" arrow={false} className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command>
          {search ? <CommandInput placeholder={search.placeholder} /> : null}
          <CommandList>
            {search ? <CommandEmpty>{search.empty}</CommandEmpty> : null}
            {groups.map((group) => (
              <CommandGroup heading={group.label} key={group.label ?? ''}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    keywords={[option.label, group.label ?? '']}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <IconCheck className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
