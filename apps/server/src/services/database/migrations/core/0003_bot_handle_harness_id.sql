alter table "bot" rename column "slug" to "handle";
alter table "bot" rename column "harnessInstanceId" to "harnessId";
drop index "bot_organizationId_slug_idx";
create unique index "bot_organizationId_handle_idx" on "bot" ("organizationId", "handle");

update "organizationSettings"
set "value" = json_remove(json_set("value", '$.judge.harnessId', json_extract("value", '$.judge.harnessInstanceId')), '$.judge.harnessInstanceId')
where "key" = 'routing' and json_type("value", '$.judge.harnessInstanceId') is not null;
