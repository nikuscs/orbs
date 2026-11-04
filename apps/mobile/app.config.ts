import { m } from '@repo/i18n/messages';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { version } from './package.json';
import type { ExpoConfig } from 'expo/config';

// One .env at the repo root for every app; shell variables still win.
if (existsSync('../../.env')) {
  process.loadEnvFile('../../.env');
}

const appEnv = z.object({
  APP_VARIANT: z.enum(['development', 'preview', 'production']).default('development'),
  APP_NAME: z.string().trim().min(1).default('Orbs'),
  MOBILE_BUNDLE_ID: z.string().trim().min(1).default('app.openbots.mobile'),
  MOBILE_SCHEME: z.string().trim().min(1).default('orbs'),
  MOBILE_APPLE_TEAM_ID: z.string().trim().min(1).optional(),
  MOBILE_EAS_SLUG: z.string().trim().min(1).default('orbs'),
  MOBILE_EAS_OWNER: z.string().trim().min(1).optional(),
  MOBILE_EAS_PROJECT_ID: z.uuid().optional(),
}).parse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')));

const name = appEnv.APP_NAME;

const VARIANTS = {
  development: { name: `${name} Dev`, suffix: '-dev', bundleSuffix: '.dev' },
  preview: { name: `${name} Preview`, suffix: '-preview', bundleSuffix: '.preview' },
  production: { name, suffix: '', bundleSuffix: '' },
} satisfies Record<typeof appEnv.APP_VARIANT, { name: string; suffix: string; bundleSuffix: string }>;

const INTER_WEIGHTS = [
  { file: '300Light/Inter_300Light.ttf', weight: 300 },
  { file: '400Regular/Inter_400Regular.ttf', weight: 400 },
  { file: '500Medium/Inter_500Medium.ttf', weight: 500 },
  { file: '600SemiBold/Inter_600SemiBold.ttf', weight: 600 },
  { file: '700Bold/Inter_700Bold.ttf', weight: 700 },
  { file: '400Regular_Italic/Inter_400Regular_Italic.ttf', weight: 400, style: 'italic' },
  { file: '700Bold_Italic/Inter_700Bold_Italic.ttf', weight: 700, style: 'italic' },
];

const interPath = (file: string) => `./node_modules/@expo-google-fonts/inter/${file}`;

const variant = VARIANTS[appEnv.APP_VARIANT];
const bundleIdentifier = `${appEnv.MOBILE_BUNDLE_ID}${variant.bundleSuffix}`;

export default (): ExpoConfig => ({
  name: variant.name,
  slug: appEnv.MOBILE_EAS_SLUG,
  scheme: `${appEnv.MOBILE_SCHEME}${variant.suffix}`,
  version,
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier,
    appleTeamId: appEnv.MOBILE_APPLE_TEAM_ID,
    icon: './assets/orbs.icon',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocalNetworkUsageDescription: m.mobile_local_network_permission({ name }),
    },
  },
  android: {
    package: bundleIdentifier,
  },
  experiments: { typedRoutes: true, reactCompiler: true },
  owner: appEnv.MOBILE_EAS_OWNER,
  extra: {
    appName: name,
    eas: {
      projectId: appEnv.MOBILE_EAS_PROJECT_ID,
      // EAS signs only targets it knows about; the notification extension plugin does not register its own.
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: 'NotificationServiceExtension',
                bundleIdentifier: `${bundleIdentifier}.NotificationServiceExtension`,
                entitlements: { 'com.apple.security.application-groups': [`group.${bundleIdentifier}`] },
              },
            ],
          },
        },
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    '@pierrecapo/expo-notification-service-extension',
    ['expo-camera', { cameraPermission: m.mobile_camera_permission({ name }), microphonePermission: false, recordAudioAndroid: false }],
    ['expo-image-picker', { photosPermission: m.mobile_photos_permission({ name }), cameraPermission: m.mobile_camera_permission({ name }), microphonePermission: false }],
    [
      'expo-font',
      {
        ios: { fonts: INTER_WEIGHTS.map(({ file }) => interPath(file)) },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: INTER_WEIGHTS.map(({ file, weight, style }) => ({ path: interPath(file), weight, style })),
            },
          ],
        },
      },
    ],
  ],
});
