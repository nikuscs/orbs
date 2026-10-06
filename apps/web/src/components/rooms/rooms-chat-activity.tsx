import { m } from '@orbs/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { isToolUIPart } from 'ai';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Button } from '@/components/ui/button';
import { botHarnessProblem } from '@/services/bot/bot.client';
import { BOT_ACTIVITY_LABELS } from '@/services/bot/bot.constants';
import { rpc } from '@/services/rpc/rpc.client';
import { toolRunning } from '@/services/tool/tool.client';
import type { BotActivity } from '@/types/bot.types';
import type { Bot, RoomUIMessage } from '@orbs/server/client';

export function RoomsChatActivity({ botName, bot, activity, draft, queuedBehind, waiting, onCancel }: {
  botName: string
  bot?: Bot
  activity: BotActivity
  draft?: RoomUIMessage
  queuedBehind?: string
  waiting: boolean
  onCancel?: () => void
}) {
  const last = draft?.parts.filter((part) => part.type !== 'step-start').at(-1);
  const textSpeaks = activity === 'writing' && last?.type === 'text' && last.state === 'streaming';
  const toolRowSpeaks = !waiting && last !== undefined && isToolUIPart(last) && toolRunning(last);
  const harnesses = useQuery(rpc.bots.harnesses.queryOptions({ enabled: waiting }));
  const blocked = botHarnessProblem(harnesses.data?.find((harness) => harness.harnessId === bot?.harnessId));
  const queued = queuedBehind ? m.rooms_chat_queued({ bot: botName, other: queuedBehind }) : blocked ?? m.rooms_chat_waiting({ bot: botName });

  if (textSpeaks || toolRowSpeaks) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
      <BotAvatar
        activity={activity}
        bot={bot ?? { name: botName }}
        size={24}
      />
      {waiting ? queued : m.avatars_bot_label({ bot: botName, activity: BOT_ACTIVITY_LABELS[activity]() })}
      {waiting && onCancel ? (
        <Button
          size="xs"
          variant="ghost"
          onClick={onCancel}
        >
          {m.rooms_chat_cancel()}
        </Button>
      ) : null}
    </div>
  );
}
