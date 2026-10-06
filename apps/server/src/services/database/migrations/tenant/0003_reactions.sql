create table "reaction" ("id" text not null primary key, "roomId" text not null references "room" ("id") on delete cascade, "targetId" text not null references "message" ("id") on delete cascade, "authorId" text not null, "authorName" text not null, "emoji" text not null, "deliverAt" integer not null, "removedAt" text, "createdAt" text not null);
create unique index "reaction_active_idx" on "reaction" ("targetId", "authorId", "emoji") where "removedAt" is null;
create index "reaction_roomId_targetId_idx" on "reaction" ("roomId", "targetId");
alter table "message" add column "reactionId" text references "reaction" ("id") on delete cascade check ("reactionId" is null or "role" = 'user');
create unique index "message_reactionId_idx" on "message" ("reactionId") where "reactionId" is not null;
