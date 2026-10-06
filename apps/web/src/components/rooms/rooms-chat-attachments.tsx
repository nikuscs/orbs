import { m } from '@orbs/i18n/client';
import { PromptInputAttachment, PromptInputDrawer } from '@/components/ui/ai/prompt-input';
import { InputGroupAddon } from '@/components/ui/input-group';
import type { useRoomAttachments } from '@/hooks/use-room-attachments';

export function RoomsChatAttachments({ files, blindBots }: { files: ReturnType<typeof useRoomAttachments>; blindBots: string | undefined }) {
  if (files.attachments.length === 0) {
    return null;
  }

  const problem = blindBots ? m.rooms_files_blind({ bots: blindBots }) : files.failed && m.rooms_files_failed();

  return (
    <>
      {problem ? (
        <PromptInputDrawer variant="destructive">
          <output className="block px-2 py-1.5 text-xs" role="alert">{problem}</output>
        </PromptInputDrawer>
      ) : null}
      <InputGroupAddon align="block-start">
        <div className="flex flex-wrap gap-1">
          {files.attachments.map((item) => (
            <PromptInputAttachment
              image={item.mediaType.startsWith('image/')}
              key={item.key}
              name={item.name}
              preview={item.preview}
              removeLabel={m.rooms_files_remove()}
              status={item.status}
              onRemove={() => files.remove(item.key)}
            />
          ))}
        </div>
      </InputGroupAddon>
    </>
  );
}
