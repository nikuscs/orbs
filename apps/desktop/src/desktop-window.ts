import { CString } from 'bun:ffi';
import { desktopClass, desktopSelector, desktopSend, desktopString } from './desktop-objc';
import { DESKTOP } from './desktop.constants';
import type { DesktopTheme } from './types/desktop.types';
import type { Pointer } from 'bun:ffi';

const desktopAppearances = { light: 'NSAppearanceNameAqua', dark: 'NSAppearanceNameDarkAqua' } satisfies Record<DesktopTheme, string>;

// Mirrors System Settings > Desktop & Dock > "Double-click a window's title bar to".
const desktopTitleBarActions: Record<string, string | null> = { Minimize: 'miniaturize:', None: null };

function desktopWindowSet(window: Pointer, setter: string, value: ReturnType<typeof desktopString>): void {
  desktopSend.main(window, desktopSelector('performSelectorOnMainThread:withObject:waitUntilDone:'), desktopSelector(setter), value, true);
}

export function desktopWindowToolbar(window: Pointer): void {
  if (DESKTOP.platform !== 'macos') {
    return;
  }

  const toolbar = desktopSend.one(desktopSend.none(desktopClass('NSToolbar'), desktopSelector('alloc')), desktopSelector('initWithIdentifier:'), desktopString('main'));

  desktopWindowSet(window, 'setToolbar:', toolbar);
}

export function desktopWindowAppearance(window: Pointer, theme: DesktopTheme): void {
  if (DESKTOP.platform !== 'macos') {
    return;
  }

  const appearance = desktopSend.one(desktopClass('NSAppearance'), desktopSelector('appearanceNamed:'), desktopString(desktopAppearances[theme]));

  desktopWindowSet(window, 'setAppearance:', appearance);
}

export function desktopWindowTitleBarDoubleClick(window: Pointer): void {
  if (DESKTOP.platform !== 'macos') {
    return;
  }

  const defaults = desktopSend.none(desktopClass('NSUserDefaults'), desktopSelector('standardUserDefaults'));
  const preference = desktopSend.one(defaults, desktopSelector('stringForKey:'), desktopString('AppleActionOnDoubleClick'));
  const action = preference ? new CString(desktopSend.none(preference, desktopSelector('UTF8String'))).toString() : '';
  const selector = Object.hasOwn(desktopTitleBarActions, action) ? desktopTitleBarActions[action] : 'zoom:';

  if (selector) {
    desktopWindowSet(window, selector, null);
  }
}
