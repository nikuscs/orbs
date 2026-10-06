import { cva } from 'cva';
import { EmojiPicker as EmojiPickerPrimitive } from 'frimousse';
import { cn } from '@/lib/cn';
import IconSearch from '~icons/lucide/search';
import type { EmojiPickerListCategoryHeaderProps, EmojiPickerListEmojiProps, EmojiPickerListRowProps } from 'frimousse';
import type { ComponentProps, ReactNode } from 'react';

const emojiPickerVariants = cva({ base: 'isolate flex h-full w-fit flex-col overflow-hidden rounded-md bg-popover text-popover-foreground' });
const emojiPickerSearchVariants = cva({ base: 'flex h-11 items-center gap-2 border-b px-3' });

const emojiPickerInputVariants = cva({
  base: 'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
});

const emojiPickerRowVariants = cva({ base: 'scroll-my-1 px-2' });
const emojiPickerEmojiVariants = cva({ base: 'flex-center size-9 rounded-md text-2xl data-active:bg-accent' });
const emojiPickerCategoryVariants = cva({ base: 'bg-popover px-3 pt-3.5 pb-2 text-xs leading-none text-muted-foreground' });
const emojiPickerViewportVariants = cva({ base: 'relative flex-1 outline-hidden' });
const emojiPickerLoadingVariants = cva({ base: 'absolute inset-0 flex flex-col' });
const emojiPickerEmptyVariants = cva({ base: 'absolute inset-0 flex-center text-sm text-muted-foreground' });
const emojiPickerListVariants = cva({ base: 'pb-1 select-none' });

function EmojiPicker({ className, ...props }: ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return <EmojiPickerPrimitive.Root className={cn(emojiPickerVariants(), className)} data-slot="emoji-picker" {...props} />;
}

function EmojiPickerSearch({ className, ...props }: ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className={cn(emojiPickerSearchVariants(), className)} data-slot="emoji-picker-search-wrapper">
      <IconSearch className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search className={emojiPickerInputVariants()} data-slot="emoji-picker-search" {...props} />
    </div>
  );
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className={emojiPickerRowVariants()} data-slot="emoji-picker-row">
      {children}
    </div>
  );
}

function EmojiPickerEmoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button type="button" {...props} className={cn(emojiPickerEmojiVariants(), className)} data-slot="emoji-picker-emoji">
      {emoji.emoji}
    </button>
  );
}

function EmojiPickerCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div {...props} className={emojiPickerCategoryVariants()} data-slot="emoji-picker-category-header">
      {category.label}
    </div>
  );
}

/** The scrolling grid; `loading` and `empty` are the caller's, so every word on screen comes from its locale. */
function EmojiPickerContent({
  className,
  loading,
  empty,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Viewport> & { loading: ReactNode; empty: ReactNode }) {
  return (
    <EmojiPickerPrimitive.Viewport className={cn(emojiPickerViewportVariants(), className)} data-slot="emoji-picker-viewport" {...props}>
      <EmojiPickerPrimitive.Loading className={emojiPickerLoadingVariants()} data-slot="emoji-picker-loading">
        {loading}
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty className={emojiPickerEmptyVariants()} data-slot="emoji-picker-empty">
        {empty}
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className={emojiPickerListVariants()}
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
        data-slot="emoji-picker-list"
      />
    </EmojiPickerPrimitive.Viewport>
  );
}

export { EmojiPicker, EmojiPickerSearch, EmojiPickerContent };
