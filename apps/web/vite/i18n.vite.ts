import { createI18nPlugin as createI18nPluginBase } from '@orbs/i18n/vite';
import { resolve } from 'node:path';

export function createI18nPlugin(dirname: string) {
  return createI18nPluginBase({
    project: resolve(dirname, '../../packages/i18n/project.inlang'),
    outdir: resolve(dirname, '../../packages/i18n/src/paraglide'),
  });
}
