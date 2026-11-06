import { m } from '@repo/i18n/client';
import type * as ToolTypes from '../../types/tool.types';

export const TOOL_PREVIEW_KEYS = ['command', 'path', 'query', 'name', 'title', 'text', 'emoji'];

export const TOOL_PATH_KEYS = new Set(['path']);

export const TOOL_CODE_KEYS = new Set(['command', 'content']);

export const TOOL_MCP_NAME = /^mcp_(.+)_[0-9a-f]{24}$/u;

export const TOOL_QUESTION = 'bot_question';

export const TOOL_SECRET = 'bot_secret';

export const TOOL_QUESTIONS = new Set([TOOL_QUESTION, TOOL_SECRET]);

export const TOOL_SUBAGENT = 'bot_subagent';

export const TOOL_PEER_NAMES = new Set(['bot_message', 'bot_ask']);

export const TOOL_ARTIFACT_NAMES = new Set(['bot_artifact_create', 'bot_artifact_update']);

export const TOOL_PRESENTATIONS = new Map<string, ToolTypes.ToolPresentationDefinition>([
  ['bash', { label: m.tool_label_command, icon: 'terminal' }],
  ['read', { label: m.tool_label_read_file, icon: 'file' }],
  ['write', { label: m.tool_label_write_file, icon: 'edit' }],
  ['edit', { label: m.tool_label_edit_file, icon: 'edit' }],
  ['tool_search', { label: m.tool_label_search_tools, icon: 'search' }],
  [TOOL_QUESTION, { label: m.tool_label_ask, icon: 'question' }],
  [TOOL_SECRET, { label: m.tool_label_secret, icon: 'secret' }],
  [TOOL_SUBAGENT, { label: m.tool_label_agent, icon: 'bot' }],
  ['bot_subagent_stop', { label: m.tool_label_agent_stop, icon: 'bot' }],
  ['bot_list', { label: m.tool_label_bot_list, icon: 'bot' }],
  ['bot_get', { label: m.tool_label_bot_get, icon: 'bot' }],
  ['bot_create', { label: m.tool_label_bot_create, icon: 'bot' }],
  ['bot_update', { label: m.tool_label_bot_edit, icon: 'bot' }],
  ['bot_swap_models', { label: m.tool_label_bot_swap_models, icon: 'bot' }],
  ['bot_catalog', { label: m.tool_label_bot_catalog, icon: 'bot' }],
  ['bot_model_list', { label: m.tool_label_model_list, icon: 'model' }],
  ['bot_ask', { label: m.tool_label_ask_bot, icon: 'bot' }],
  ['bot_message', { label: m.tool_label_message_bot, icon: 'bot' }],
  ['bot_react', { label: m.tool_label_react, icon: 'bot' }],
  ['bot_history', { label: m.tool_label_history, icon: 'search' }],
  ['bot_search', { label: m.tool_label_search_history, icon: 'search' }],
  ['bot_routine_list', { label: m.tool_label_routines, icon: 'routine' }],
  ['bot_routine_create', { label: m.tool_label_routine_create, icon: 'routine' }],
  ['bot_routine_update', { label: m.tool_label_routine_update, icon: 'routine' }],
  ['bot_routine_run', { label: m.tool_label_routine_run, icon: 'routine' }],
  ['bot_routine_remove', { label: m.tool_label_routine_remove, icon: 'routine' }],
  ['bot_todo_list', { label: m.tool_label_todos, icon: 'todo' }],
  ['bot_todo_create', { label: m.tool_label_todo_create, icon: 'todo' }],
  ['bot_todo_update', { label: m.tool_label_todo_update, icon: 'todo' }],
  ['bot_todo_remove', { label: m.tool_label_todo_remove, icon: 'todo' }],
  ['bot_artifact_list', { label: m.tool_label_artifacts, icon: 'artifact' }],
  ['bot_artifact_get', { label: m.tool_label_artifact_get, icon: 'artifact' }],
  ['bot_artifact_blocks', { label: m.tool_label_artifact_blocks, icon: 'artifact' }],
  ['bot_artifact_create', { label: m.tool_label_artifact_create, icon: 'artifact' }],
  ['bot_artifact_update', { label: m.tool_label_artifact_update, icon: 'artifact' }],
]);

export const TOOL_ACTIVITY_LABELS = new Map<string, ToolTypes.ToolActivityLabel>([
  ['bash', { plain: m.rooms_activity_tool_command, detail: (detail) => m.rooms_activity_tool_command_detail({ detail }) }],
  ['read', { plain: m.rooms_activity_tool_read, detail: (detail) => m.rooms_activity_tool_read_detail({ detail }) }],
  ['write', { plain: m.rooms_activity_tool_write, detail: (detail) => m.rooms_activity_tool_write_detail({ detail }) }],
  ['edit', { plain: m.rooms_activity_tool_edit, detail: (detail) => m.rooms_activity_tool_edit_detail({ detail }) }],
  ['tool_search', { plain: m.rooms_activity_tool_search_tools }],
  ['bot_history', { plain: m.rooms_activity_tool_history }],
  ['bot_search', { plain: m.rooms_activity_tool_history }],
  ['bot_artifact_create', { plain: m.rooms_activity_tool_artifact, detail: (detail) => m.rooms_activity_tool_artifact_detail({ detail }) }],
  ['bot_artifact_update', { plain: m.rooms_activity_tool_artifact, detail: (detail) => m.rooms_activity_tool_artifact_detail({ detail }) }],
  ['bot_todo_create', { plain: m.rooms_activity_tool_todos }],
  ['bot_todo_update', { plain: m.rooms_activity_tool_todos }],
  ['bot_todo_remove', { plain: m.rooms_activity_tool_todos }],
  ['bot_gif', { plain: m.rooms_activity_tool_gif }],
]);
