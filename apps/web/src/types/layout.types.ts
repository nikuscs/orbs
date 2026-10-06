import type { ComponentType } from 'react';

export interface LayoutUserMenuItem {
  label: () => string
  icon: ComponentType<{ className?: string }>
  link?: string
}

export interface LayoutUserMenuGroups {
  settings: LayoutUserMenuItem[]
  logout: LayoutUserMenuItem[]
}
