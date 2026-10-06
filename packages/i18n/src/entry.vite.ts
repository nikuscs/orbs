import { paraglideVitePlugin } from '@inlang/paraglide-js';

/**
 * SYNC WARNING: These values are duplicated from config.ts because this file
 * is loaded by Node's ESM loader before Vite starts (can't resolve .ts imports).
 * If you change these, you MUST update config.ts to match.
 */
const PRIVATE_PREFIXES = ['dashboard', 'rpc', 'api'] as const;
const LOCALES = ['en', 'pt'] as const;

export const i18nParaglideOptions = {
  outputStructure: 'locale-modules',
  cookieName: 'orbs.locale',
  strategy: ['custom-privateRoute', 'url', 'cookie', 'preferredLanguage', 'baseLocale'],
  urlPatterns: [
    ...PRIVATE_PREFIXES.map((prefix) => ({
      pattern: `/${prefix}/:path(.*)?`,
      localized: LOCALES.map((locale): [string, string] => [locale, `/${prefix}/:path(.*)?`]),
    })),
    {
      pattern: '/:path(.*)?',
      localized: [
        ['pt', '/pt/:path(.*)?'],
        ['en', '/:path(.*)?'],
      ],
    },
  ],
} satisfies Omit<Parameters<typeof paraglideVitePlugin>[0], 'outdir' | 'project'>;

export function createI18nPlugin(options: { project: string; outdir: string }) {
  return paraglideVitePlugin({
    ...i18nParaglideOptions,
    project: options.project,
    outdir: options.outdir,
  });
}
