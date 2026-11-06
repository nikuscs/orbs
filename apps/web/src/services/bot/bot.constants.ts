import { m } from '@repo/i18n/client';
import IconCalendarClock from '~icons/lucide/calendar-clock';
import IconCpu from '~icons/lucide/cpu';
import IconListTodo from '~icons/lucide/list-todo';
import IconPlug from '~icons/lucide/plug';
import IconScrollText from '~icons/lucide/scroll-text';
import IconSparkles from '~icons/lucide/sparkles';
import IconTriangleAlert from '~icons/lucide/triangle-alert';
import IconUserRound from '~icons/lucide/user-round';
import IconWrench from '~icons/lucide/wrench';
import type { BotNavItem } from '@/types/bot.types';
import type { BotForm, BotSection } from '@repo/contracts/universal';

export const BOT_NAV: BotNavItem[] = [
  { id: 'profile', label: m.bots_profile, description: m.bots_profile_hint, icon: IconUserRound },
  { id: 'instructions', label: m.rooms_bot_instructions, description: m.bots_instructions_hint, icon: IconScrollText },
  { id: 'model', label: m.rooms_bot_model, description: m.bots_model_hint, icon: IconCpu },
  { id: 'tools', label: m.bots_tools, description: m.bots_tools_hint, icon: IconWrench },
  { id: 'skills', label: m.bots_skills, description: m.bots_skills_section_hint, icon: IconSparkles },
  { id: 'mcp', label: m.bots_mcp, description: m.bots_mcp_hint, icon: IconPlug },
  { id: 'todos', label: m.rooms_todos, description: m.bots_todos_hint, icon: IconListTodo },
  { id: 'routines', label: m.rooms_routines, description: m.bots_routines_hint, icon: IconCalendarClock },
  { id: 'danger', label: m.bots_danger, description: m.bots_danger_hint, icon: IconTriangleAlert },
];

export const BOT_FORM_SECTIONS = {
  avatar: 'profile',
  name: 'profile',
  handle: 'profile',
  instructions: 'instructions',
  modelProvider: 'model',
  modelId: 'model',
  thinkingLevel: 'model',
  fallbackModel: 'model',
  permission: 'tools',
  inherit: 'tools',
  sharedSkills: 'skills',
  sharedMcp: 'mcp',
  disabledSkills: 'skills',
} satisfies Record<keyof BotForm, BotSection>;
