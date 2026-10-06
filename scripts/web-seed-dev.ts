import path from 'node:path';

const { BOT } = await import(path.resolve(import.meta.dir, '../apps/server/src/services/bot/bot.constants.ts'));

const PASSWORD_HASH = '78cb0a678d0e15e658e05660bd9714df:8f443fedec746846d2408a9555af7027854ad30f9cd78c195bc0f6e91027601627011d396f51225cfc90defafe7bbba5709ea7a83927833fac204df2350dde2a';
const now = new Date().toISOString();

const sql = `
insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "username")
values ('seed-admin-user', 'Admin User', 'admin@admin.com', 1, '${now}', '${now}', 'admin', 'admin')
on conflict do nothing;

insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
select 'seed-admin-credential', "id", 'credential', "id", '${PASSWORD_HASH}', '${now}', '${now}'
from "user"
where "email" = 'admin@admin.com'
  and not exists (
    select 1 from "account"
    where "providerId" = 'credential' and "userId" = "user"."id"
  )
on conflict do nothing;

insert into "organization" ("id", "name", "slug", "createdAt")
values ('seed-organization', 'Admin User Organization', 'personal-seed-admin-user', '${now}')
on conflict do nothing;

insert into "member" ("id", "organizationId", "userId", "role", "createdAt")
values ('seed-admin-member', 'seed-organization', 'seed-admin-user', 'owner', '${now}')
on conflict do nothing;

insert into "bot" ("id", "organizationId", "name", "handle", "instructions", "harnessId", "modelProvider", "modelId", "thinkingLevel", "permission", "homeDir", "createdAt")
values
  ('seed-bot-dev', 'seed-organization', 'Dev', 'dev', 'You are a senior developer. Answer briefly.', '${BOT.harnessId}', 'openai-codex', 'gpt-5.6-sol', 'low', '${BOT.defaultPermission}', '${BOT.homeRoot}/seed-bot-dev', '${now}'),
  ('seed-bot-writer', 'seed-organization', 'Writer', 'writer', 'You are a writer. Answer in one or two sentences.', '${BOT.harnessId}', 'openai-codex', 'gpt-5.6-luna', 'off', '${BOT.defaultPermission}', '${BOT.homeRoot}/seed-bot-writer', '${now}')
on conflict do nothing;
`;

const processHandle = Bun.spawn(
  ['bun', 'x', 'wrangler', 'd1', 'execute', 'orbs-database', '--local', '--command', sql],
  {
    cwd: path.resolve(import.meta.dir, '../apps/web'),
    stderr: 'inherit',
    stdout: 'inherit',
  },
);

process.exit(await processHandle.exited);
