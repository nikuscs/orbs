import { chatActivityWaitingOn } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { Fragment } from 'react';
import { EventLabel, EventLine, EventList } from '../ai/event';
import { BotMention } from '../bots/bot-mention';
import { MessageScrollerItem } from '../message-scroller';
import { RoomsChatActivity } from './rooms-chat-activity';
import { RoomsChatApproval } from './rooms-chat-approval';
import { RoomsChatFailure } from './rooms-chat-failure';
import { RoomsChatQuestions } from './rooms-chat-questions';
import type { ChatActivity, ChatMessage } from '@repo/client/client';
import type { Bot, ConversationQuestion, ToolApproval } from '@repo/contracts/universal';

interface RoomsChatRunsProps {
  bot: Bot
  bots?: Bot[]
  activity: ChatActivity
  failure: string | null
  draft?: ChatMessage
  startedAt?: number
  approvals: ToolApproval[]
  questions: ConversationQuestion[]
}

export function RoomsChatRuns({ bot, bots = [], activity, failure, draft, startedAt, approvals, questions }: RoomsChatRunsProps) {
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

  return (
    <MessageScrollerItem>
      {questions.map((question) => (
        <Fragment key={question.id}>
          {source(question.privateWith)}
          <RoomsChatQuestions className="my-2" question={question} />
        </Fragment>
      ))}
      {approvals.map((approval) => (
        <Fragment key={approval.id}>
          {source(approval.privateWith)}
          <RoomsChatApproval
            approval={approval}
            botName={bot.name}
            className="my-2"
          />
        </Fragment>
      ))}
      {failure ? (
        <EventList>
          <RoomsChatFailure bot={bot} detail={failure} />
        </EventList>
      ) : null}
      <div className="flex min-h-8 items-center">
        {activity === 'idle' || activity === 'failed' ? null : (
          <RoomsChatActivity
            activity={activity}
            botName={bot.name}
            bots={bots}
            draft={draft}
            startedAt={startedAt}
            waitingOn={chatActivityWaitingOn(approvals.length, questions.length)}
            waiting={activity === 'queued'}
          />
        )}
      </div>
    </MessageScrollerItem>
  );
}
