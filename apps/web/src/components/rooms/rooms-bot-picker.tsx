import { m } from '@orbs/i18n/client';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { BotLeaderMark } from '@/components/bots/bot-leader-mark';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import IconCrown from '~icons/lucide/crown';
import type { Bot } from '@orbs/server/client';

interface RoomsBotPickerProps {
  bots: Bot[];
  value: string[];
  onChange: (botIds: string[]) => void;
  withLeader?: boolean
}

export function RoomsBotPicker({ bots, value, onChange, withLeader = false }: RoomsBotPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {bots.map((bot) => (
        <Label className="flex items-center font-normal" key={bot.id}>
          <Checkbox
            checked={value.includes(bot.id)}
            onCheckedChange={(checked) => onChange(checked === true ? [...value, bot.id] : value.filter((botId) => botId !== bot.id))}
          />
          <BotAvatar
            animate={false}
            bot={bot}
            size={24}
          />
          <span className="truncate">{bot.name}</span>
          {withLeader && value[0] === bot.id ? <BotLeaderMark /> : null}
          {withLeader && value.includes(bot.id) && value[0] !== bot.id ? (
            <button
              aria-label={m.rooms_leader_set()}
              className="inline-flex shrink-0 text-muted-foreground/30 transition-colors hover:text-muted-foreground"
              title={m.rooms_leader_set()}
              type="button"
              onClick={() => onChange([bot.id, ...value.filter((botId) => botId !== bot.id)])}
            >
              <IconCrown aria-hidden="true" className="size-2.5" />
            </button>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">@{bot.handle}</span>
          <span className="ml-auto truncate text-xxs text-muted-foreground">{bot.modelId}</span>
        </Label>
      ))}
    </div>
  );
}
