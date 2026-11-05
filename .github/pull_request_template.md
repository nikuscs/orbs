## 📸 Screenshots & videos

<!-- Optional: the change on each affected client. Show synthetic data only, never tokens, pairing PINs or real conversations. Delete this section when there is nothing visual to show. -->

## 🎫 Issue

<!-- The issue this PR resolves, so it closes on merge. Write "None" for a change without one. -->
Closes #

## 🤔 Why

<!-- One or two lines: the problem and its evidence. The issue has the background. -->

## 📋 What changed

<!-- One line per changed scope (Web, iOS, macOS, Daemon, Runtime, Docs…): what it does differently, not which files. End with anything left out on purpose. -->

## 💣 Blast radius

<!-- Can this reach a real install? 🔴 Human review: it touches what users run (client UI, daemon, RPC contracts, pairing and grants, credentials, storage and migrations, Pi tools, prompts and skills, release scripts). 🟢 Light review: it only touches docs, agent guidance, tests or CI. -->

**Review:**
**Affected paths:**

## ⚠️ Before merging

<!-- What the merge can break or needs: migration numbers, RPC changes and older clients, env vars or credentials, an iOS dev app rebuild for a new native dependency. Write "None" if none. -->

## 🔍 Verification

<!-- One line per check with its result, then what was not verified. For a bug fix, say how it behaves with and without the change. -->

## ✅ Before review

<!-- Tick what holds; strike through (~~like this~~) what doesn't apply. -->

- [ ] `bun run check`, `bun run lint`, `bun run lint:dead` and `bun run test`
- [ ] Tested on every affected platform
- [ ] UI change: follows `DESIGN.md`, copy in i18n, new functionality on both web and iOS
- [ ] Substantial change: `orbs-review` run in full, findings fixed
