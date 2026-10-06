import { m } from '@orbs/i18n/client';
import { useState } from 'react';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { RoomsChatApproval } from '@/components/rooms/rooms-chat-approval';
import { ToolLabel } from '@/components/tools/tool-label';
import { Tool, ToolCode, ToolContent, ToolGroup, ToolGroupItem, ToolGroupToggle } from '@/components/ui/ai/tool';
import { toolCollapsed, toolGroupState, toolIdentity, toolInputText, toolOutputText, toolRunning } from '@/services/tool/tool.client';
import type { ToolBot, ToolPart } from '@/types/tool.types';

function RoomsChatTool({ part, bot }: { part: ToolPart; bot: ToolBot }) {
  const [open, setOpen] = useState(false);
  const output = toolOutputText(part);
  const approval = part.state === 'approval-requested' ? part.approval : undefined;

  return (
    <Tool open={open || Boolean(approval)} onOpenChange={setOpen}>
      <ToolLabel
        avatar={(
          <BotAvatar
            animate={toolRunning(part)}
            bot={bot}
            size={14}
          />
        )}
        part={part}
      />
      <ToolContent>
        <ToolCode>{toolIdentity(part).identifier}</ToolCode>
        <ToolCode>{toolInputText(part)}</ToolCode>
        {output ? <ToolCode variant={part.state === 'output-error' ? 'destructive' : 'default'}>{output}</ToolCode> : null}
        {approval ? <RoomsChatApproval approvalId={approval.id} /> : null}
      </ToolContent>
    </Tool>
  );
}

export function RoomsChatTools({ parts, bot, live, className }: { parts: ToolPart[]; bot: ToolBot; live: boolean; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const grouped = parts.length > 1;

  return (
    <ToolGroup className={className}>
      {grouped ? (
        <ToolGroupItem enter={live}>
          <ToolGroupToggle
            avatar={(
              <BotAvatar
                animate={parts.some(toolRunning)}
                bot={bot}
                size={14}
              />
            )}
            open={expanded}
            state={toolGroupState({ parts })}
            onClick={() => setExpanded(!expanded)}
          >
            {m.rooms_chat_tools_count({ count: parts.length })}
          </ToolGroupToggle>
        </ToolGroupItem>
      ) : null}
      {parts.map((part) => (
        <ToolGroupItem
          collapsed={toolCollapsed({
            part,
            grouped,
            expanded,
          })}
          enter={live}
          key={part.toolCallId}
        >
          <RoomsChatTool bot={bot} part={part} />
        </ToolGroupItem>
      ))}
    </ToolGroup>
  );
}
