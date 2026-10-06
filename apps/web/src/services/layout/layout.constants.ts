import { m } from '@orbs/i18n/client';
import IconBuilding2 from '~icons/lucide/building-2';
import IconKeyRound from '~icons/lucide/key-round';
import IconLogOut from '~icons/lucide/log-out';
import IconSmile from '~icons/lucide/smile';
import type { LayoutUserMenuGroups } from '@/types/layout.types';

export const LAYOUT_USER_MENU_GROUPS: LayoutUserMenuGroups = {
  settings: [
    { icon: IconKeyRound, label: m.rooms_daemon_key, link: '/settings/daemon-key' },
    { icon: IconBuilding2, label: m.settings_organization, link: '/settings/organization' },
    { icon: IconSmile, label: m.layout_avatar_lab, link: '/lab/avatars' },
  ],
  logout: [{ icon: IconLogOut, label: m.layout_log_out, link: '/auth/sign-out' }],
};
