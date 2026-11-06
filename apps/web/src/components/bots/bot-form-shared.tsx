import { m } from '@repo/i18n/client';
import { Button } from '@repo/ui/button';
import { FormErrors } from '@repo/ui/forms/form';
import { Input } from '@repo/ui/input';
import { Panel, PanelRow } from '@repo/ui/panel';
import { Skeleton } from '@repo/ui/skeleton';
import { Switch } from '@repo/ui/switch';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { match } from 'ts-pattern';
import type { BotFormSharedItem, BotFormSharedMessages } from '@/types/bot.types';
import type { BotForm } from '@repo/contracts/universal';

interface BotFormSharedProps {
  resource: 'skills' | 'mcp'
  field: 'sharedSkills' | 'sharedMcp'
  items: BotFormSharedItem[] | undefined
  isError: boolean
  messages: BotFormSharedMessages
  busy: boolean
}

export function BotFormShared({ resource, field, items, isError, messages, busy }: BotFormSharedProps) {
  const form = useFormContext<BotForm>();
  const [inherit, shared] = useWatch({ control: form.control, name: ['inherit', field] });
  const [search, setSearch] = useState('');

  const sorted = [...(items ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  const names = sorted.map((item) => item.name);
  const chosen = shared?.length ? shared : names;
  const selected = new Set(inherit.includes(resource) ? chosen : []);
  const query = search.trim().toLowerCase();
  const visible = sorted.filter((item) => item.keywords.toLowerCase().includes(query));
  const count = names.filter((name) => selected.has(name)).length;

  function choose(next: Set<string>) {
    const picked = names.filter((name) => next.has(name));
    const without = inherit.filter((item) => item !== resource);

    form.setValue('inherit', picked.length === 0 ? without : [...without, resource], { shouldDirty: true });
    form.setValue(field, picked.length === names.length ? [] : picked, { shouldDirty: true });
  }

  function toggle(name: string, isChecked: boolean) {
    const next = new Set(selected);

    match(isChecked)
      .with(true, () => next.add(name))
      .with(false, () => next.delete(name))
      .exhaustive();
    choose(next);
  }

  if (isError) {
    return <FormErrors error={messages.loadFailed} />;
  }

  if (!items) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (sorted.length === 0) {
    return messages.empty ? <p className="text-sm text-muted-foreground">{messages.empty}</p> : null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label={messages.search}
        placeholder={messages.search}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="text-sm text-muted-foreground">{m.bots_pick_selected({ selected: String(count), total: String(names.length) })}</p>
          <div className="flex gap-1">
            <Button
              disabled={busy}
              size="xs"
              type="button"
              variant="ghost"
              onClick={() => choose(new Set(names))}
            >
              {m.bots_pick_all()}
            </Button>
            <Button
              disabled={busy}
              size="xs"
              type="button"
              variant="ghost"
              onClick={() => choose(new Set())}
            >
              {m.bots_pick_none()}
            </Button>
          </div>
        </div>
        <Panel variant="soft">
          {visible.map((item) => (
            <div className="flex items-center gap-3 px-4 hover:bg-muted/40" key={item.name}>
              <label className="flex min-w-0 flex-1 cursor-pointer flex-col py-2.5" htmlFor={`${resource}-${item.name}`}>
                <span className="font-mono text-sm font-medium">{item.name}</span>
                <span className="truncate text-xs text-muted-foreground" title={item.detail}>{item.detail}</span>
              </label>
              <Switch
                checked={selected.has(item.name)}
                disabled={busy}
                id={`${resource}-${item.name}`}
                onCheckedChange={(isOn) => toggle(item.name, isOn)}
              />
            </div>
          ))}
          {visible.length === 0 ? <PanelRow><span className="text-sm text-muted-foreground">{messages.noMatch}</span></PanelRow> : null}
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">{messages.note}</p>
    </div>
  );
}
