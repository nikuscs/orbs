import { m } from '@orbs/i18n/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { routingDriverLabels } from '@/services/routing/routing.client';
import { routeDriverName } from '@orbs/server/client';
import type { RouteDriverName } from '@orbs/server/client';

export function RoutingDriverSelect({ value, inherited, disabled, onChange }: {
  value: RouteDriverName | null
  inherited?: RouteDriverName
  disabled?: boolean
  onChange: (value: RouteDriverName | null) => void
}) {
  const labels = routingDriverLabels();

  const hints = {
    jev: m.routing_driver_jev_hint(),
    roundtable: m.routing_driver_roundtable_hint(),
    judge: m.routing_driver_judge_hint(),
  } satisfies Record<RouteDriverName, string>;

  const effective = value ?? inherited;

  return (
    <div className="flex flex-col gap-1">
      <Select
        disabled={disabled}
        value={value ?? 'inherit'}
        onValueChange={(next) => onChange(next === 'inherit' ? null : routeDriverName.parse(next))}
      >
        <SelectTrigger aria-label={m.routing_driver()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {inherited ? <SelectItem value="inherit">{m.routing_driver_inherit({ driver: labels[inherited] })}</SelectItem> : null}
          {routeDriverName.options.map((option) => <SelectItem key={option} value={option}>{labels[option]}</SelectItem>)}
        </SelectContent>
      </Select>
      {effective ? <p className="text-xs text-muted-foreground">{hints[effective]}</p> : null}
    </div>
  );
}
