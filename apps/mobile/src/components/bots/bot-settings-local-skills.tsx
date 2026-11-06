import { botDisabledSkills } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { Input } from '@/components/ui/input';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { LabelDescription } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { BotSharedForm } from '@/types/bot-shared.types';
import type { RpcSession } from '@/types/rpc.types';

interface BotSettingsLocalSkillsProps {
  session: RpcSession;
  botId: string;
  isDisabled: boolean;
}

export function BotSettingsLocalSkills({ session, botId, isDisabled }: BotSettingsLocalSkillsProps) {
  const form = useFormContext<BotSharedForm>();
  const disabled = useWatch({ control: form.control, name: 'disabledSkills' });
  const skills = useQuery(session.rpc.skills.local.queryOptions({ input: { botId } }));
  const [search, setSearch] = useState('');

  const sorted = [...(skills.data ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  const query = search.trim().toLowerCase();
  const visible = sorted.filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(query));

  if (skills.isError) {
    return <LabelDescription accessibilityRole="alert" variant="error">{m.bots_skills_local_load_failed()}</LabelDescription>;
  }

  if (!skills.data) {
    return <Skeleton className="h-24 rounded-2xl" />;
  }

  if (sorted.length === 0) {
    return <LabelDescription>{m.bots_skills_local_empty()}</LabelDescription>;
  }

  return (
    <View className="gap-2">
      <Input
        accessibilityLabel={m.bots_skills_search()}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        placeholder={m.bots_skills_search()}
        returnKeyType="search"
        value={search}
        onChangeText={setSearch}
      />
      <ItemGroup>
        {visible.map((skill) => (
          <Item key={skill.name}>
            <ItemContent>
              <ItemTitle numberOfLines={1}>{skill.name}</ItemTitle>
              {skill.description ? <ItemDescription>{skill.description}</ItemDescription> : null}
            </ItemContent>
            <Switch
              accessibilityLabel={skill.name}
              disabled={isDisabled}
              value={!disabled?.includes(skill.name)}
              onValueChange={(isOn) => form.setValue('disabledSkills', botDisabledSkills({
                disabled,
                name: skill.name,
                isOn,
              }), { shouldDirty: true })}
            />
          </Item>
        ))}
        {visible.length === 0 ? (
          <Item>
            <ItemContent>
              <ItemDescription numberOfLines={0}>{m.bots_skills_no_match()}</ItemDescription>
            </ItemContent>
          </Item>
        ) : null}
      </ItemGroup>
      <LabelDescription>{m.bots_skills_local_note()}</LabelDescription>
    </View>
  );
}
