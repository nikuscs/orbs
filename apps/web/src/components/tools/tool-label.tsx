import { ToolTrigger } from '@/components/ui/ai/tool';
import { toolIdentity, toolPresentation, toolPreview } from '@/services/tool/tool.client';
import IconLucideBot from '~icons/lucide/bot';
import IconLucideCpu from '~icons/lucide/cpu';
import IconLucideFileText from '~icons/lucide/file-text';
import IconLucideFolder from '~icons/lucide/folder';
import IconLucideGlobe from '~icons/lucide/globe';
import IconLucideHash from '~icons/lucide/hash';
import IconLucideListTodo from '~icons/lucide/list-todo';
import IconLucideMessageCircleQuestion from '~icons/lucide/message-circle-question';
import IconLucidePlug from '~icons/lucide/plug';
import IconLucideSearch from '~icons/lucide/search';
import IconLucideSquarePen from '~icons/lucide/square-pen';
import IconLucideTerminal from '~icons/lucide/terminal';
import IconLucideWrench from '~icons/lucide/wrench';
import type { ToolIconKind, ToolPart } from '@/types/tool.types';
import type { ReactNode } from 'react';

const toolLabelIcons = {
  terminal: <IconLucideTerminal />,
  file: <IconLucideFileText />,
  edit: <IconLucideSquarePen />,
  search: <IconLucideSearch />,
  folder: <IconLucideFolder />,
  web: <IconLucideGlobe />,
  bot: <IconLucideBot />,
  room: <IconLucideHash />,
  model: <IconLucideCpu />,
  todo: <IconLucideListTodo />,
  question: <IconLucideMessageCircleQuestion />,
  mcp: <IconLucidePlug />,
  tool: <IconLucideWrench />,
} satisfies Record<ToolIconKind, ReactNode>;

export function ToolLabel({ part, avatar }: { part: ToolPart; avatar?: ReactNode }) {
  const presentation = toolPresentation(part);

  return (
    <ToolTrigger
      avatar={avatar}
      icon={toolLabelIcons[presentation.icon]}
      name={presentation.label}
      preview={toolPreview(part)}
      state={part.state}
      title={toolIdentity(part).identifier}
    />
  );
}
