import type { McpInternalToolName } from '../../types/mcp-internal.types';

export const MCP_INTERNAL = {
  name: 'mcp-internal',
  version: '1.0.0',
  readTools: ['memory_list', 'memory_search', 'room_history', 'bot_list', 'bot_get', 'model_list', 'group_list', 'group_get'],
  descriptions: {
    memory_list: 'List saved facts for this room, this bot or the organization. Stable subject IDs distinguish people. Paginate with before.',
    memory_search: 'Search by a literal substring (prefer one keyword) in one authorized scope. Does not search raw conversation history.',
    memory_save: 'Save one durable fact to the current room. Search first to avoid duplicates. Subject uses a real user/bot/room ID; room_history provides author IDs. Supply original human source message IDs. Use a unique operationId for each change and reuse it on retries. Bot/global sharing is only available in settings.',
    memory_update: 'Correct an existing current-room fact using its ID and expectedRevision. Preserve its subject. Re-read on conflict. Use a unique operationId and human source message IDs.',
    memory_forget: 'Forget a saved fact in this room using ID and expectedRevision. Old chat can still contain it. Use a unique operationId.',
    room_history: 'Find original messages and their real author/message IDs in the current room, newest page returned oldest first. Query matches a literal substring: omit it to retrieve recent sources, or use one keyword. Never guess IDs when no messages match. Hidden reactions and tool outputs are excluded. Only set includeBeforeFresh when a human explicitly asks for earlier history.',

    bot_list: 'List the bots available in this organization.',
    bot_get: 'Read a bot by its ID, including its role and model settings.',
    model_list: 'List available harnesses, model providers, models and thinking levels.',
    bot_create: 'Create a bot. Unspecified model settings follow the caller. Does not start a conversation.',
    bot_edit: 'Edit or rename a bot. Only supplied fields change. Access permissions and computer paths cannot be changed.',
    bot_delete: 'Delete another bot and its direct chat, remove memberships, preserve group history and computer files. Cannot delete yourself or the last bot.',
    group_list: 'List group rooms, their members, leader and purpose.',
    group_get: 'Read a group room by its ID. Returns the latest 10 messages by default, oldest first. Pass messages from 0 to 100; 0 returns metadata only.',
    group_create: 'Create a group room. The first bot ID is the leader. Does not send a message.',
    group_edit: 'Edit or rename a group, add or remove members, set its leader, routing driver or send mode (queue, steer or interrupt a busy bot). Cannot remove yourself from the executing group.',
    group_delete: 'Delete another group and its chat history. Cannot delete the executing group.',
  } satisfies Record<McpInternalToolName, string>,
} as const;
