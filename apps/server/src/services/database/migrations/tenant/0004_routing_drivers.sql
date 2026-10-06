alter table "room" add column "driver" text;
alter table "room" add column "rotation" integer not null default 0;
alter table "run" add column "seat" text not null default 'required';
