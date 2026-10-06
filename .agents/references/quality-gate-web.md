# Quality gate: TypeScript stack

Applies to `apps/server` and `apps/web`. Read `.agents/references/quality-gate.md` first for scope, evidence, preflight, severity, and report format. Read `.agents/references/architecture.md` for structure and conventions.

The stack uses oRPC v2, Better Auth, and Kysely over Cloudflare D1 in `apps/server`; TanStack Start runs on Cloudflare Workers in `apps/web`. Packages use `@orbs/*`.

## Executable contract

The deterministic gate is real and mandatory:

- `bun run check` — TypeScript and generated Worker types.
- `bun run lint` — root Oxlint policy, including vendored anti-slop rules.
- `cd apps/server && bun run test` — approved Vitest architecture tests. Run for every server/web change.
- `bunx fallow dead-code --changed-since "$BASE" --format json` — dead code, dependency, cycle, boundary, unresolved-import, and stale-suppression policy.

Never weaken these gates to pass. The protected files and forbidden suppression markers are listed in `quality-gate.md`. Behavior tests remain opt-in: add none unless the user asks. Architecture tests are the approved exception.

## Exemplars

Read the current registry, nearest sibling service/RPC file, domain types, route, and component before judging or changing structure. Current architecture tests are the executable source for mechanical naming, placement, import, and purity rules.

## Checklist

### [STRUCTURE] Flat server services

A domain folder is flat. Its public assembly is `{domain}.service.ts`; operations are sibling files:

```text
apps/server/src/
├── core/core.services.ts
├── rpc/rpc.<name>.ts
├── types/<domain>.types.ts
└── services/<domain>/
    ├── <domain>.service.ts
    ├── <domain>-action.<name>.ts
    └── <domain>-query.<name>.ts
```

The only nested service folders are `services/database/migrations/core/` and `services/database/migrations/tenant/`, each containing SQL named `0001_description.sql`: four digits, underscore-separated lowercase words, and a unique prefix.

- `{domain}.service.ts` is assembly only: imports operations, wires dependencies, and returns the intended domain surface. No query, mutation, validation, mapping, or helper logic — `FAIL`.
- It exports only `make{Domain}Service` and `type {Domain}Service = ReturnType<typeof make{Domain}Service>` — `FAIL`.
- Actions use `{domain}-action.{name}.ts` and export plain `{domain}Action{Name}(deps, params)` functions — `FAIL`.
- Queries use `{domain}-query.{name}.ts` and export plain `{domain}Query{Name}(deps, params)` functions — `FAIL`.
- Queries only read. A DB write, external side effect, dispatch, or mutation in a query is `FAIL`.
- Do not introduce `actions/`, `queries/`, service-local type folders, factory `{ run }` wrappers, or extra service namespaces — `FAIL`.
- Domain types, interfaces, schemas, params, and response contracts live only in `apps/server/src/types/{domain}.types.ts`. The service `ReturnType` alias is the sole exception — `FAIL`.
- RPC files are flat under `apps/server/src/rpc/rpc.<name>.ts` — `FAIL`.
- Every domain service is registered in `apps/server/src/core/core.services.ts` — `FAIL`.

### [ASSEMBLY] Dependencies and composition

- The per-request container in `core/core.services.ts` is the composition boundary. Services receive dependencies; they do not import or read global/container state — `FAIL`.
- Pass the smallest dependency or method needed, not the entire service graph — `FAIL`.
- Service assembly returns only its intended domain API. Internal helpers stay private — `FAIL`.
- RPC handlers and route handlers delegate to services. Business logic, DB access, and backend data shaping in a handler are `FAIL`.
- Server logs use `@orbs/logger/server`, not `console.log` — `FAIL`.

### [TYPES] Contracts and boundaries

- Validate external values once at Workers, D1, RPC, and parse boundaries; internal typed code trusts the contract.
- No narrowing or double assertions, `any`, TypeScript suppressions, or assertion chains used as design escape hatches — `FAIL`.
- D1/Workers boundary values have explicit parsed types; do not propagate `unknown` through application code — `FAIL`.
- No inline object contracts in implementation signatures when the contract belongs in `src/types` — `FAIL`.
- No duplicate or service-local type definitions — `FAIL`.
- Import pre-inferred server types from `@orbs/server/client`; do not re-derive imported schemas with `z.infer` or `z.input` — `FAIL`.
- Build Zod schemas in `apps/server/src/types`, not RPC files, components, routes, or service implementation files — `FAIL`.

### [QUERIES] Kysely and D1

- Escape user-controlled `LIKE` input before binding it — `FAIL`.
- Kysely aliases and app-owned JSON keys use camelCase — `FAIL`.
- Reuse an existing pagination, conditional-filter, or search helper when one exists; do not invent an unrelated Postgres helper — `FAIL`.
- Deduplicate relation IDs before batch reads and attach results with a `Map`, not `.find()` inside a loop — `FAIL`.
- Batch relation reads. A proven request-path N+1 is `FAIL`; independent sequential reads that could use `Promise.all` are `WARN`.
- Queries return domain values and keep mutation/error side effects out of the read path — `FAIL`.

### [RPC] oRPC boundaries

