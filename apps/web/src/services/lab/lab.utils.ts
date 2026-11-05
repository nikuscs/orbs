import { CHAT, mentionHref, ROOMS } from '@repo/client/client';
import { ENTRY } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { labArtifacts } from './lab-artifacts.utils';
import { labMediaLandscape, labMediaVoice } from './lab-media.utils';
import { LAB_CHAT } from './lab.constants';
import type { LabChatFixture, LabSubagentViewParams } from '@/types/lab.types';
import type { ChatMessage, ChatPart } from '@repo/client/client';
import type * as UniversalTypes from '@repo/contracts/universal';

function labBot(bot: Pick<UniversalTypes.Bot, 'id' | 'name' | 'handle' | 'avatar' | 'modelProvider' | 'modelId'>, now: number): UniversalTypes.Bot {
  return {
    ...bot,
    instructions: '',
    thinkingLevel: 'medium',
    fallbackModel: null,
    permission: 'ask',
    inherit: ['skills', 'mcp', 'plugins'],
    sharedSkills: null,
    sharedMcp: null,
    createdAt: now,
    updatedAt: now,
  };
}

function labMessage(entryId: number, createdAt: number, author: Pick<UniversalTypes.Bot, 'id' | 'name'> | null, role: ChatMessage['role'], parts: ChatPart[]): ChatMessage {
  return {
    id: `${CHAT.entryPrefix}${entryId}`,
    role,
    metadata: {
      entryId,
      entryIds: [entryId],
      createdAt,
      authorId: author?.id ?? null,
      authorName: author?.name ?? m.rooms_chat_you(),
      replyTo: null,
      usage: role === 'assistant' ? { input: 18_420, output: 1_240, cacheRead: 12_800, cost: { total: 0.0412 } } : null,
    },
    parts,
  };
}

function labText(text: string): ChatPart {
  return { type: 'text', text, state: 'done' };
}

function labReasoning(text: string): ChatPart {
  return { type: 'reasoning', text, state: 'done' };
}

function labTool(toolCallId: string, toolName: string, input: UniversalTypes.ToolCallJson, output: string, details?: UniversalTypes.ToolCallJson): ChatPart {
  return { type: 'dynamic-tool', toolName, toolCallId, state: 'output-available', input, output, toolMetadata: details && { details } };
}

function labToolError(toolCallId: string, toolName: string, input: UniversalTypes.ToolCallJson, errorText: string, details?: UniversalTypes.ToolCallJson,
): ChatPart {
  return { type: 'dynamic-tool', toolName, toolCallId, state: 'output-error', input, errorText, toolMetadata: details && { details } };
}

function labSubagentView({ conversationId, task, replies, isRunning, createdAt }: LabSubagentViewParams): UniversalTypes.ConversationView {
  const usage = {
    input: 2_400,
    output: 320,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 2_720,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.004 },
  };

  const entries = [
    { id: 1, conversationId, kind: ENTRY.user, model: [{ role: 'user' as const, content: task, timestamp: createdAt }] },
    ...replies.map((text, index) => ({
      id: index + 2,
      conversationId,
      kind: ENTRY.assistant,
      model: [{
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text }],
        api: 'anthropic-messages',
        provider: 'anthropic',
        model: 'claude-sonnet-5-5',
        usage,
        stopReason: 'stop' as const,
        timestamp: createdAt + (index + 1) * LAB_CHAT.minuteMs,
      }],
    })),
  ];

  const view = {
    conversationId,
    latestEntryId: entries.length,
    live: isRunning ? { run: { taskId: conversationId, inputs: [] } } : {},
    inbox: { items: [] },
    lastRun: null,
    interactionsRevision: 0,
    artifactsRevision: 0,
    entries,
  };

  return JSON.parse(JSON.stringify(view));
}

