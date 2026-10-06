import { m } from '@orbs/i18n/client';
import { Button } from '@/components/ui/button';
import type { RoomReactionGroup } from '@orbs/server/client';

export function RoomsChatReactions({ groups, disabled, failed, onToggle }: {
  groups: RoomReactionGroup[]
  disabled: boolean
  failed: boolean
  onToggle: (emoji: string) => void
}) {
  if (groups.length === 0 && !failed) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-11 pb-1">
      {groups.map((group) => (
        <Button
          aria-label={m.rooms_reaction_chip({ emoji: group.emoji, names: group.names.join(', ') })}
          aria-pressed={group.mine !== null}
          disabled={disabled}
          key={group.emoji}
          size="xs"
          title={group.names.join(', ')}
          variant={group.mine === null ? 'outline' : 'secondary'}
          onClick={() => onToggle(group.emoji)}
        >
          {group.emoji}
          <span className="tabular-nums">{group.count}</span>
        </Button>
      ))}
      {failed ? <p className="text-xxs text-destructive" role="alert">{m.rooms_reaction_failed()}</p> : null}
    </div>
  );
}
