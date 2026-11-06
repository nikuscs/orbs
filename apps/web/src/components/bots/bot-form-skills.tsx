import { botDisabledSkills } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { FormErrors } from '@repo/ui/forms/form';
import { Input } from '@repo/ui/input';
import { Panel, PanelRow } from '@repo/ui/panel';
import { Skeleton } from '@repo/ui/skeleton';
import { Switch } from '@repo/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { match } from 'ts-pattern';
import { BotFormShared } from '@/components/bots/bot-form-shared';
import { rpc } from '@/services/rpc/rpc.client';
import type { BotForm } from '@repo/contracts/universal';

interface BotFormSkillsProps {
  botId: string
  busy: boolean
}

export function BotFormSkills({ botId, busy }: BotFormSkillsProps) {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const shared = useQuery(rpc.skills.shared.queryOptions({ input: { botId } }));
  const tab = matchRoute({ to: '/bots/$botId/skills/local', params: { botId } }) ? 'local' : 'shared';

  function openTab(next: string) {
    void match(next)
      .with('local', () => navigate({
        to: '/bots/$botId/skills/local',
        params: { botId },
        replace: true,
      }))
      .otherwise(() => navigate({
        to: '/bots/$botId/$tab',
        params: { botId, tab: 'skills' },
        replace: true,
      }));
  }

  return (
    <Tabs
      className="gap-4"
      value={tab}
      onValueChange={openTab}
    >
      <TabsList aria-label={m.bots_skills_tabs()}>
        <TabsTrigger value="shared">{m.bots_skills_tab_shared()}</TabsTrigger>
        <TabsTrigger value="local">{m.bots_skills_tab_local()}</TabsTrigger>
      </TabsList>
      <TabsContent value="shared">
        <BotFormShared
          busy={busy}
          field="sharedSkills"
          isError={shared.isError}
          items={shared.data?.map((skill) => ({ name: skill.name, detail: skill.description, keywords: `${skill.name} ${skill.description}` }))}
          messages={{
            search: m.bots_skills_search(),
            noMatch: m.bots_skills_no_match(),
            loadFailed: m.bots_skills_load_failed(),
            note: m.bots_skills_note(),
            empty: m.bots_skills_empty(),
          }}
          resource="skills"
        />
      </TabsContent>
      <TabsContent value="local">
        <BotFormSkillsLocal botId={botId} busy={busy} />
      </TabsContent>
    </Tabs>
  );
}

interface BotFormSkillsLocalProps {
  botId: string
  busy: boolean
}

function BotFormSkillsLocal({ botId, busy }: BotFormSkillsLocalProps) {
  const form = useFormContext<BotForm>();
  const disabled = useWatch({ control: form.control, name: 'disabledSkills' });
  const skills = useQuery(rpc.skills.local.queryOptions({ input: { botId } }));
  const [search, setSearch] = useState('');

  const sorted = [...(skills.data ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  const query = search.trim().toLowerCase();
  const visible = sorted.filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(query));

  if (skills.isError) {
    return <FormErrors error={m.bots_skills_local_load_failed()} />;
  }

  if (!skills.data) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">{m.bots_skills_local_empty()}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        aria-label={m.bots_skills_search()}
        placeholder={m.bots_skills_search()}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Panel variant="soft">
        {visible.map((skill) => (
          <div className="flex items-center gap-3 px-4 hover:bg-muted/40" key={skill.name}>
            <label className="flex min-w-0 flex-1 cursor-pointer flex-col py-2.5" htmlFor={`local-skill-${skill.name}`}>
              <span className="font-mono text-sm font-medium">{skill.name}</span>
              <span className="truncate text-xs text-muted-foreground" title={skill.description}>{skill.description}</span>
            </label>
            <Switch
              checked={!disabled?.includes(skill.name)}
              disabled={busy}
              id={`local-skill-${skill.name}`}
              onCheckedChange={(isOn) => form.setValue('disabledSkills', botDisabledSkills({
                disabled,
                name: skill.name,
                isOn,
              }), { shouldDirty: true })}
            />
          </div>
        ))}
        {visible.length === 0 ? <PanelRow><span className="text-sm text-muted-foreground">{m.bots_skills_no_match()}</span></PanelRow> : null}
      </Panel>
      <p className="text-xs text-muted-foreground">{m.bots_skills_local_note()}</p>
    </div>
  );
}
