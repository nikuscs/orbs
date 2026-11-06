# Orbs backend reference

Only behavior the code does not make obvious. RPC names and inputs: `packages/contracts/src/rpc/rpc.router.ts`. Services: `packages/server/src/services/<domain>/` (product) and `packages/runtime/src/services/<domain>/` (Pi).

## Daemon and storage

```text
DATA_DIR/                     default ~/.config/orbs/
  agents/<botId>/             bot working folder, uploads in .attachments/ (not a sandbox)
  data/app.sqlite             app database
  data/credentials.key        key for the encrypted credentials table
  data/daemon.lock            one lock for every store
  data/ipc/rpc.sock           owner-only socket, used by `orbs pair`
  data/bots/<botId>/runtime.sql   that bot's Pi store; the file is the unit of erasure
  data/bots/<botId>/mcp.json      MCP servers the owner or the bot added for that bot only
  data/bots/<botId>/telemetry.sql model and tool spans, kept 14 days; reset with the store, not backed up
```

- Startup opens and migrates SQL, restores every bot, then resumes Pi. A failing store closes only its bot.
- Backup runs offline with `VACUUM INTO` (`server/src/services/backup/`). A bundle includes the encryption key: treat it as a secret.

## Connection

- Clients probe every address from `server.info()` and use the first, in list order, whose `/health` reports the paired server ID (`server/src/services/server/`).
- Every call sends `x-bots-protocol`; `serverId` pins a client to one daemon. Mismatches return `PROTOCOL_MISMATCH` or `SERVER_MISMATCH` and are never retried.
- Pairing uses a six-digit PIN that lives five minutes; the QR code and link are Base64 of `{ serverId, addresses, pin }` (`authPairEntry` in `contracts/src/types/auth.types.ts`). Redeem returns the server ID and addresses, so a bare PIN works against a known address. Every wrong PIN counts against all live grants, which die after five misses. Public transport can never bootstrap; only the owner socket can.
- The web proxy only forwards to an address that reports the paired server ID, so a forged cookie cannot redirect it.
- Web sends every chat route to `/onboarding/$step` until `onboarding.complete()` stores `onboarding.completedAt` in settings. It is stored per daemon, so devices paired later skip it.

## Retries and dedupe

- `conversation.submit` dedupes by `requestId`: a reused ID returns the same submission even with new content. Clients never retry commands or submissions on their own.
- Peer delivery submits with `bots.delivery:<senderStoreId>:<taskId>`, so a rerun after a crash delivers once (`runtime/src/services/collaboration/collaboration-delivery.task.ts`).
- Tools that mutate use `replay: 'unsafe'`: after a crash, read state before retrying.

## Busy modes (`whenBusy`)

`followUp` queues after the reply, `steer` joins after the current tool round, `interrupt` aborts the run and goes first (`CONFLICT` if a newer run started), `reject` fails when busy. When omitted: the chat's mode, then the daemon default, then `followUp`.

## Model fallback

One retry on the bot's `fallbackModel` only when a request fails before any output with an auth, quota or transient provider error (`runtimeModelCanFallback` in `runtime/src/services/runtime/runtime-model-stream.utils.ts`).

## Approvals

Read-only, Ask, Auto and Full. Auto asks Jev and approves only with a safe score of at least 0.9 and an ask-first score of at most 0.1 (`server/src/services/tool/tool.constants.ts`); otherwise it asks the owner. Only exact trusted registrations count as reads. Approval state lives in Pi task documents and survives restart.

## Secrets

`bot_secret` stores values encrypted as `secrets.<NAME>` with allowed hosts. Bash reads `$NAME`. Mode `proxy` (default) keeps a placeholder in the command and swaps in the value only over HTTPS to allowed hosts (`packages/secret-proxy`); `varlock` uses the Varlock CLI; `env` exposes the value. Tool results always show placeholders.

## Skills, instructions, plugins and MCP

Bot-local sources win, then configured shared sources, then Pi's global ones; shared sources need the bot's inheritance flag. A bot-local skill named in the bot's `disabledSkills` is left out of the prompt, the `$` list and expansion, and its files stay untouched. Order and file names: `runtime/src/services/skill/`, `runtime/src/services/instruction/instruction.constants.ts`, `server/src/services/mcp/mcp-files.utils.ts`.

- MCP credentials are referenced by name (`envCredentials`, `headerCredentials`), only from shared sources; bot-local definitions that use them are skipped.
- `mcp.add` and the `bot_mcp_add` tool write `data/bots/<botId>/mcp.json`, which may use credentials: a header secret must be allowed for the server's host, and only the owner can pass env secrets to a command server. `bot_mcp_add` and `bot_note` always ask the owner, except under Full.
- MCP OAuth (`runtime/src/services/mcp-auth/`): the server URL always comes from bot config, the one-time `state` authorizes the callback browser, and `returnUrl` must be an app link or the redirect's own origin.
- Plugins are trusted native code; approval gates their tool calls, not their imports.

## Peers and subagents

Peers talk in one persistent private conversation per sender and recipient by default (`context: 'private'`; a new one starts after the sender's history is cleared); `context: 'existing'` posts into the recipient's main chat instead. Forwarding stops after three bots. Subagents cannot spawn children or contact peers. Silent answers are dropped before reaching the asking bot.

## Routines

One Pi task per routine ends each wait in a stored sleep, with no model calls (`runtime/src/services/routine/routine.task.ts`). Pi cannot wake a sleeping task early, so run-now and edits replace the routine's task in the same commit and abort the old one; a task that is delivering is left alone. A task that is no longer its routine's task ends itself. Opening a bot retries routine tasks Pi parked at its restart limit. After downtime an overdue run happens once; missed repetitions are skipped. Each store arms one host alarm at its earliest deadline, so the daemon must stay running.

## Silent replies

Assistant text that is only `NO_REPLY` or `<|eos|>` (`replySilent` in `contracts/src/types/reply.types.ts`) is hidden in chat, ignored by the chat-list preview and notifications, and dropped from peer and subagent answers. The reactions prompt asks bots to reply `NO_REPLY`.

## History clear

`conversation.clear` saves routines, todos and the latest artifact versions to `data/bots/<botId>/carry.json`, replaces the store and recreates them with the same IDs; a crash mid-way finishes on the next start.
