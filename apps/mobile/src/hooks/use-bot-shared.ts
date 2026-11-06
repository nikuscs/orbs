import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';
import type { BotSharedList, BotSharedResource } from '@/types/bot-shared.types';
import type { RpcSession } from '@/types/rpc.types';

interface UseBotSharedParams {
  session: RpcSession;
  botId: string;
  resource: BotSharedResource;
}

export function useBotShared({ session, botId, resource }: UseBotSharedParams): BotSharedList {
  const skills = useQuery(session.rpc.skills.shared.queryOptions({ input: { botId } }));

  return match(resource)
    .with('skills', (): BotSharedList => ({
      field: 'sharedSkills',
      items: skills.data?.map((skill) => ({ name: skill.name, detail: skill.description, keywords: `${skill.name} ${skill.description}` })),
      isError: skills.isError,
      messages: {
        search: m.bots_skills_search(),
        noMatch: m.bots_skills_no_match(),
        loadFailed: m.bots_skills_load_failed(),
        note: m.bots_skills_note(),
        empty: m.bots_skills_empty(),
      },
    }))
    .exhaustive();
}
