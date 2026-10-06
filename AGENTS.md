# Orbs

Multi-bot chat app: TanStack Start web app on Cloudflare or Bun (`apps/web`), a shared TypeScript service package (`apps/server`), and a Bun daemon that runs bot turns through harness adapters (`apps/daemon`; Pi is the only one implemented today).

## Read first

- `.agents/references/architecture.md`: how the app runs, allowed folders and file names, standards and playbook. Read it before writing code.
- `DESIGN.md`: visual design. Read it before any UI change.
- Never edit `architecture.md`, oxlint, architecture tests, Fallow or their configs, and never add suppressions, test skip/only or `fallow-ignore`, unless the user approves that exact change. Propose the diff instead.

## Rules

- Harness-first: before adding a guard or feature around turns (tool limits, compaction, retries, steering, skills), check the harness's own docs and code and use its option.
- Greenfield: change things cleanly, no compatibility shims, re-exports or leftovers; check the blast radius and rename or delete as needed.
- Copy is English only: new keys go in `packages/i18n/messages/en/`; renaming or deleting a key removes its `pt` entry too.
- Chat prompts live only in `route.prompts.ts` and `run.prompts.ts`.
- A routing edge case (unknown mention, empty room, budget) never leaves a human message unanswered when a bot in the room could answer it.
- Bots run unsandboxed as the daemon's OS user. Test with harmless messages only (greetings, trivia, a short poem), and check chat changes on screen in a group and a direct room, including the routing Details.
- Root scripts resolve only root dependencies (bun isolated installs), so they import app code by relative path.

## Validation

```bash
bun run check && bun run lint
cd apps/server && bun run test
```

Zero warnings: a gate passes only on `Tasks: 12 successful`. Review against `.agents/references/quality-gate.md`. After changing agent files, run `bun scripts/utils-sync-agents.ts`.
