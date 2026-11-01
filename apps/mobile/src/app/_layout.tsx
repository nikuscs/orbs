import { m } from '@repo/i18n/client';
import { bootZodErrors } from '@repo/i18n/validation';
import { Stack, ThemeProvider } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Uniwind } from 'uniwind';
import { ContextAppearance } from '@/components/context/context-appearance';
import { ContextConnection } from '@/components/context/context-connection';
import { ContextToast } from '@/components/context/context-toast';
import { useConnectionIsConnected } from '@/hooks/use-connection';
import { useNavigationTheme } from '@/hooks/use-navigation-theme';
import { useOnboardingGate } from '@/hooks/use-onboarding-gate';
import { usePush, usePushPresence } from '@/hooks/use-push';
import { appearanceRead } from '@/services/appearance/appearance.client';
import '@/application/styles.css';

bootZodErrors();
Uniwind.setTheme(appearanceRead());

export const unstable_settings = { anchor: 'index' };

const SHEET = { presentation: 'formSheet', sheetGrabberVisible: true, sheetCornerRadius: 32 } as const;
const SHEET_FIT = { ...SHEET, sheetAllowedDetents: 'fitToContents' } as const;
const DIALOG = { presentation: 'transparentModal', animation: 'fade' } as const;

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <ContextAppearance>
        <RootLayoutTheme />
      </ContextAppearance>
    </KeyboardProvider>
  );
}

function RootLayoutTheme() {
  const theme = useNavigationTheme();

  return (
    <ThemeProvider value={theme}>
      <ContextToast>
        <ContextConnection>
          <RootLayoutStack />
        </ContextConnection>
      </ContextToast>
    </ThemeProvider>
  );
}

function RootLayoutConnected() {
  usePushPresence();
  useOnboardingGate();

  return null;
}

function RootLayoutStack() {
  const isConnected = useConnectionIsConnected();
  usePush();

  return (
    <>
      {isConnected ? <RootLayoutConnected /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isConnected}>
          <Stack.Screen name="index" />
          <Stack.Screen name="chat/[botId]/index" />
          <Stack.Screen name="chat/[botId]/with/[peerId]/index" />
          <Stack.Screen name="chat/[botId]/subagent/[conversationId]/index" />
          <Stack.Screen name="chat/[botId]/message" options={SHEET_FIT} />
          <Stack.Screen name="chat/[botId]/react" options={{ ...SHEET, sheetAllowedDetents: [0.6, 1] }} />
          <Stack.Screen name="chat/[botId]/text" options={{ ...SHEET, sheetAllowedDetents: [0.9] }} />
          <Stack.Screen name="chat/[botId]/context" options={SHEET_FIT} />
          <Stack.Screen name="chat/[botId]/reset" options={DIALOG} />
          <Stack.Screen name="chat/[botId]/html" />
          <Stack.Screen name="settings/index" options={{ headerShown: true, title: m.settings_title(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/models/swap" options={{ headerShown: true, title: m.settings_models_replace(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/themes/create" options={{ headerShown: true, title: m.settings_theme_add(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/devices/pair" options={{ headerShown: true, title: m.settings_devices_pair(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/devices/scan" options={{ headerShown: true, title: m.mobile_scan_title(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/devices/[deviceId]/revoke" options={DIALOG} />
          <Stack.Screen name="settings/server/address" options={{ headerShown: true, title: m.mobile_address_title(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="settings/providers/[providerId]/logout" options={DIALOG} />
          <Stack.Screen name="bots/create" options={{ headerShown: true, title: m.rooms_bot_title(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/create/emoji" options={{ ...SHEET, sheetAllowedDetents: [0.6, 1] }} />
          <Stack.Screen name="bots/[botId]/details" options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/todos/index" options={{ headerShown: true, title: m.rooms_todos(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/routines/index" options={{ headerShown: true, title: m.rooms_routines(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/media/index" options={{ headerShown: true, title: m.rooms_tab_media(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/media/[attachmentId]/index" options={DIALOG} />
          <Stack.Screen name="bots/[botId]/edit" options={{ headerShown: true, title: m.rooms_action_edit_bot(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/skills" options={{ headerShown: true, title: m.bots_skills(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/mcp" options={{ headerShown: true, title: m.bots_mcp(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/edit/emoji" options={{ ...SHEET, sheetAllowedDetents: [0.6, 1] }} />
          <Stack.Screen name="bots/[botId]/delete" options={DIALOG} />
          <Stack.Screen name="bots/[botId]/todos/[todoId]/delete" options={DIALOG} />
          <Stack.Screen name="bots/[botId]/routines/[routineId]/edit" options={{ headerShown: true, title: m.rooms_routines_edit(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/routines/[routineId]/delete" options={DIALOG} />
          <Stack.Screen name="sections/create" options={SHEET_FIT} />
          <Stack.Screen name="sections/[sectionId]/rename" options={SHEET_FIT} />
          <Stack.Screen name="sections/[sectionId]/delete" options={DIALOG} />
          <Stack.Screen name="onboarding/[step]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="onboarding/emoji" options={{ ...SHEET, sheetAllowedDetents: [0.6, 1] }} />
          <Stack.Screen name="artifacts/index" options={{ headerShown: true, title: m.artifacts_title(), headerBackButtonDisplayMode: 'minimal' }} />
          <Stack.Screen name="bots/[botId]/artifacts/[artifactId]/index" options={{ headerShown: true, title: m.artifacts_title(), headerBackButtonDisplayMode: 'minimal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isConnected}>
          <Stack.Screen name="connect" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
