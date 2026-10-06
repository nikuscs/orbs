create table "file" ("id" text not null primary key, "roomId" text not null references "room" ("id") on delete cascade, "messageId" text references "message" ("id") on delete cascade, "name" text not null, "mediaType" text not null, "size" integer not null, "createdAt" text not null);
create index "file_roomId_idx" on "file" ("roomId");
create index "file_unsent_idx" on "file" ("createdAt") where "messageId" is null;
