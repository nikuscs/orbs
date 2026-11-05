import { useBotMcp } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { LogIn, LogOut, Plug, Server, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { BotDetailsSection } from '@/components/bots/bot-details-section';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item';
import { LabelDescription } from '@/components/ui/label';
import { StatusDot } from '@/components/ui/status-dot';
import { Text } from '@/components/ui/text';
import type { RpcSession } from '@/types/rpc.types';
import type { Bot } from '@repo/contracts/universal';

interface BotSettingsMcpProps {
  bot: Bot;
  session: RpcSession;
}

export function BotSettingsMcp({ bot, session }: BotSettingsMcpProps) {
  const [callbackUrl, setCallbackUrl] = useState('');

  const mcp = useBotMcp({
    botId: bot.id,
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
        {mcp.servers.map((server) => (
          <Item key={server.name}>
            <ItemMedia className="mt-1 self-start">
              <Icon icon={Server} tone="muted" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle numberOfLines={1}>{server.name}</ItemTitle>
              <View className="flex-row items-center gap-1.5">
                <StatusDot label={mcp.status(server).label} variant={mcp.status(server).tone} />
                <Text tone="muted" variant="chat-status">
                  {mcp.status(server).label}
                  {server.tools.length > 0 ? ` · ${m.bots_mcp_tools({ count: String(server.tools.length) })}` : null}
                </Text>
              </View>
            </ItemContent>
            {mcp.pending === server.name ? (
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
            {mcp.pending !== server.name && server.auth === 'required' ? (
              <Button
                accessibilityLabel={m.bots_mcp_login()}
                disabled={mcp.isBusy || mcp.pending !== null}
                size="sm"
                variant="outline"
                onPress={() => mcp.connect(server.name)}
              >
                <Icon icon={LogIn} size="sm" />
                {m.bots_mcp_login()}
              </Button>
            ) : null}
            {server.auth === 'authorized' ? (
              <Button
                accessibilityLabel={m.bots_mcp_logout()}
                disabled={mcp.isBusy}
                size="icon-sm"
                variant="ghost"
                onPress={() => mcp.logout(server.name)}
              >
                <Icon icon={LogOut} size="sm" />
              </Button>
            ) : null}
          </Item>
        ))}
      </ItemGroup>
      <View className="gap-1.5">
        <Text
          className="px-3"
          tone="muted"
          variant="small"
        >
          {m.bots_mcp_available()}
        </Text>
        <ItemGroup>
          {mcp.presets.map((preset) => (
            <Item key={preset.name}>
              <ItemMedia className="mt-1 self-start">
                <Icon icon={Server} tone="muted" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle numberOfLines={1}>{preset.title}</ItemTitle>
                <ItemDescription numberOfLines={0}>{preset.description}</ItemDescription>
                <Button
                  accessibilityRole="link"
                  className="self-start"
                  size="inline"
                  variant="link-muted"
                  onPress={() => void Linking.openURL(preset.documentation)}
                >
                  {m.bots_mcp_docs()}
                </Button>
              </ItemContent>
              <Button
                disabled={preset.isAdded || mcp.adding !== null}
                loading={mcp.adding === preset.name}
                size="sm"
                variant={preset.isAdded ? 'secondary' : 'outline'}
                onPress={() => mcp.add(preset)}
              >
                {preset.isAdded ? m.bots_mcp_added() : m.bots_mcp_add()}
              </Button>
            </Item>
          ))}
        </ItemGroup>
      </View>
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
