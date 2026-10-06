import { PRIVATE_PATH_REGEX } from './config';
import {
  extractLocaleFromCookie as _extractCookie,
  defineCustomClientStrategy,
  isServer,
  baseLocale as runtimeBaseLocale,
  isLocale as runtimeIsLocale,
} from './paraglide/runtime.js';
import type { Locale } from './paraglide/runtime.js';

export { getLocale, setLocale, isLocale, locales, baseLocale, deLocalizeUrl, localizeUrl, localizeHref, extractLocaleFromCookie, cookieName } from './paraglide/runtime.js';

export type { Locale } from './paraglide/runtime.js';

export { m } from './paraglide/messages.js';

type LocaleSource = string | null | undefined | object;

export function resolveLocale(source: LocaleSource): Locale {
  let locale: unknown;

  if (source instanceof Object) {
    locale = Object.getOwnPropertyDescriptor(source, 'locale')?.value;
  } else if (source) {
    locale = source;
  }

  return runtimeIsLocale(locale) ? locale : runtimeBaseLocale;
}

defineCustomClientStrategy('custom-privateRoute', {
  getLocale: () => {
    if (isServer) {
      return undefined;
    }

    if (PRIVATE_PATH_REGEX.test(window.location.pathname)) {
      return _extractCookie() ?? undefined;
    }

    return undefined;
  },
  setLocale: () => {
    // Cookie strategy handles persistence — nothing to do here
  },
});