- Flat `rpc.<name>.ts` handlers are thin and use a procedure from `rpc.procedures.ts` — `FAIL`.
- An operation that needs a signed-in user uses `authedProcedure`; `guestProcedure` is only for public or optional-auth operations — `FAIL`.
- Auth identity comes from procedure context, not client input — `FAIL`.
- RPC files declare no duplicate inline request/response schemas and perform no Kysely/D1 access — `FAIL`.
- Handlers call injected context/services and return their result. No domain mapping or mutation payload construction inline — `FAIL`.

### [ERRORS] Failure handling

- No generic `Error`; use the established typed error contract — `FAIL`.
- Do not mix throwing and Result-style handling in one module — `FAIL`.
- No silent catch or swallowed failure. A deliberately ignored external side effect needs the established explicit pattern and a short reason — `FAIL`.
- Wrapping an external or parse error preserves its cause — `WARN`.

### [HELPERS] Ownership and reuse

Search nearby code, the domain, and `packages/*/src` before approving a helper.

- Domain formatters, parsers, mappers, label maps, payload builders, and metadata builders do not live in components or routes. Put frontend-owned domain behavior in `apps/web/src/services/{domain}.client.ts` — `FAIL`.
- Call the existing owner first. A duplicate helper is `FAIL`.
- Inline a trivial wrapper or a name that only restates a single use — `FAIL`.
- Extract real logic only after three live uses or confirmed cross-file duplication, into the nearest owner — `FAIL`.
- Exported types use a domain prefix. Avoid lazy abbreviations and container names such as `dataResult` when the value has a real domain name — `FAIL`.

### [RUNTIME] Cloudflare Workers, not Node

- Node built-ins fail at runtime unless Worker compatibility explicitly supports them. A new unsupported Node import is `FAIL`.
- Code reachable from a route runs on the Worker. Keep build-time-only code out of the request path.
- Secrets live in `.env`; `.env.example` holds key names with obvious local placeholders only. A committed real value is `FAIL` and must be rotated, not merely deleted.

### [START] TanStack Start

- Create one `QueryClient` per `getRouter()` call in `src/application/router.tsx`. Module-level request state is shared across isolate users — `FAIL`.
- Server-rendered data uses the established loader/query pair with identical options. A client query that breaks hydration is `FAIL`.
- Server-only modules stay out of the browser bundle. Widening `importProtection` to pass is an enforcement finding.
- Routes export the route surface and stay thin. Domain filtering, formatting, payload shaping, and business logic belong to their owner — `FAIL`.
- Components render RPC-ready data. They do not own backend schemas, domain maps, or backend data shaping — `FAIL`.
- Forms, mutations, RPC errors, and loader-backed cache refresh follow the nearest established resolver/error/invalidation pattern. Reuse a shared helper when the repo has one; do not mandate a helper the repo does not have.
- Rendering or cache changes require a production build and preview when the user authorizes build/dev commands.

### [RSC] Server components

- Server functions live in `apps/web/src/services/<domain>/<domain>.rsc.{ts,tsx}` and are named `<domain>Rsc<Verb>` — `FAIL`.
- Route loaders call a `createServerFn` that returns `renderServerComponent(...)`; do not call `renderServerComponent` elsewhere — `FAIL`.
- Keep heavy imports in the server bundle and return only client-needed fields. Verify suspicious output is absent from the client bundle — `FAIL`.
- `"use client"` is per module. Keep component maps/objects in shared modules and move only interactive leaves behind a client boundary — `FAIL`.
- A dynamic import defers loading; it does not remove a dependency from the bundle.
- `ssr.external` ownership is not an Orbs rule until the Workers Vite config uses it.

### [I18N] English copy

All user-facing copy goes through Paraglide `m.*()` from `@orbs/i18n/client`.

- No hardcoded visible copy, ARIA labels, placeholders, empty-state text, dialog text, or fallback text — `FAIL`.
- A new key missing from `en` is `FAIL`. New Portuguese translations are not added; a `pt` entry left behind for a renamed or deleted key is `FAIL`.
- Calling `m.*()` at module scope freezes one locale for the isolate — `FAIL`. Store the message function and call it at render time.
- Routes carry no locale segment; the router rewrite localizes URLs.

### [STALE CODE] Replacements

Apply the repository cleanup rules from `quality-gate.md`. In this stack, explicitly search `core.services.ts`, RPC routers, route tables, env declarations, generated/client exports, fixtures, and docs. Old wrappers, registry keys, files, or exports are `FAIL`. Confirm new unused exports with Fallow and grep.

### [SLOP] Evidence only

- Reject speculative guards, wrappers, hooks, contexts, and abstractions without a current need.
- Delete dead routes, unused exports, stale TODOs, commented-out blocks, and comments that restate the code.
- `useEffect` for render-derivable state is `FAIL`.
- Report concurrency, duplicate calls, leaks, or N+1 only when a cited runtime path proves the consequence.
- A component over about 250 lines, or a route doing more than loader plus render, is `WARN` with a concrete split.

Repeated mechanical findings trigger a proposal under `Promote to architecture test`; they do not authorize adding a test in the same session.

## Deploy

`bun run deploy:cloudflare` builds before `wrangler deploy`. Running `wrangler deploy` alone can ship stale `dist/`; doing so without a build in the same session is `FAIL`.
