alter table "message" add column "triggerId" text;
update "message" set "triggerId" = (select "run"."triggerMessageId" from "run" where "run"."id" = "message"."runId") where "runId" is not null;
