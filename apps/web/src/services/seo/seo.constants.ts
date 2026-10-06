import type { TanstackMetadata } from '@orbs/tanstack-helpers/universal';

const SEO_APP_NAME = 'Orbs';

export const SEO_METADATA_DEFAULTS: TanstackMetadata = {
  charSet: 'utf-8',
  title: SEO_APP_NAME,
  titleTemplate: `%s | ${SEO_APP_NAME}`,
  viewport: {
    width: 'device-width',
    'initial-scale': '1',
  },
  themeColor: '#ffffff',
  applicationName: SEO_APP_NAME,
  openGraph: {
    type: 'website',
    siteName: SEO_APP_NAME,
  },
};

export const SEO_PUBLIC_PATHS = [] as const;

export const SEO_DISALLOWED_PATHS = ['/api/', '/rpc/', '/auth', '/t/'] as const;