export function labChatFixture(now: number, video: ChatPart | null): LabChatFixture {
  const labAgo = (minutesAgo: number) => now - minutesAgo * LAB_CHAT.minuteMs;
  const yesterday = 26 * 60;

  const atlas = labBot({
    id: LAB_CHAT.ids.atlas,
    name: 'Atlas',
    handle: 'atlas',
    avatar: { kind: 'blob', body: 'squircle', color: 'violet', expression: 'happy' },
    modelProvider: 'anthropic',
    modelId: 'claude-opus-5-5',
  }, now);

  const scout = labBot({
    id: LAB_CHAT.ids.scout,
    name: 'Scout',
    handle: 'scout',
    avatar: { kind: 'blob', body: 'pebble', color: 'turquoise', expression: 'curious' },
    modelProvider: 'openai',
    modelId: 'gpt-5.5',
  }, now);

  const ledger = labBot({
    id: LAB_CHAT.ids.ledger,
    name: 'Ledger',
    handle: 'ledger',
    avatar: { kind: 'emoji', emoji: '📒', color: '#f59e0b' },
    modelProvider: 'google',
    modelId: 'gemini-3-pro',
  }, now);

  const artifact: UniversalTypes.Artifact = {
    id: LAB_CHAT.ids.artifact,
    botId: atlas.id,
    conversationId: 1,
    title: 'Launch week dashboard',
    emoji: '📈',
    version: 2,
    createdAt: labAgo(40),
    updatedAt: labAgo(38),
    spec: {
      root: 'root',
      state: {},
      elements: {
        'root': { type: 'Stack', props: { gap: 'md' }, children: ['stats', 'chart', 'checklist'] },
        'stats': { type: 'Grid', props: { columns: '3' }, children: ['signups', 'activation', 'revenue'] },
        'signups': { type: 'Stat', props: { label: 'Signups', value: '1,539', change: '+38%', trend: 'up' }, children: [] },
        'activation': { type: 'Stat', props: { label: 'Activation', value: '49%', change: '+2 pts', trend: 'up' }, children: [] },
        'revenue': { type: 'Stat', props: { label: 'MRR', value: '€4,210', change: '-1%', trend: 'down' }, children: [] },
        'chart': {
          type: 'AreaChart',
          props: {
            x: 'day',
            series: [{ key: 'signups', label: 'Signups' }, { key: 'activated', label: 'Activated' }],
            data: [
              { day: 'Mon', signups: 142, activated: 61 },
              { day: 'Tue', signups: 188, activated: 84 },
              { day: 'Wed', signups: 171, activated: 79 },
              { day: 'Thu', signups: 230, activated: 112 },
              { day: 'Fri', signups: 214, activated: 103 },
              { day: 'Sat', signups: 276, activated: 140 },
              { day: 'Sun', signups: 318, activated: 171 },
            ],
          },
          children: [],
        },
        'checklist': {
          type: 'Checklist',
          props: {
            items: [
              { title: 'Recap drafted', done: true },
              { title: 'Revenue split from Ledger', done: false },
              { title: 'Day-7 retention check', done: false },
            ],
          },
          children: [],
        },
      },
    },
  };

  const [blocks, page] = labArtifacts(atlas.id, labAgo(43));

  const messages: ChatMessage[] = [
    labMessage(1, labAgo(yesterday), atlas, 'system', [{ type: 'data-routineRun', data: { routineId: LAB_CHAT.ids.routine, name: 'Morning briefing' } }, labText('Run the morning briefing: calendar, inbox and open todos.')]),
    labMessage(2, labAgo(yesterday - 1), atlas, 'assistant', [
      labText('Good morning! Three meetings today, the first at **10:00** with the design team. Two emails need a reply and one todo is due: *finish the launch post*.'),
    ]),
    labMessage(3, labAgo(90), null, 'user', [
      labText(`Can you put together a launch-week recap? Use [$weekly-report](${mentionHref({ kind: 'skill', name: 'weekly-report' })}) and check what [@Scout](${mentionHref({ kind: 'bot', name: scout.id })}) found about competitors.`),
    ]),
    labMessage(4, labAgo(89), atlas, 'assistant', [
      labReasoning('The owner wants a recap of launch week. I need signup numbers from the database export, the onboarding timing from the analytics MCP, and competitor notes from Scout. I will run the export first, then read the notes file.'),
      labTool('call-1', 'bash', { command: 'bun run export --since 7d', description: 'Export last week of signups' }, 'Wrote 1,539 rows to exports/signups.csv'),
      labTool('call-2', 'read', { path: '/workspace/notes/launch/onboarding-timing.md' }, '# Onboarding timing\n\nMedian time to first message: 1m 52s (was 4m 10s).'),
      labTool('call-3', 'mcp_posthog_6a1f0c9e2b7d4e8f1a3c5b7d', { query: 'pairing_failed rate last 7 days' }, '{"rate": 0.031, "devices": 412}'),
      labToolError('call-4', 'edit', {
        path: '/workspace/notes/launch/recap.md',
        oldText: '## Draft',
        newText: '## Launch week recap',
      }, 'Could not find the text "## Draft" in recap.md'),
      labTool('call-5', 'write', { path: '/workspace/notes/launch/recap.md', content: '## Launch week recap\n\nSignups: 1,539' }, 'Wrote 2 lines to recap.md'),
      labTool('call-6', 'bot_message', { botId: scout.id, text: 'What did you find about competitor launches this week?' }, 'Delivered to Scout'),
      labText(LAB_CHAT.report),
    ]),
    labMessage(5, labAgo(80), null, 'user', [
      { type: 'file', mediaType: 'image/svg+xml', filename: 'signups-chart.svg', url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LAB_CHAT.chart)}` },
      { type: 'file', mediaType: 'text/csv', filename: 'signups-october.csv', url: `data:text/csv;charset=utf-8,${encodeURIComponent(LAB_CHAT.csv)}` },
      labText('Here is the chart from the dashboard and the raw export. How did you get the daily numbers?'),
    ]),
    labMessage(6, labAgo(79), atlas, 'assistant', [labText(LAB_CHAT.code)]),
    labMessage(7, labAgo(70), null, 'user', [labText('Great. Can you dig deeper into competitor launches and the iOS pairing failures at the same time?')]),
    labMessage(8, labAgo(69), atlas, 'assistant', [
      labText('On it. I am starting two sub-agents so both run in parallel.'),
      labTool('call-7', 'bot_subagent', {
        operation: 'run',
        name: 'Competitor scan',
        message: 'Find launches by three competitors this week and summarise pricing and positioning.',
      }, 'Linear, Raycast and Arc all shipped AI features; two moved to usage pricing.', { conversationId: 12 }),
      labToolError('call-8', 'bot_subagent', {
        operation: 'run',
        name: 'Pairing logs',
        message: 'Read the iOS pairing logs from the last 7 days and group the failures by error code.',
      }, 'The log bucket returned 403 Forbidden.', { conversationId: 13 }),
    ]),
    labMessage(9, labAgo(60), atlas, 'system', [{ type: 'data-subagent', data: { name: 'Competitor scan', conversationId: 12, status: 'answered' } }, labText('Linear, Raycast and Arc all shipped AI features this week. Two of them moved to usage pricing.')]),
    labMessage(10, labAgo(59), atlas, 'system', [{ type: 'data-subagent', data: { name: 'Pairing logs', conversationId: 13, status: 'failed' } }, labText('The log bucket returned 403 Forbidden.')]),
    labMessage(11, labAgo(55), scout, 'user', [labText('Atlas, competitor notes are in /workspace/notes/competitors.md. Two of them changed pricing this week.')]),
    labMessage(12, labAgo(54), atlas, 'system', [{ type: 'data-ownerNote', data: { peerBotId: scout.id, peerName: scout.name, conversationId: 4, hops: 1, text: 'Scout thinks the pricing changes are worth a look before the Monday planning.' } }, labText('Scout thinks the pricing changes are worth a look before the Monday planning.')]),
    labMessage(30, labAgo(52), null, 'user', [labText('While you work on that, keep an eye on support tickets in the background and draft the changelog.')]),
    labMessage(31, labAgo(51), atlas, 'assistant', [
      labText('Both are running in the background. I will tell you when the changelog is ready; support triage keeps going until you stop it.'),
      labTool('call-20', 'bot_subagent', {
        operation: 'spawn',
        name: 'Support triage',
        message: 'Watch new support tickets during launch week and flag anything about pairing or billing.',
      }, 'Started Support triage in the background.', { conversationId: 21 }),
      labTool('call-21', 'bot_subagent', {
        operation: 'spawn',
        name: 'Changelog draft',
        message: 'Draft the public changelog for launch week from the merged pull requests.',
      }, 'Started Changelog draft in the background.', { conversationId: 22 }),
      labTool('call-22', 'bot_subagent', {
        operation: 'send',
        name: 'Changelog draft',
        message: 'Keep it under 150 words and lead with the new onboarding.',
      }, 'Sent to Changelog draft.', { conversationId: 22 }),
    ]),
    labMessage(32, labAgo(48), atlas, 'system', [{ type: 'data-subagent', data: { name: 'Changelog draft', conversationId: 22, status: 'answered' } }, labText(LAB_CHAT.changelog)]),
    labMessage(13, labAgo(45), null, 'user', [labText('Make me a dashboard for this, add a todo for the retention check, and set up a routine every Monday.')]),
    labMessage(14, labAgo(44), atlas, 'assistant', [
      labTool('call-9', 'bot_artifact_create', { title: artifact.title }, JSON.stringify({
        id: artifact.id,
        botId: artifact.botId,
        conversationId: artifact.conversationId,
        title: artifact.title,
        version: artifact.version,
      })),
      labTool('call-10', 'bot_todo_create', { title: 'Check day-7 retention' }, JSON.stringify({ id: 42, title: 'Check day-7 retention' })),
      labTool('call-11', 'bot_routine_create', { name: 'Monday retention check' }, JSON.stringify({ id: LAB_CHAT.ids.routine, name: 'Monday retention check' })),
      labTool('call-12', 'bot_todo_update', { id: 41, isDone: true }, JSON.stringify({ id: 41, title: 'Draft the launch recap' })),
      labTool('call-13', 'bot_create', { name: 'Nova', handle: 'nova' }, JSON.stringify({ id: LAB_CHAT.ids.nova, name: 'Nova' })),
      labText('Done. The dashboard is above, the todo and the Monday routine are set, and I created **Nova** to watch support tickets during launch.'),
    ]),
    labMessage(33, labAgo(43), null, 'user', [labText('Show me every artifact block, and the status as an HTML page.')]),
    labMessage(34, labAgo(42), atlas, 'assistant', [
      ...[blocks, page].map((item, index) => labTool(`call-${40 + index}`, 'bot_artifact_create', { title: item.title, emoji: item.emoji }, JSON.stringify({
        id: item.id,
        botId: item.botId,
        conversationId: item.conversationId,
        title: item.title,
        version: item.version,
      }))),
      labText('Here is every block in one artifact, and the status as a page.'),
    ]),
    labMessage(15, labAgo(40), atlas, 'system', [{ type: 'data-compaction', data: { status: 'done' } }]),
    labMessage(16, labAgo(30), null, 'user', [labText('Can you show the launch countdown as a page?')]),
    labMessage(17, labAgo(29), atlas, 'assistant', [labText(LAB_CHAT.html)]),
    labMessage(18, labAgo(20), null, 'user', [labText('Now push the recap to the repo.')]),
    labMessage(19, labAgo(19), atlas, 'assistant', [
      labText('I tried to open a pull request with the recap.'),
      { type: 'data-failure', data: { text: 'The model provider returned 529 Overloaded. Try again in a minute.' } },
    ]),
    labMessage(40, labAgo(18), null, 'user', [labText('Send me everything the venue sent: photos, the walkthrough and the voicemail.')]),
    labMessage(41, labAgo(17), atlas, 'assistant', [
      ...LAB_CHAT.media.landscapes.slice(0, 1).map(labMediaLandscape),
      labText('This is the north terrace, from their gallery.'),
    ]),
    labMessage(42, labAgo(16), atlas, 'assistant', [
      ...LAB_CHAT.media.landscapes.map(labMediaLandscape),
      labText('Six photos in total: hall, garden, entrance, parking and the west view.'),
    ]),
    labMessage(43, labAgo(15), atlas, 'assistant', [
      ...LAB_CHAT.media.landscapes.slice(1, 4).map(labMediaLandscape),
      labText('Three from the evening visit.'),
    ]),
    labMessage(44, labAgo(14), atlas, 'assistant', [
      ...(video ? [video] : []),
      labText('The walkthrough, from the entrance to the terrace.'),
    ]),
    labMessage(45, labAgo(13), atlas, 'assistant', [
      { type: 'file', mediaType: 'audio/wav', filename: 'voicemail.wav', url: labMediaVoice() },
      labText('Here is the voicemail. She confirms the 14th and asks for the final headcount by Friday.'),
    ]),
    labMessage(46, labAgo(12), atlas, 'assistant', [
      { type: 'file', mediaType: 'text/csv', filename: 'guest-list.csv', url: `data:text/csv;charset=utf-8,${encodeURIComponent(LAB_CHAT.csv)}` },
      { type: 'file', mediaType: 'audio/mpeg', filename: 'missing-clip.mp3', url: 'data:audio/mpeg;base64,' },
      labText('The guest list, and a clip that could not be loaded.'),
    ]),
    labMessage(20, labAgo(5), null, 'user', [labText('Try again, and ask me before you push anything.')]),
  ];

  const retry = messages.at(-1);

  if (retry?.metadata) {
    retry.metadata.replyTo = { entryId: 19, authorName: atlas.name, text: 'I tried to open a pull request with the recap.' };
  }

  const draft: ChatMessage = {
    id: CHAT.liveMessageId,
    role: 'assistant',
    metadata: { entryId: 0, entryIds: [0], createdAt: labAgo(4), authorId: atlas.id, authorName: atlas.name, replyTo: null, usage: null },
    parts: [
      { type: 'reasoning', text: 'Retrying the push. The owner asked to confirm before pushing, so I will ask for approval on the push command.', state: 'done' },
      { type: 'dynamic-tool', toolName: 'bot_subagent', toolCallId: 'call-16', state: 'input-available', input: { operation: 'run', name: 'Pricing deep dive', message: 'Compare the new usage pricing of Linear and Raycast with ours and suggest one change.' } },
      labTool('call-14', 'bash', { command: 'git status --short' }, ' M notes/launch/recap.md'),
      { type: 'dynamic-tool', toolName: 'bash', toolCallId: 'call-15', state: 'approval-requested', input: { command: 'git push origin launch-recap' }, approval: { id: '1' } },
    ],
  };

  const subagentViews = [
    labSubagentView({
      botId: atlas.id,
      conversationId: 12,
      task: 'Find launches by three competitors this week and summarise pricing and positioning.',
      replies: ['Linear, Raycast and Arc all shipped AI features this week.\n\n- **Linear** moved AI triage to usage pricing.\n- **Raycast** bundled AI into Pro at $10 a month.\n- **Arc** kept AI free but capped daily requests.'],
      isRunning: false,
      createdAt: labAgo(69),
    }),
    labSubagentView({
      botId: atlas.id,
      conversationId: 13,
      task: 'Read the iOS pairing logs from the last 7 days and group the failures by error code.',
      replies: [],
      isRunning: false,
      createdAt: labAgo(69),
    }),
    labSubagentView({
      botId: atlas.id,
      conversationId: 21,
      task: 'Watch new support tickets during launch week and flag anything about pairing or billing.',
      replies: ['Checked 38 new tickets. Two mention pairing on iOS 18.4; none mention billing. I will keep watching.'],
      isRunning: true,
      createdAt: labAgo(51),
    }),
    labSubagentView({
      botId: atlas.id,
      conversationId: 22,
      task: 'Draft the public changelog for launch week from the merged pull requests.',
      replies: ['Here is a first draft with 9 changes, grouped by area.', LAB_CHAT.changelog],
      isRunning: false,
      createdAt: labAgo(51),
    }),
  ];

  return {
    bot: atlas,
    subagentViews,
    subagentContexts: [
      { kind: 'subagent', botId: atlas.id, conversationId: 21, isRunning: true, name: 'Support triage', ownerTaskId: 31, isBackground: true },
      { kind: 'subagent', botId: atlas.id, conversationId: 22, isRunning: false, name: 'Changelog draft', ownerTaskId: 31, isBackground: true },
    ],
    bots: [atlas, scout, ledger],
    messages,
    draft,
    artifacts: [artifact, blocks, page],
    activity: 'working',
    queued: [{ submissionId: 1, mode: 'followUp', text: 'Also send the recap to Ledger when it is merged.', skills: [] }],
    reactions: new Map([
      [4, { entryId: 4, emojis: ['🔥'], botReactions: [{ botId: scout.id, emojis: ['🔥', '👀'] }] }],
      [17, { entryId: 17, emojis: ['❤️'], botReactions: [] }],
    ]),
    approvals: [{
      id: 1,
      botId: atlas.id,
      conversationId: 1,
      privateWith: null,
      toolName: 'bash',
      arguments: { command: 'git push origin launch-recap', description: 'Push the launch recap branch' },
      createdAt: labAgo(3),
      expiresAt: now + 5 * LAB_CHAT.minuteMs,
    }],
    questions: [
      {
        id: 1,
        botId: atlas.id,
        conversationId: 1,
        privateWith: null,
        text: 'Which branch should the recap go to?\nI can open a pull request or push straight to main.',
        choices: [`Open a pull request ${ROOMS.recommendedChoice}`, 'Push to main', 'Keep it local'],
        isMultiSelect: false,
        secret: null,
        createdAt: labAgo(3),
        expiresAt: now + 5 * LAB_CHAT.minuteMs,
      },
      {
        id: 2,
        botId: atlas.id,
        conversationId: 1,
        privateWith: scout.id,
        text: 'Scout needs a GitHub token to read the private repo.',
        choices: [],
        isMultiSelect: false,
        secret: { name: 'GITHUB_TOKEN', hosts: ['api.github.com'] },
        createdAt: labAgo(2),
        expiresAt: now + 5 * LAB_CHAT.minuteMs,
      },
    ],
  };
}
