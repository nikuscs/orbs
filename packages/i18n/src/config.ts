/**
 * Shared i18n config for client & server entries (loaded through Vite's bundler).
 *
 * SYNC WARNING: These values are duplicated in entry.vite.ts because that file
 * is loaded by Node's ESM loader before Vite starts (can't resolve .ts imports).
 * If you change LOCALES, PRIVATE_PREFIXES, STRATEGY, or URL_PATTERNS
 * here, you MUST update entry.vite.ts to match.
 *
 * The compiler options (cookie name, strategy, URL patterns) live once in
 * entry.vite.ts as `i18nParaglideOptions`; scripts/compile.js imports them, so
 * the Vite plugin and the standalone compile emit the same runtime. The cookie
 * name is read back via the generated runtime's `cookieName` export.
 */

/** Private route prefixes that share the same URL for all locales. */
export const PRIVATE_PREFIXES = ['dashboard', 'rpc', 'api'] as const;

/** Regex for paths that bypass URL-based locale detection — locale comes from cookie instead. */
export const PRIVATE_PATH_REGEX = new RegExp(`^/(?:${PRIVATE_PREFIXES.join('|')})(?:/|$)`);

/** Supported locales. */
export const LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

/** Default locale. */
export const BASE_LOCALE = 'en';

type LocaleSource = string | null | undefined | object;

export function resolveLocale(source: LocaleSource): Locale {
  let locale: unknown;

  if (source instanceof Object) {
    locale = Object.getOwnPropertyDescriptor(source, 'locale')?.value;
  } else if (source) {
    locale = source;
  }

  return LOCALES.find((supportedLocale) => supportedLocale === locale) ?? BASE_LOCALE;
}

type ParaglideStrategy = 'cookie' | 'baseLocale' | 'globalVariable' | 'url' | 'preferredLanguage' | 'localStorage' | `custom-${string}`;

/** Strategy chain: URL for public paths, then cookie, then browser preference, then base locale fallback. */
export const STRATEGY: ParaglideStrategy[] = ['custom-privateRoute', 'url', 'cookie', 'preferredLanguage', 'baseLocale'];

interface UrlPattern {
  pattern: string;
  localized: [string, string][];
}

/** URL patterns for locale routing. */
export const URL_PATTERNS: UrlPattern[] = [
  // Private routes — no locale prefix, same path for all locales
  ...PRIVATE_PREFIXES.map((prefix) => ({
    pattern: `/${prefix}/:path(.*)?`,
    localized: LOCALES.map((locale): [string, string] => [locale, `/${prefix}/:path(.*)?`]),
  })),
  // Public routes — prefix non-default locale only
  {
    pattern: '/:path(.*)?',
    localized: [
      ['pt', '/pt/:path(.*)?'],
      ['en', '/:path(.*)?'],
    ],
  },
];
