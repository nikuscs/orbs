import { m } from '@orbs/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { isToolUIPart } from 'ai';
import { useEffect, useState } from 'react';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { RoomsChatActivity } from '@/components/rooms/rooms-chat-activity';
import { RoomsChatFailure } from '@/components/rooms/rooms-chat-failure';
import { RoomsChatMessage } from '@/components/rooms/rooms-chat-message';
import { Button } from '@/components/ui/button';
import { MessageScrollerItem } from '@/components/ui/message-scroller';
import { botRunActivity } from '@/services/bot/bot.client';
import { roomsDraftWithoutPass } from '@/services/rooms/rooms.client';
import { rpc } from '@/services/rpc/rpc.client';
import { tenantService } from '@/services/tenant/tenant.client';
import type { Bot, RoomUIMessage, RunRoom } from '@orbs/server/client';

export function RoomsChatRuns({ roomId, runs, bots, leaderBotId }: { roomId: string; runs: RunRoom[]; bots: Bot[]; leaderBotId: string | null }) {
  const [drafts, setDrafts] = useState<Partial<Record<string, RoomUIMessage>>>({});
  const retry = useMutation(rpc.rooms.retry.mutationOptions());
  const cancel = useMutation(rpc.rooms.cancel.mutationOptions());
  const botsById = new Map(bots.map((bot) => [bot.id, bot]));
  const running = runs.find((run) => run.status === 'running');

  useEffect(() => tenantService.watchDrafts(roomId, (runId, draft) => setDrafts((current) => ({ ...current, [runId]: draft }))), [roomId]);

  return (
    <>
      {runs.map((run) => {
        const draft = roomsDraftWithoutPass({ draft: drafts[run.id] });
        const bot = botsById.get(run.botId);
        const activity = botRunActivity(run);

        if (run.status === 'failed' || run.status === 'interrupted') {
          const retrying = retry.variables?.runId === run.id;

          return (
            <MessageScrollerItem
              className="flex items-center gap-2 py-2"
              key={run.id}
              messageId={run.id}
            >
              <BotAvatar
                activity={activity}
                bot={bot ?? { name: run.botName }}
                size={24}
              />
              {run.status === 'failed' ? <RoomsChatFailure run={run} /> : <span className="text-xs text-muted-foreground">{m.rooms_chat_interrupted({ bot: run.botName })}</span>}
              <Button
                disabled={retrying ? retry.isPending : false}
                size="xs"
                variant="outline"
                onClick={() => retry.mutate({ roomId, runId: run.id })}
              >
                {m.rooms_chat_retry()}
              </Button>
              {retrying && retry.isError ? <span className="text-destructive">{m.rooms_chat_retry_failed()}</span> : null}
            </MessageScrollerItem>
          );
        }

        if (run.seat !== 'required' && run.status === 'queued') {
          return null;
        }

        const visible = draft?.parts.some((part) => part.type === 'text' || isToolUIPart(part));

        return (
          <MessageScrollerItem key={run.id} messageId={run.id}>
            {draft && visible ? (
              <RoomsChatMessage
                live
                activity={activity}
                bot={bot}
                leader={run.botId === leaderBotId}
                message={draft}
                name={run.botName}
              />
            ) : null}
            <RoomsChatActivity
              activity={activity}
              bot={bot}
              botName={run.botName}
              draft={draft}
              queuedBehind={run.status === 'queued' ? running?.botName : undefined}
              waiting={run.status === 'queued'}
              onCancel={cancel.isPending && cancel.variables.runId === run.id ? undefined : () => cancel.mutate({ roomId, runId: run.id })}
            />
          </MessageScrollerItem>
        );
      })}
    </>
  );
}
