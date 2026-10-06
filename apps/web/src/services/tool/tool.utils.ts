import { roomToolInput, roomToolText } from '@orbs/server/client';
import type * as ToolTypes from '@/types/tool.types';

export function toolInputTexts(part: ToolTypes.ToolPart): ToolTypes.ToolInputText[] {
  const input = roomToolInput.safeParse(part.input);

  return Object.entries(input.success ? input.data : {}).flatMap(([key, value]) => {
    const text = roomToolText.trim().min(1).safeParse(value);

    return text.success ? [{ key, value: text.data }] : [];
  });
}
