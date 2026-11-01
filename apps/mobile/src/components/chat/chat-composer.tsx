import { chatResetCommand, mentionLinks, mentionQuery, mentionSegments, roomsMessageText } from '@repo/client/client';
import { useChatAttachmentsNative } from '@repo/client/native';
import { useChatSend } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { ArrowUp, Plus, Square } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { match } from 'ts-pattern';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { PromptAttachment, PromptAttachments, PromptDock, PromptDrawer, PromptJump, PromptQuote } from '@/components/ui/prompt-drawer';
import { PromptField, PromptMention } from '@/components/ui/prompt-field';
import { Text } from '@/components/ui/text';
import { useToast } from '@/hooks/use-toast';
import { ChatMentions } from './chat-mentions';
import { ChatQueue } from './chat-queue';
import type { RpcSession } from '@/types/rpc.types';
import type * as ClientTypes from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';
import type { Dispatch, SetStateAction } from 'react';
import type { LayoutChangeEvent } from 'react-native';

interface ChatComposerProps {
  session: RpcSession;
  bot: Bot;
  bots: Bot[];
  conversationId: number;
  latestEntryId: number;
  queued: ClientTypes.ChatQueued[];
  quote?: ClientTypes.MentionItem;
  prefill?: string;
  isBusy: boolean;
  replyTo: ClientTypes.ChatMessage | null;
  unread: number;
  onUnreadPress: () => void;
  onReplyClear: () => void;
  onOutgoingChange: Dispatch<SetStateAction<ClientTypes.ChatOutgoing[]>>;
  onSend: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

export function ChatComposer({
  session,
  bot,
  bots,
  conversationId,
  latestEntryId,
  queued,
  quote,
  prefill,
  isBusy,
  replyTo,
  unread,
  onUnreadPress,
  onReplyClear,
  onOutgoingChange,
  onSend,
  onLayout,
}: ChatComposerProps) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<ClientTypes.MentionItem[]>([]);
  const quoteKey = quote ? `${quote.href} ${quote.label}` : undefined;
  const [quotedKey, setQuotedKey] = useState<string>();
  const [prefilled, setPrefilled] = useState<string>();
  const files = useChatAttachmentsNative({ botId: bot.id, onProblem: (message) => toast.show({ message }) });

  const chat = useChatSend({
    botId: bot.id,
    conversationId,
    latestEntryId,
    onOutgoingChange,
    onResetDone: () => {
      setText('');
      setPicked([]);
    },
  });

  if (quoteKey !== quotedKey) {
    setQuotedKey(quoteKey);

    if (quote) {
      setText(`${text.trimEnd()}${text.trim() ? ' ' : ''}${quote.label} `);
      setPicked([...picked, quote]);
    }
  }

  if (prefill !== prefilled) {
    setPrefilled(prefill);

    if (prefill && !text.trim()) {
      setText(prefill);
      setCursor(prefill.length);
    }
  }

  const content = text.trim();
  const query = mentionQuery({ text, cursor });
  const hasFiles = files.readyIds.length > 0;
  const isStopping = isBusy && !content && files.attachments.length === 0;
  const isSendingFiles = chat.isSending && hasFiles;
  const canSend = (content !== '' || hasFiles) && !files.uploading && !isSendingFiles;

  const stopIcon = (
    <Icon
      fill="currentColor"
      icon={Square}
      size="sm"
    />
  );

  const action = match(isStopping)
    .with(true, () => ({ label: m.rooms_chat_stop(), icon: stopIcon }))
    .with(false, () => ({ label: m.rooms_chat_send(), icon: <Icon icon={ArrowUp} /> }))
    .exhaustive();

  function pick(item: ClientTypes.MentionItem) {
    const start = query?.start ?? cursor;
    const next = `${text.slice(0, start)}${item.label} ${text.slice(cursor)}`;

    setText(next);
    setCursor(start + item.label.length + 1);
    setPicked((items) => [...items, item]);
  }

