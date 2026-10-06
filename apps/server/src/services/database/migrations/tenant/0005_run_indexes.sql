create index "run_status_createdAt_idx" on "run" ("status", "createdAt");
create index "run_roomId_botId_createdAt_idx" on "run" ("roomId", "botId", "createdAt");
create index "message_roomId_createdAt_human_idx" on "message" ("roomId", "createdAt") where "role" = 'user' and "reactionId" is null;
