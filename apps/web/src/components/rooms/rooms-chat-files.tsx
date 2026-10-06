import { Button } from '@/components/ui/button';
import IconLucideFileText from '~icons/lucide/file-text';
import type { RoomsFilePart } from '@/types/rooms.types';

export function RoomsChatFiles({ files }: { files: RoomsFilePart[] }) {
  const images = files.filter((file) => file.mediaType.startsWith('image/'));
  const documents = files.filter((file) => !file.mediaType.startsWith('image/'));

  return (
    <div className="flex flex-col items-end gap-1 group-data-[role=assistant]:items-start">
      {images.map((file) => (
        <a
          href={file.url}
          key={file.url}
          rel="noreferrer"
          target="_blank"
        >
          <img
            alt={file.filename ?? ''}
            className="max-h-64 rounded-xl object-cover"
            loading="lazy"
            src={file.url}
          />
        </a>
      ))}
      {documents.map((file) => (
        <Button
          asChild
          key={file.url}
          size="sm"
          variant="outline"
        >
          <a download={file.filename} href={file.url}>
            <IconLucideFileText className="size-4 text-muted-foreground" />
            <span className="max-w-56 truncate">{file.filename}</span>
          </a>
        </Button>
      ))}
    </div>
  );
}
