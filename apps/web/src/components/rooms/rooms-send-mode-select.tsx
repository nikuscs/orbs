import { m } from '@orbs/i18n/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roomInputSendMode } from '@orbs/server/client';
import type { RoomInputSendMode } from '@orbs/server/client';

export function RoomsSendModeSelect({ value, disabled, onChange }: {
  value: RoomInputSendMode
  disabled?: boolean
  onChange: (value: RoomInputSendMode) => void
}) {
  const labels = {
    queue: m.rooms_send_queue(),
    steer: m.rooms_send_steer(),
    interrupt: m.rooms_send_interrupt(),
  } satisfies Record<RoomInputSendMode, string>;

  const hints = {
    queue: m.rooms_send_queue_hint(),
    steer: m.rooms_send_steer_hint(),
    interrupt: m.rooms_send_interrupt_hint(),
  } satisfies Record<RoomInputSendMode, string>;

  return (
    <div className="flex flex-col gap-1">
      <Select
        disabled={disabled}
        value={value}
        onValueChange={(next) => onChange(roomInputSendMode.parse(next))}
      >
        <SelectTrigger aria-label={m.rooms_send_mode()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roomInputSendMode.options.map((option) => <SelectItem key={option} value={option}>{labels[option]}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{hints[value]}</p>
    </div>
  );
}
