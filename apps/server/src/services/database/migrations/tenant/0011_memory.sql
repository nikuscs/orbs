create table "memorySnapshot" (
  "scope" text not null, "ownerId" text not null, "text" text not null default '',
  "dirty" integer not null default 1, "dueAt" integer not null,
  primary key ("scope", "ownerId")
);
create table "memoryRoom" (
  "roomId" text not null primary key references "room" ("id") on delete cascade,
  "enabled" integer not null default 0, "generation" text not null,
  "cursor" integer not null default 0, "throughSeq" integer not null default 0,
  "fromSeq" integer not null default 0, "offset" integer not null default 0,
  "status" text not null default 'idle', "dueAt" integer, "attempt" integer not null default 0,
  "requestId" text, "model" text, "source" text, "result" text, "error" text,
  "recap" text not null default '', "recapFrom" integer not null default 0,
  "recapThrough" integer not null default 0, "recapRevision" integer not null default 0, "baseRecapRevision" integer not null default 0,
  "usage" text, "skipped" text not null default '[]'
);
create trigger "memory_message_dirty" after insert on "message"
when NEW."reactionId" is null
begin
  update "memoryRoom" set "status" = 'pending', "dueAt" = cast(unixepoch('subsec') * 1000 as integer) + 15000
  where "roomId" = NEW."roomId" and "enabled" = 1 and "status" in ('idle', 'pending');
end;
