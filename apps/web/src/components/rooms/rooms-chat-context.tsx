import { useChatContextUsage } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { PromptInputButton } from '@repo/ui/ai/prompt-input';
import { Button } from '@repo/ui/button';
import { ButtonLoading } from '@repo/ui/button-loading';
import { cn } from '@repo/ui/cn';
import { Item, ItemActions, ItemContent, ItemLink, ItemTitle, ItemValue } from '@repo/ui/item';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@repo/ui/popover';
import { Progress } from '@repo/ui/progress';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import IconChevronRight from '~icons/lucide/chevron-right';
import IconFoldVertical from '~icons/lucide/fold-vertical';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconTriangleAlert from '~icons/lucide/triangle-alert';
import IconSpinner from '~icons/svg-spinners/90-ring-with-bg';
import type { ChatContextView, RoomsChat } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';
import type { ComponentProps } from 'react';

const ROOMS_CHAT_CONTEXT_TONES = {
  muted: 'text-muted-foreground',
  warning: 'text-warning/70',
  destructive: 'text-destructive',
} satisfies Record<ChatContextView['tone'], string>;

const ROOMS_CHAT_CONTEXT_HOVER_TONES = {
  muted: 'group-hover:text-foreground',
  warning: 'group-hover:text-warning/70',
  destructive: 'group-hover:text-destructive',
} satisfies Record<ChatContextView['tone'], string>;

interface RoomsChatContextProps {
  bot: Bot
  conversationId: number
  latestEntryId: number
  isBusy: boolean
  isCompacting: boolean
}

export function RoomsChatContext({ bot, conversationId, latestEntryId, isBusy, isCompacting }: RoomsChatContextProps) {
  const [isOpen, setIsOpen] = useState(false);

  const usage = useChatContextUsage({
    botId: bot.id,
    conversationId,
    revision: isBusy ? undefined : latestEntryId,
    onCompacted: (message) => toast.success(message),
  });

  const compacting = isCompacting || usage.isCompacting;

  if (!usage.context || !(usage.isCompactable || compacting)) {
    return null;
  }

  const { percent, used, label, tone } = usage.context;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton
          aria-label={label}
          className="group"
          size={percent === null ? 'sm' : 'icon-sm'}
          title={label}
        >
          <span className={cn('flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums transition-colors', ROOMS_CHAT_CONTEXT_HOVER_TONES[tone])}>
            {compacting ? <IconSpinner aria-hidden className="size-4 animate-spin" /> : null}
            {percent === null ? `~${used}` : null}
            {percent === null || compacting ? null : <RoomsChatContextRing percent={percent} />}
          </span>
        </PromptInputButton>
      </PopoverTrigger>
      <RoomsChatContextPanel
        align="end"
        bot={bot}
        isCompacting={isCompacting}
        side="top"
        usage={usage}
        onClose={() => setIsOpen(false)}
      />
    </Popover>
  );
}

interface RoomsChatContextItemProps {
  bot: Bot
  chat: RoomsChat
}

export function RoomsChatContextItem({ bot, chat }: RoomsChatContextItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const usage = useChatContextUsage({
    botId: bot.id,
    conversationId: chat.conversationId,
    revision: chat.isRunning ? undefined : chat.lastMessage?.entryId,
    onCompacted: (message) => toast.success(message),
  });

  const context = usage.context;

  return (
    <Popover open={context ? isOpen : false} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <Item size="sm">
          <ItemContent className="min-w-0">
            <ItemTitle>
              <PopoverTrigger asChild>
                <ItemLink asChild>
                  <button aria-label={context?.label} type="button">{m.rooms_context_title()}</button>
                </ItemLink>
              </PopoverTrigger>
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            {context ? (
              <span className={cn('flex items-center gap-1.5 text-sm tabular-nums', ROOMS_CHAT_CONTEXT_TONES[context.tone])}>
                {context.percent === null ? null : <RoomsChatContextRing percent={context.percent} />}
                {context.shown ?? `~${context.used}`}
              </span>
            ) : null}
            <ItemValue><IconChevronRight /></ItemValue>
          </ItemActions>
        </Item>
      </PopoverAnchor>
      <RoomsChatContextPanel
        align="center"
        bot={bot}
        isCompacting={false}
        side="bottom"
        usage={usage}
        onClose={() => setIsOpen(false)}
      />
    </Popover>
  );
}

interface RoomsChatContextRingProps {
  percent: number
}

function RoomsChatContextRing({ percent }: RoomsChatContextRingProps) {
  return (
    <svg
      aria-hidden
      className="size-4 -rotate-90"
      viewBox="0 0 16 16"
    >
      <circle
        className="fill-none stroke-current opacity-25"
        cx="8"
        cy="8"
        r="6"
        strokeWidth="2"
      />
      <circle
        className="fill-none stroke-current"
        cx="8"
        cy="8"
        pathLength={100}
        r="6"
        strokeDasharray={`${percent} 100`}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

interface RoomsChatContextPanelProps extends Pick<ComponentProps<typeof PopoverContent>, 'align' | 'side'> {
  bot: Bot
  usage: ReturnType<typeof useChatContextUsage>
  isCompacting: boolean
  onClose: () => void
}

function RoomsChatContextPanel({ bot, usage, isCompacting, onClose, align, side }: RoomsChatContextPanelProps) {
  const navigate = useNavigate();

  if (!usage.context) {
    return null;
  }

  const { percent, shown, tokens, tone } = usage.context;
  const compacting = isCompacting || usage.isCompacting;

  return (
    <PopoverContent align={align} side={side}>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">{m.rooms_context_title()}</span>
          {shown ? (
            <span className={cn('flex items-center gap-1 tabular-nums', ROOMS_CHAT_CONTEXT_TONES[tone])}>
              {tone === 'muted' ? null : <IconTriangleAlert aria-hidden className="size-3.5" />}
              {shown}
            </span>
          ) : null}
        </div>
        {percent === null ? null : (
          <Progress
            className="h-1"
            value={percent}
            variant={tone === 'muted' ? 'default' : tone}
          />
        )}
        <p className="text-xs text-muted-foreground tabular-nums">
          {tokens}
        </p>
        <p className="text-xs text-muted-foreground">{m.rooms_context_estimate({ bot: bot.name })}</p>
        <div className="flex gap-2">
          {usage.isCompactable || compacting ? (
            <ButtonLoading
              loading={compacting}
              size="xs"
              variant={tone === 'destructive' ? 'primary' : 'outline'}
              onClick={usage.compact}
            >
              {compacting ? null : <IconFoldVertical aria-hidden />}
              {compacting ? m.avatars_activity_compacting() : m.rooms_context_compact()}
            </ButtonLoading>
          ) : null}
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              onClose();
              void navigate({ to: '/rooms/direct/$handle/reset', params: { handle: bot.handle } });
            }}
          >
            <IconRotateCcw aria-hidden />
            {m.rooms_context_reset()}
          </Button>
        </div>
      </div>
    </PopoverContent>
  );
}
