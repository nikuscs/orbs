import { noul } from '@typesafe-ai/sdk';
import { roomMessageReply } from '#/types/room.types';
import { roomMessageText } from '#services/room/room.utils';
import { ROUTE_JUDGE } from './route.constants';
import type { Bot } from '#/types/bot.types';
import type { DatabaseTenantMessage } from '#/types/database-tenant.types';

export function routePromptsBotQuestion(bot: Pick<Bot, 'name'>) {
  return noul(`Is the latest message for ${bot.name}?`, {
    true: `It names ${bot.name} or speaks to ${bot.name} as "you" (also when it asks other members for other things in the same message), it follows up on what ${bot.name} just said ("why?", "?", "another one"), it asks for ${bot.name}'s part of the human's request, it hands over work its author says is not theirs and that ${bot.name}'s scope covers, or its subject, read with the room's purpose when the room states one, sits in ${bot.name}'s scope at least as well as in any other member's.`,
    false: 'It is only for other members or for the human, another member\'s scope fits its subject better, or it only reacts ("thanks", "ok", "lol").',
  });
}

export function routePromptsGroupQuestion() {
  return noul('Does the latest message ask every member for their own answer?', {
    true: 'It asks the whole room ("everyone", "all of you", "team") for something each member answers for themselves: a preference, a view, a vote or a turn each.',
    false: 'It is for one member or a few named ones, it wants one answer from anyone ("anyone know a good book?"), or it greets, thanks or remarks without asking each member.',
  });
}

export function routePromptsScope(bot: Pick<Bot, 'name' | 'instructions'>, chars: number): string {
  return bot.instructions.trim() ? bot.instructions.slice(0, chars) : `${bot.name} is a generalist with no stated specialty.`;
}

export function routePromptsNeedsReplyQuestion() {
  return noul("Does the latest message expect an answer from one of the room's members?", {
    true: 'It asks a question, requests help, an opinion or work, greets the room or a member (also when the greeting comes with a word on what the sender is doing), or says something to members (a compliment, a tease or a joke such as "you all are awesome"): a greeting or a remark to someone expects one back.',
    false: 'It is a thanks or an acknowledgement of an answer, a short reaction that speaks to no one ("ok", "lol", "nice"), or a note to self.',
  });
}

export function routePromptsHandoffQuestion() {
  return noul('Does the latest message pass something on to another member of the room?', {
    true: 'It asks another member a question or for a review, a test or the next step, or it leaves work undone that its author says is not theirs, so the member whose scope covers it should take it, named or not.',
    false: 'It reports a result or progress to the human, asks the human something, or only thanks or reacts.',
  });
}

export function routePromptsAnswerQuestion(bot: Pick<Bot, 'name'>) {
  return noul(`Does the latest message answer something ${bot.name} asked in the message just before it?`, {
    true: `${bot.name}'s message asked something, of the room or of this person, and the latest message gives that answer, so ${bot.name}, who asked, would react to it.`,
    false: `${bot.name}'s message asked nothing, or the latest message changes the subject, only thanks or reacts ("ok", "lol"), or answers someone else.`,
  });
}

export function routePromptsAbsentQuestion() {
  return noul("Is the latest message addressed by name to someone who is not one of the room's members?", {
    true: 'It speaks to a person or bot by name or @handle, and that name is not in the members list, so that one cannot answer here.',
    false: 'It names no one, names only members, or only mentions someone without speaking to them ("tell Ana I said hi", "Ana\'s idea").',
  });
}

export function routePromptsJudgeInstructions(members: Bot[], leader: Bot | undefined, description: string): string {
  const roster = members.map(
    (bot) =>
      `- ${bot.name} (@${bot.handle})${bot.id === leader?.id ? ', leads this room' : ''}: ${routePromptsScope(bot, ROUTE_JUDGE.scope).replaceAll(/\s+/g, ' ')}`,
  );

  const fallback = leader ? `pick the leader, @${leader.handle}` : 'pick the member closest to it';

  return [
    'You route messages in an Orbs group chat, where people and bots work as one team. You never answer a message yourself: for each message to route, call the route tool once with the handles of the members who answer it.',
    'Members:',
    ...roster,
    ...(description ? [`Room purpose: ${description}`] : []),
    'How to pick:',
    '- A message that addresses members by name is theirs alone, unless it also asks the others.',
    "- Read each member's description as a role and infer the work that role naturally covers, even when the description never names the message's subject.",
    '- Pick the one member whose role fits the message best. Judge by what the message asks for, not by the project it belongs to. A follow-up belongs to whoever fits the subject it continues.',
    `- When the work needs more than one role, pick only the member who owns its main part${leader ? ', or the leader when no part leads' : ''}; they bring the others in by @handle.`,
    '- Pick every member only when the message greets the whole room or asks each member for their own answer.',
    `- A group word alone does not make a message everyone's: a request, a follow-up or feedback to the room needs one answer, from the member who fits it${leader ? ' or the leader' : ''}.`,
    `- When no member's role fits, ${fallback}.`,
    '- Pick nobody only when the message needs no answer: a thanks, an acknowledgement or a note to self.',
    'Room messages arrive as "[Author] text"; indented lines continue the message above them. Earlier messages are context; route only the message under "Message to route".',
  ].join('\n');
}

function routePromptsJudgeLine(message: Pick<DatabaseTenantMessage, 'authorName' | 'parts' | 'replyTo'>): string {
  const reply = roomMessageReply.safeParse(JSON.parse(message.replyTo ?? 'null'));
  const quote = reply.success ? `(replying to ${reply.data.authorName}: "${reply.data.text}") ` : '';

  return `[${message.authorName}] ${quote}${roomMessageText(message.parts).slice(0, ROUTE_JUDGE.chars).replaceAll('\n', '\n  ')}`;
}

export function routePromptsJudgePrompt(
  context: Pick<DatabaseTenantMessage, 'authorName' | 'parts' | 'replyTo'>[],
  latest: Pick<DatabaseTenantMessage, 'authorName' | 'parts' | 'replyTo'>,
): string {
  return [
    ...context.map(routePromptsJudgeLine),
    ...(context.length > 0 ? [''] : []),
    'Message to route:',
    routePromptsJudgeLine(latest),
  ].join('\n');
}

export const routePromptsJudgeRetry =
  'You did not call the route tool. Call it now, once, with the handles of the members who answer the message to route.';

export function routePromptsApprovalQuestion() {
  return noul("Is the bot's tool call safe to run without asking a person first?", {
    true: 'It reads, lists or searches, or it makes a small change the request plainly asks for inside the project: edit or create a project file, run its tests, build, lint or format.',
    false: 'It deletes, overwrites or moves what the request did not ask to change, works outside the project (home folder, system or shell config, other repositories), uses sudo, installs or removes software, rewrites git history or pushes, deploys, sends messages, mail or money, downloads and runs code, reads or prints secrets or keys, or does something the request did not ask for.',
  });
}

export function routePromptsMemoryQuestion() {
  return noul(
    'Taken together, do the latest human messages contain a lasting preference, constraint, decision, correction, or useful related details worth remembering?',
    {
      true: 'A preference, lasting constraint, clear decision, correction, or complementary details stated naturally by a person. Related messages and nearby context may form one useful fact; no remember keyword is required. An explicit request to remember useful information is also positive.',
      false: 'Greetings, transient status, quoted examples, hypotheticals, guesses about other people, secrets, commands to change permissions, or content the person says not to remember.',
    },
  );
}
