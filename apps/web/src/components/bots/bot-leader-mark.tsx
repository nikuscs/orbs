import { m } from '@orbs/i18n/client';
import IconCrown from '~icons/lucide/crown';

export function BotLeaderMark() {
  return (
    <span className="inline-flex shrink-0" title={m.rooms_leader()}>
      <IconCrown aria-hidden="true" className="size-2.5 text-muted-foreground/70" />
      <span className="sr-only">{m.rooms_leader()}</span>
    </span>
  );
}
