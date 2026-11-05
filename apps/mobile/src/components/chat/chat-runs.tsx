import { BOT_ACTIVITY_LABELS, chatActivityDetail, chatActivityPeer, chatActivityWaitingOn, toolRunning } from '@repo/client/client';
import { useChatElapsed, useChatHideVerbose } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { Fragment } from 'react';
import { View } from 'react-native';
import { match } from 'ts-pattern';
import { BotMention } from '@/components/bots/bot-mention';
import { EventLabel, EventLine, EventList } from '@/components/ui/event';
import { ChatApproval } from './chat-approval';
import { ChatFailure } from './chat-failure';
import { ChatQuestion } from './chat-question';
import { ChatTyping } from './chat-typing';
import type { ChatActivity, ChatMessage } from '@repo/client/client';
import type { Bot, ConversationQuestion, ToolApproval } from '@repo/contracts/universal';

interface ChatRunsProps {
  bot: Bot;
  bots?: Bot[];
  activity: ChatActivity;
  failure: string | null;
  draft?: ChatMessage;
  startedAt?: number;
  approvals: ToolApproval[];
  questions: ConversationQuestion[];
}

export function ChatRuns({ bot, bots = [], activity, failure, draft, startedAt, approvals, questions }: ChatRunsProps) {
  const source = (privateWith: string | null) => {
    const peer = bots.find((item) => item.id === privateWith);

    return peer ? (
      <EventList>
        <EventLine>
          <EventLabel>{m.rooms_event_private_source()}</EventLabel>
          <BotMention bot={peer} />
        </EventLine>
      </EventList>
    ) : null;
  };

  const { hideVerbose } = useChatHideVerbose();
  const last = draft?.parts.filter((part) => part.type !== 'step-start').at(-1);
  const isWaiting = activity === 'queued';
  const waitingOn = chatActivityWaitingOn(approvals.length, questions.length);
  const elapsed = useChatElapsed(startedAt, !isWaiting && activity !== 'idle' && activity !== 'failed');

  const isSpeaking = (activity === 'writing' && last?.type === 'text' && last.state === 'streaming')
    || (!isWaiting && !waitingOn && !hideVerbose && last?.type === 'dynamic-tool' && toolRunning(last))
    || (!isWaiting && !hideVerbose && last?.type === 'reasoning' && last.state === 'streaming');

  const isActive = activity !== 'idle' && activity !== 'failed' && !isSpeaking;

  const detail = match(waitingOn)
    .with('approval', () => m.rooms_activity_waiting_approval())
    .with('question', () => m.rooms_activity_waiting_question())
    .otherwise(() => (isWaiting ? null : chatActivityDetail({ draft, bots })));

  const peer = isWaiting || waitingOn ? undefined : chatActivityPeer(draft, bots);
  const label = isWaiting ? m.rooms_chat_waiting({ bot: bot.name }) : detail ?? BOT_ACTIVITY_LABELS[activity]();

  return (
    <View>
      {questions.map((question) => (
        <Fragment key={question.id}>
          {source(question.privateWith)}
          <ChatQuestion question={question} />
        </Fragment>
      ))}
      {approvals.map((approval) => (
        <Fragment key={approval.id}>
          {source(approval.privateWith)}
          <ChatApproval approval={approval} botName={bot.name} />
        </Fragment>
      ))}
      {failure ? <ChatFailure bot={bot} detail={failure} /> : null}
      <View className="min-h-7 justify-center">
        {isActive ? (
          <ChatTyping
            accessibilityLabel={label}
            elapsed={elapsed === null ? undefined : m.rooms_activity_elapsed({ seconds: elapsed })}
            label={activity === 'thinking' && !detail ? undefined : label}
            peer={peer}
          />
        ) : null}
      </View>
    </View>
  );
}
