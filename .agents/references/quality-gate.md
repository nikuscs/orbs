# Quality gate

Review standard for `apps/server`, `apps/web`, and shared packages. Read this file first, then `.agents/references/quality-gate-web.md`.

## Scope and evidence

Report findings; apply fixes only when asked. Read every scoped file in full and trace the smallest runtime path needed to prove behavior. Do not migrate unrelated code.

Severity: `FAIL` blocks the merge; `WARN` is taste the author may decline. Binary convention violations are `FAIL`. For judgment findings, state the flaw, its consequence, and the fix. Drop claims that require imagined behavior.

## Deterministic preflight

```bash
bun run check
bun run lint
cd apps/server && bun run test
bunx fallow dead-code --changed-since "$BASE" --format json
```

For an inventory review, use `bunx fallow dead-code --production --format json`. A required command that cannot run makes the verdict `INCOMPLETE`.

Every added, renamed or moved file must match its tree in `.agents/references/architecture.md`. A mismatch is `FAIL` and is fixed in the same change, even in a report-only review.

After a rename, replacement, move, or ownership change, search old symbols, filenames, IDs, env keys, fixtures, and docs. Prove changed exports, registries, route tables, service entries, and descriptor objects still have consumers.

## Protected enforcement

The gate is a contract. These surfaces change only when the user explicitly requests it:

- `oxlint.config.ts` and formatter config
- `apps/server/tests/architecture/**`
- `packages/tooling/src/vitest/**` and vendored anti-slop rules
- `.fallowrc.json`
- `tsconfig*.json`, `vitest.config*`, `turbo.json`, and CI workflows
- package `lint`, `check`, and `test` scripts

Never weaken a gate to pass. Reject new suppressions, skipped tests, `fallow-ignore`, and downgraded severities unless explicitly authorized.

## Replacement cleanup

A replacement is incomplete while the old concept remains reachable. Remove old exports, wrappers, aliases, registry entries, env keys, fixtures, tests, and docs. Update every consumer and verify with Fallow plus explicit grep evidence.

## Report format

1. Findings, `FAIL` before `WARN`, with file, line, defect, impact, and fix direction.
2. Assumptions and open questions.
3. Required command results and manual coverage.
4. Architecture-test proposals when a repeated mechanical defect warrants a ratchet.

With no findings, write `No findings.` Return `PASS` only when required checks and manual coverage completed.
