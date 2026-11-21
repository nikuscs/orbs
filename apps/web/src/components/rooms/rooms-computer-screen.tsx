import { m } from '@repo/i18n/client';
import { Badge } from '@repo/ui/badge';
import { cn } from '@repo/ui/cn';
import IconMonitor from '~icons/lucide/monitor';
import type { ComputerThumbnail } from '@repo/contracts/universal';

interface RoomsComputerScreenProps {
  thumbnail: ComputerThumbnail | null
  isDimmed: boolean
  label: string | null
}

export function RoomsComputerScreen({ thumbnail, isDimmed, label }: RoomsComputerScreenProps) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border bg-muted">
      {thumbnail ? (
        <img
          alt={m.rooms_computer_screen()}
          className={cn('size-full object-cover', isDimmed && 'opacity-40')}
          src={`data:${thumbnail.mimeType};base64,${thumbnail.data}`}
        />
      ) : (
        <div className="flex-center size-full flex-col gap-2 text-muted-foreground/70">
          <IconMonitor className="size-8" />
          <span className="text-xs">{m.rooms_computer_empty()}</span>
        </div>
      )}
      {label ? (
        <Badge className="absolute bottom-2 left-2" variant="secondary">{label}</Badge>
      ) : null}
    </div>
  );
}
