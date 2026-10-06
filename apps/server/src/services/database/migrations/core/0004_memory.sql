create table "memory" (
  "id" text not null primary key,
  "organizationId" text not null references "organization" ("id") on delete cascade,
  "scope" text not null check ("scope" in ('global', 'bot', 'room')),
  "ownerId" text not null,
  "botId" text references "bot" ("id") on delete cascade,
  "subjectKind" text not null check ("subjectKind" in ('user', 'bot', 'room')),
  "subjectId" text not null,
  "text" text,
  "revision" integer not null,
  "origin" text not null check ("origin" in ('manual', 'automatic')),
  "sources" text not null,
  "createdBy" text not null,
  "createdAt" text not null,
  "updatedAt" text not null
);
create index "memory_scope" on "memory" ("organizationId", "scope", "ownerId", "updatedAt" desc, "id");
create index "memory_subject" on "memory" ("organizationId", "scope", "ownerId", "subjectKind", "subjectId");
create table "memoryOperation" (
  "organizationId" text not null references "organization" ("id") on delete cascade,
  "id" text not null,
  "memoryId" text not null,
  "revision" integer not null,
  "expectedRevision" integer,
  primary key ("organizationId", "id")
);
create trigger "memory_revision_guard" before insert on "memoryOperation"
when NEW."expectedRevision" is not null
begin
  select case when not exists (
    select 1 from "memory" where "organizationId" = NEW."organizationId" and "id" = NEW."memoryId"
    and "revision" = NEW."expectedRevision" and "text" is not null
  ) then raise(abort, 'memory_revision_conflict') end;
end;
create table "memorySource" (
  "organizationId" text not null references "organization" ("id") on delete cascade,
  "messageId" text not null,
  "memoryId" text not null references "memory" ("id") on delete cascade,
  primary key ("organizationId", "messageId", "memoryId")
);
