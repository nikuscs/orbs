import { cva } from 'cva';
import { use } from 'react';
import { TextInput } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '@/lib/cn';
import { textBaseVariants, textContext } from './text';
import type { VariantProps } from 'cva';
import type { Ref } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';

const textFieldVariants = cva({
  composes: textBaseVariants,
  variants: { size: { default: 'text-body', lg: 'text-title' } },
  defaultVariants: { size: 'default' },
});

// iOS draws a one-line TextInput's text below center when the font sets a line height.
const TEXT_FIELD_SINGLE_LINE = { lineHeight: undefined } as const;

interface TextFieldProps extends TextInputProps, VariantProps<typeof textFieldVariants> {
  placeholderTone?: 'muted-foreground' | 'glass-muted' | 'destructive';
  ref?: Ref<TextInputInstance>;
}

export function TextField({ className, size, tone, placeholderTone = 'muted-foreground', style, ...props }: TextFieldProps) {
  const inherited = use(textContext);
  // Resolved directly: Uniwind's placeholder and selection classes do not reach the native input.
  const [placeholderColor, selectionColor] = useCSSVariable([`--color-${placeholderTone}`, '--color-primary']).map(String);
  return (
    <TextInput
      placeholderTextColor={placeholderColor}
      selectionColor={selectionColor}
      {...props}
      className={cn(textFieldVariants({ size, tone: tone ?? inherited.tone }), className)}
      style={[{ paddingVertical: 0, textAlignVertical: 'center' }, props.multiline ? undefined : TEXT_FIELD_SINGLE_LINE, style]}
    />
  );
}
