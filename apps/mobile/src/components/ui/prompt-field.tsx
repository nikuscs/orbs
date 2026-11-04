import { Text as NativeText, View } from 'react-native';
import { cn } from '@/lib/cn';
import { GlassSurface } from './glass-surface';
import { Text } from './text';
import { TextField } from './text-field';
import type { ReactNode, Ref } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';

// Pads one 22pt line to the 32pt action button, so a single line stays centered while longer text grows upward.
const PROMPT_FIELD_LINE_PADDING = 5;

interface PromptFieldProps extends TextInputProps {
  /**
   * A 32pt action at the start of the field, such as attach. It floats above the glass instead of inside it:
   * an iOS 26 menu grows out of the glass around its button and hides it, which would hide the whole field.
   */
  leading?: ReactNode;
  /** Actions at the end of the field, such as send or stop. */
  actions?: ReactNode;
  /** Content inside the field above the text, such as attachments. */
  header?: ReactNode;
  /** Shows the placeholder, which stays on one line: iOS wraps a multiline input's own placeholder. */
  isEmpty: boolean;
  ref?: Ref<TextInputInstance>;
}

/** The chat composer's growing glass input. */
export function PromptField({ leading, actions, header, isEmpty, placeholder, className, ...props }: PromptFieldProps) {
  const field = (
    <GlassSurface className={cn('min-h-12 gap-1 py-2 pr-2', leading ? 'pl-2' : 'pl-4', className)} radius="field">
      {header ? <View className="pt-1">{header}</View> : null}
      <View className="flex-row items-end gap-2">
        {leading ? <View className="size-8" /> : null}
        <View className="flex-1">
          {isEmpty ? (
            <Text
              className="absolute inset-x-0"
              numberOfLines={1}
              pointerEvents="none"
              style={{ top: PROMPT_FIELD_LINE_PADDING }}
              tone="glass-muted"
            >
              {placeholder}
            </Text>
          ) : null}
          <TextField
            multiline
            className="max-h-36"
            style={{ paddingVertical: PROMPT_FIELD_LINE_PADDING }}
            {...props}
          />
        </View>
        <View className="flex-row items-center gap-1">{actions}</View>
      </View>
    </GlassSurface>
  );

  return leading ? (
    <View>
      {field}
      <View className="absolute bottom-2 left-2">{leading}</View>
    </View>
  ) : field;
}

/** A picked mention inside the field's text, tinted like a link. */
export function PromptMention({ children }: { children: string }) {
  return <NativeText className="text-blue">{children}</NativeText>;
}
