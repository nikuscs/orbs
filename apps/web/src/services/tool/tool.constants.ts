import { m } from '@orbs/i18n/client';
import type * as ToolTypes from '@/types/tool.types';

export const TOOL_PREVIEW_KEYS = ['command', 'cmd', 'pattern', 'query', 'url', 'path', 'file_path'];

export const TOOL_PATH_KEYS = new Set(['path', 'file_path']);

export const TOOL_COMMAND_KEYS = new Set(['command', 'cmd']);

export const TOOL_NATIVE_PRESENTATIONS = new Map<string, ToolTypes.ToolPresentationDefinition>([
  ['bash', { label: m.tool_label_command, icon: 'terminal' }],
  ['exec_command', { label: m.tool_label_command, icon: 'terminal' }],
  ['write_stdin', { label: m.tool_label_terminal_input, icon: 'terminal' }],
  ['read', { label: m.tool_label_read_file, icon: 'file' }],
  ['write', { label: m.tool_label_write_file, icon: 'edit' }],
  ['edit', { label: m.tool_label_edit_file, icon: 'edit' }],
  ['apply_patch', { label: m.tool_label_edit_file, icon: 'edit' }],
  ['grep', { label: m.tool_label_search_files, icon: 'search' }],
  ['ffgrep', { label: m.tool_label_search_files, icon: 'search' }],
  ['find', { label: m.tool_label_find_files, icon: 'search' }],
  ['fffind', { label: m.tool_label_find_files, icon: 'search' }],
  ['tool_search', { label: m.tool_label_search_tools, icon: 'search' }],
  ['ls', { label: m.tool_label_list_files, icon: 'folder' }],
  ['web_fetch', { label: m.tool_label_read_web, icon: 'web' }],
  ['batch_web_fetch', { label: m.tool_label_read_web, icon: 'web' }],
  ['subagent', { label: m.tool_label_agent, icon: 'bot' }],
  ['todo', { label: m.tool_label_todos, icon: 'todo' }],
  ['ask_user', { label: m.tool_label_ask, icon: 'question' }],
  ['mcp', { label: m.tool_label_mcp, icon: 'mcp' }],
  ['codemode', { label: m.tool_label_code, icon: 'terminal' }],
]);

export const TOOL_INTERNAL_PRESENTATIONS = new Map<string, ToolTypes.ToolPresentationDefinition>([
  ['bot_list', { label: m.tool_label_bot_list, icon: 'bot' }],
  ['bot_get', { label: m.tool_label_bot_get, icon: 'bot' }],
  ['bot_create', { label: m.tool_label_bot_create, icon: 'bot' }],
  ['bot_edit', { label: m.tool_label_bot_edit, icon: 'bot' }],
  ['bot_delete', { label: m.tool_label_bot_delete, icon: 'bot' }],
  ['group_list', { label: m.tool_label_group_list, icon: 'room' }],
  ['group_get', { label: m.tool_label_group_get, icon: 'room' }],
  ['group_create', { label: m.tool_label_group_create, icon: 'room' }],
  ['group_edit', { label: m.tool_label_group_edit, icon: 'room' }],
  ['group_delete', { label: m.tool_label_group_delete, icon: 'room' }],
  ['model_list', { label: m.tool_label_model_list, icon: 'model' }],
]);

export const TOOL_BRANDS = new Map<string, string>([
  ['github', 'GitHub'],
  ['gitlab', 'GitLab'],
  ['mcp_internal', 'Orbs'],
]);
