# Orbs

A bot backend for one owner. A native daemon runs each bot as a persistent Pi Durable agent; the web (`apps/web`), iOS (`apps/mobile`) and macOS and Linux (`apps/desktop`) clients pair with it and talk over oRPC.

## Read first

- Before code changes, read `.agents/references/architecture.md` for structure and module conventions.
- For daemon, RPC, storage and Pi behavior, read `.agents/references/api.md`.
- Before UI changes, read `DESIGN.md`.
- For Pi Durable work, read `packages/runtime/node_modules/@earendil-works/pi-durable/README.md` first.

## Rules

- Follow nearby code. Keep changes direct; add no compatibility shims or speculative abstractions.
- Prefer library features to custom infrastructure. For Pi Durable, check its tools, extensions, hooks, documents, tasks, watches and recovery before adding app tables, queues, registries or wait mechanisms. Name the concrete API gap before writing a replacement; Orbs keeps only product policy and host integration.
- Store application secrets as encrypted entries in the shared `credentials` table through the credentials service. Pi provider authentication stays in Pi's own auth store.
- Each daemon has one owner, and devices get access only through pairing: no users, organizations, roles or password login. Paired devices issue grants through authenticated RPC; the local CLI uses the owner-only daemon socket. Public transport cannot issue local grants. CLI commands reuse running services; only startup opens stores.
- `apps/daemon` is startup, composition, transport and shutdown only. Product logic belongs in server, Pi integration in runtime, and native implementations in their owning package. Follow the ownership table in the architecture reference; fix conflicting code rather than the rules.
- Services own one concrete domain and receive whole service dependencies. A combined response does not justify a catchall service.
- User-facing copy uses English keys in `packages/i18n/messages/en/`.
- Architecture, lint, TypeScript and Fallow rules change only on the user's explicit request; fix the code to pass a check.
- Keep development data and credentials separate from production. The user owns the dev servers: ask before stopping or starting one. If a dev terminal has crashed, restart it in the same Paseo terminal and say so.
- To pair a device with the running dev daemon, run `bun run dev:pair`. It prints a PIN and a connect link for `http://localhost:47190`; pass `--url <origin>` (for example the machine's Tailscale address on port 47190) to link another web origin.
- A new native dependency on mobile needs a rebuild of the iOS dev app before its JavaScript can load; say so when you add one.
- Add tests only when the user asks.
- After a substantial set of code changes, run the `orbs-review` skill in full (simplify, code, blast), fix its findings within the task, and rerun the affected checks before reporting completion.

## Validation

Run `bun run check` and `bun run lint`; use `.agents/references/quality-gate.md` when reviewing. After changing agent guidance, run `bun run agents:sync`.
