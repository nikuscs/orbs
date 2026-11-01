import { CHAT, ROOMS } from '@repo/client/client';
import { chatQueries, useRpc } from '@repo/client/react';
import { useChatAttachmentUrl } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { EmptyCompact } from '@repo/ui/empty';
import { FormErrors } from '@repo/ui/forms/form';
import { Item, ItemContent, ItemGroup, ItemLink, ItemMedia, ItemTitle } from '@repo/ui/item';
import { RoomsDetailsSection } from '@repo/ui/rooms/rooms-details-section';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { rpc } from '@/services/rpc/rpc.client';
import IconFileText from '~icons/lucide/file-text';
import IconImages from '~icons/lucide/images';
import type { Attachment } from '@repo/contracts/universal';

interface RoomsDetailsMediaProps {
  botId: string
}

export function RoomsDetailsMedia({ botId }: RoomsDetailsMediaProps) {
  const artifacts = useQuery(rpc.artifacts.listBot.queryOptions({ input: { botId } }));
  const files = useQuery(rpc.attachments.list.queryOptions({ input: { botId } }));
  const weekStart = files.dataUpdatedAt - ROOMS.mediaRecentMs;
  const items = files.data?.items ?? [];

  const sections = [
    { title: m.rooms_media_this_week(), files: items.filter((file) => file.createdAt >= weekStart) },
    { title: m.rooms_media_earlier(), files: items.filter((file) => file.createdAt < weekStart) },
  ].filter((section) => section.files.length > 0);

  if (files.isPending || artifacts.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((key) => <Skeleton className="h-8 w-full" key={key} />)}
      </div>
    );
  }

  if (sections.length === 0 && !artifacts.data?.length) {
    return (
      <EmptyCompact
        description={m.rooms_media_empty_hint()}
        icon={<IconImages />}
        title={m.rooms_media_empty_title()}
      >
        <FormErrors error={files.isError || artifacts.isError ? m.rooms_media_error() : null} />
      </EmptyCompact>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormErrors error={files.isError || artifacts.isError ? m.rooms_media_error() : null} />
      {artifacts.data && artifacts.data.length > 0 ? (
        <RoomsDetailsSection title={m.artifacts_title()}>
          <ItemGroup variant="outline">
            {artifacts.data.map((artifact) => (
              <Item key={artifact.id} size="sm">
                <ItemMedia variant="icon">{artifact.emoji}</ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full">
                    <ItemLink asChild>
                      <Link
                        params={{ botId, conversationId: artifact.conversationId, artifactId: artifact.id }}
                        title={artifact.title}
                        to="/artifacts/$botId/$conversationId/$artifactId"
                      >
                        {artifact.title}
                      </Link>
                    </ItemLink>
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </RoomsDetailsSection>
      ) : null}
      {sections.map((section) => (
        <RoomsDetailsSection key={section.title} title={section.title}>
          <ItemGroup variant="outline">
            {section.files.map((file) => (
              <RoomsDetailsMediaItem
                botId={botId}
                file={file}
                key={file.id}
              />
            ))}
          </ItemGroup>
        </RoomsDetailsSection>
      ))}
    </div>
  );
}

interface RoomsDetailsMediaItemProps {
  botId: string
  file: Attachment
}

function RoomsDetailsMediaItem({ botId, file }: RoomsDetailsMediaItemProps) {
  const rpcs = useRpc();
  const queryClient = useQueryClient();
  const image = file.mediaType.startsWith('image/');
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const isInView = useInView(thumbnailRef, { once: true });
  const url = useChatAttachmentUrl(botId, `${CHAT.attachmentScheme}${file.id}`, image && isInView);

  const download = async () => {
    const link = document.createElement('a');
    link.href = await queryClient.fetchQuery(chatQueries.attachmentUrl(rpcs, { botId, attachmentId: file.id }));
    link.download = file.name;
    link.click();
  };

  return (
    <Item size="sm">
      <ItemMedia variant={image ? 'image' : 'icon'}>
        {image ? (
          <img
            alt=""
            ref={thumbnailRef}
            src={url}
          />
        ) : <IconFileText />}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          {image ? (
            <ItemLink
              href={url}
              rel="noreferrer"
              target="_blank"
              title={file.name}
            >
              {file.name}
            </ItemLink>
          ) : (
            <ItemLink asChild title={file.name}>
              <button
                className="cursor-pointer text-left"
                type="button"
                onClick={() => void download()}
              >
                {file.name}
              </button>
            </ItemLink>
          )}
        </ItemTitle>
      </ItemContent>
    </Item>
  );
}
