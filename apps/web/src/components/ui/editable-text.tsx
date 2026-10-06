import { cva } from 'cva';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { FocusEvent, KeyboardEvent } from 'react';

const editableTextVariants = cva({
  variants: {
    multiline: {
      true: '',
      false: 'font-medium',
    },
  },
});

interface EditableTextProps {
  value: string
  onSave: (next: string) => Promise<void>
  maxLength: number
  'aria-label': string
  multiline?: boolean
  required?: boolean
  placeholder?: string
  startEditing?: boolean
  onEditEnd?: () => void
  className?: string
}

/**
 * Text that edits in place: always a field, styled to read as plain text, so clicking it only shows a caret and
 * nothing jumps. Enter (Shift+Enter adds a line when multiline) or leaving saves a changed value; Escape reverts.
 */
export function EditableText({
  value,
  onSave,
  maxLength,
  multiline = false,
  required = false,
  placeholder,
  startEditing = false,
  onEditEnd,
  className,
  ...props
}: EditableTextProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const reverting = useRef(false);
  const shown = draft ?? value;

  // Opened for editing (Rename): focused with the text selected once, on mount; later clicks just place the caret.
  const startRef = (field: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!startEditing || !field) {
      return;
    }

    field.focus();
    field.select();
  };

  const commit = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.currentTarget.value.trim();

    // Escape already restored the value; its blur must not save the abandoned draft.
    if (reverting.current || next === value || (required && !next)) {
      reverting.current = false;
      setDraft(null);
      onEditEnd?.();

      return;
    }

    setDraft(next);
    void onSave(next).finally(() => {
      setDraft(null);
      onEditEnd?.();
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      reverting.current = true;
      event.currentTarget.blur();
    } else if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const fieldProps = {
    'aria-label': props['aria-label'],
    className: cn(
      '-mx-2 -my-1 field-sizing-content max-w-[calc(100%+1rem)] min-w-0 resize-none rounded-md bg-transparent px-2 py-1 [text-align:inherit] text-sm outline-none',
      'placeholder:text-muted-foreground/60 hover:bg-sidebar-accent',
      editableTextVariants({ multiline }),
      className,
    ),
    maxLength,
    placeholder,
    spellCheck: multiline,
    value: shown,
    onBlur: commit,
    onKeyDown,
  };

  return multiline ? (
    <textarea {...fieldProps} ref={startRef} rows={1} onChange={(event) => setDraft(event.target.value)} />
  ) : (
    <input {...fieldProps} ref={startRef} onChange={(event) => setDraft(event.target.value)} />
  );
}
