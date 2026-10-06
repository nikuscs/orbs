alter table "run" rename column "harnessInstanceId" to "harnessId";
alter table "binding" rename column "harnessInstanceId" to "harnessId";
alter table "judge" rename column "harnessInstanceId" to "harnessId";

update "harness"
set "catalogue" = json_remove(json_set("catalogue", '$.harnessId', json_extract("catalogue", '$.harnessInstanceId')), '$.harnessInstanceId')
where json_type("catalogue", '$.harnessInstanceId') is not null;