  async function send() {
    const attachmentIds = files.readyIds;
    const replyToEntryId = replyTo?.metadata?.entryId;
    const draft = { text, picked };

    const restore = () => {
      setText((current) => current || draft.text);
      setPicked((items) => (items.length > 0 ? items : draft.picked));
    };

    const linked = mentionLinks({ text: content, items: picked });
    const reset = chatResetCommand(linked);

    if (reset) {
      router.push({ pathname: '/chat/[botId]/reset', params: { botId: bot.id, ...reset } });

      return;
    }

    setText('');
    setPicked([]);

    await chat.send({
      text: mentionLinks({ text: content, items: picked }),
      attachmentIds,
      replyToEntryId,
    }).then((result) => match(result)
      .with({ kind: 'sent' }, () => {
        files.clear(attachmentIds);
        onReplyClear();
        onSend();
      })
      .otherwise(() => undefined), restore);
  }

  function handlePress() {
    match({ isStopping, canSend })
      .with({ isStopping: true }, chat.stop)
      .with({ canSend: false }, () => undefined)
      .otherwise(() => void send());
  }

  const hasDrawer = queued.length > 0 || replyTo !== null || chat.problem !== null;

  const drawer = (
    <>
      {unread > 0 ? <PromptJump onPress={onUnreadPress}>{m.mobile_chat_unread({ count: unread })}</PromptJump> : null}
      {query ? (
        <ChatMentions
          bot={bot}
          bots={bots}
          query={query}
          session={session}
          onPick={pick}
        />
      ) : null}
      {hasDrawer ? (
        <PromptDrawer>
          {chat.problem ? (
            <Text
              accessibilityRole="alert"
              className="mx-2 my-1"
              tone="destructive"
              variant="small"
            >
              {chat.problem}
            </Text>
          ) : null}
          <ChatQueue
            botId={bot.id}
            botName={bot.name}
            conversationId={conversationId}
            queued={queued}
            onOutgoingChange={onOutgoingChange}
          />
          {replyTo ? (
            <PromptQuote removeLabel={m.rooms_chat_reply_clear()} onRemove={onReplyClear}>
              {m.rooms_chat_replying({ name: replyTo.metadata?.authorName ?? '', text: roomsMessageText(replyTo) })}
            </PromptQuote>
          ) : null}
        </PromptDrawer>
      ) : null}
    </>
  );

  const attachments = files.attachments.length > 0 ? (
    <PromptAttachments>
      {files.attachments.map((item) => (
        <PromptAttachment
          key={item.key}
          name={item.name}
          preview={item.preview || undefined}
          removeLabel={m.rooms_files_remove()}
          retryLabel={m.mobile_chat_attach_retry()}
          status={item.status}
          onRemove={() => files.remove(item.key)}
          onRetry={() => files.retry(item.key)}
        />
      ))}
    </PromptAttachments>
  ) : null;

  return (
    <PromptDock drawer={drawer} onLayout={onLayout}>
      <View className="flex-1">
        <PromptField
          accessibilityLabel={m.rooms_chat_placeholder({ bot: bot.name })}
          actions={(
            <Button
              accessibilityLabel={action.label}
              disabled={!isStopping && !canSend}
              size="icon-sm"
              variant="default"
              onPress={handlePress}
            >
              {action.icon}
            </Button>
          )}
          header={attachments}
          isEmpty={text === ''}
          leading={(
            <Menu
              isDisabled={files.isFull}
              items={[
                { label: m.mobile_chat_attach_photos(), systemImage: 'photo', onSelect: () => void files.pickPhotos() },
                { label: m.mobile_chat_attach_camera(), systemImage: 'camera', onSelect: () => void files.takePhoto() },
                { label: m.mobile_chat_attach_files(), systemImage: 'folder', onSelect: () => void files.pickFiles() },
              ]}
            >
              <Button
                accessibilityLabel={m.rooms_chat_attach()}
                className="border border-black/8 dark:border-white/12"
                disabled={files.isFull}
                size="icon-sm"
                variant="secondary"
              >
                <Icon icon={Plus} />
              </Button>
            </Menu>
          )}
          placeholder={m.rooms_chat_placeholder({ bot: bot.name })}
          onChangeText={setText}
          onSelectionChange={(event) => setCursor(event.nativeEvent.selection.end)}
        >
          {mentionSegments({ text: mentionLinks({ text, items: picked }) }).map((segment, index) => match(segment)
            .with({ kind: 'pill' }, ({ item }) => <PromptMention key={index}>{item.label}</PromptMention>)
            .otherwise((part) => part.text))}
        </PromptField>
      </View>
    </PromptDock>
  );
}
