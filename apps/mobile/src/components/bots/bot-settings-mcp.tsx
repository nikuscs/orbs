import { useBotMcp } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LogIn, LogOut, Plug, Plus, Server, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { LabelDescription } from '@/components/ui/label';
import { Menu } from '@/components/ui/menu';
import { StatusDot } from '@/components/ui/status-dot';
import { Text } from '@/components/ui/text';
import type { RpcSession } from '@/types/rpc.types';
import type { Bot } from '@repo/contracts/universal';

interface BotSettingsMcpProps {
  bot: Bot;
  session: RpcSession;
}

export function BotSettingsMcp({ bot, session }: BotSettingsMcpProps) {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState('');

  const mcp = useBotMcp({
    bot,
    login: () => {
      const returnUrl = Linking.createURL('mcp/done');

      return {
        redirectUrl: new URL('/mcp/callback', session.address().url).toString(),
        returnUrl,
        open: async (url) => {
          await WebBrowser.openAuthSessionAsync(url, returnUrl);
        },
      };
    },
  });

  return (
    <BotDetailsSection
      icon={Plug}
      title={m.bots_mcp()}
    >
      <ItemGroup>
        {mcp.isEmpty ? (
          <Item>
            <ItemContent>
              <ItemDescription numberOfLines={0}>{m.bots_mcp_empty()}</ItemDescription>
            </ItemContent>
          </Item>
        ) : null}
        {mcp.rows.map((row) => ({ ...row, status: mcp.status(row) })).map(({ name, server, isShared, isOn, status }) => (
          <Item key={name}>
            <ItemMedia className="mt-1 self-start">
              <Icon icon={Server} tone="muted" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle numberOfLines={1}>{name}</ItemTitle>
              <View className="flex-row items-center gap-1.5">
                <StatusDot label={status.label} variant={status.tone} />
                <Text tone="muted" variant="chat-status">
                  {status.label}
                  {server && server.tools.length > 0 ? ` · ${m.bots_mcp_tools({ count: String(server.tools.length) })}` : null}
                </Text>
              </View>
            </ItemContent>
            {mcp.pending === name ? (
              <Button
                accessibilityLabel={m.bots_mcp_cancel()}
                disabled={mcp.isBusy}
                size="icon-sm"
                variant="ghost"
                onPress={mcp.cancel}
              >
                <Icon icon={X} size="sm" />
              </Button>
            ) : null}
            {server && mcp.pending !== name && server.auth === 'required' ? (
              <Button
                accessibilityLabel={m.bots_mcp_login()}
                disabled={mcp.isBusy || mcp.pending !== null}
                size="sm"
                variant="outline"
                onPress={() => mcp.connect(name)}
              >
                <Icon icon={LogIn} size="sm" />
                {m.bots_mcp_login()}
              </Button>
            ) : null}
            {server?.auth === 'authorized' ? (
              <Button
                accessibilityLabel={m.bots_mcp_logout()}
                disabled={mcp.isBusy}
                size="icon-sm"
                variant="ghost"
                onPress={() => mcp.logout(name)}
              >
                <Icon icon={LogOut} size="sm" />
              </Button>
            ) : null}
            {server?.isOwned ? (
              <Button
                accessibilityLabel={m.bots_mcp_remove()}
                size="icon-sm"
                variant="ghost"
                onPress={() => router.push({ pathname: '/bots/[botId]/mcp/[server]/remove', params: { botId: bot.id, server: name } })}
              >
                <Icon icon={Trash2} size="sm" />
              </Button>
            ) : null}
            {isShared ? (
              <Switch
                accessibilityLabel={m.bots_mcp_use({ server: name })}
                disabled={mcp.isBusy}
                value={isOn}
                onValueChange={(value) => mcp.toggle(name, value)}
              />
            ) : null}
          </Item>
        ))}
      </ItemGroup>
      {mcp.presets.length > 0 ? (
        <Menu
          isDisabled={mcp.adding !== null}
          items={mcp.presets.map((preset) => ({ label: preset.title, onSelect: () => mcp.add(preset) }))}
          title={m.bots_mcp_add()}
        >
          <Button size="sm" variant="outline">
            <Icon icon={Plus} size="sm" />
            {m.bots_mcp_add()}
          </Button>
        </Menu>
      ) : null}
      {mcp.pending ? (
        <View className="gap-2">
          <Text variant="label">{m.bots_mcp_paste_label()}</Text>
          <LabelDescription>{m.bots_mcp_paste_hint()}</LabelDescription>
          <Input
            accessibilityLabel={m.bots_mcp_paste_label()}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={m.bots_mcp_paste_placeholder()}
            value={callbackUrl}
            onChangeText={setCallbackUrl}
          />
          <Button
            disabled={mcp.isBusy || callbackUrl.trim() === ''}
            size="sm"
            onPress={() => mcp.paste(callbackUrl.trim())}
          >
            {m.bots_mcp_paste_submit()}
          </Button>
        </View>
      ) : null}
      {mcp.problem ? <LabelDescription accessibilityRole="alert" variant="error">{mcp.problem}</LabelDescription> : null}
    </BotDetailsSection>
  );
}
