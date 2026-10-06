# 🔮 Orbs

> Multi-bot chat you run yourself. Jev picks who answers, and a daemon on your machine runs each turn through Pi.

Rooms hold people and bots. A direct room is one bot. Mention a bot to wake it. With no mention, Jev scores who should reply.

An open-source, self-hosted alternative to Grok Bot, Muse and Dots: an AI group chat where several bots share one room, each on any model your Pi can reach (OpenAI Codex, Claude, Grok, OpenRouter and more).

## ✨ Features

- 💬 **Rooms and direct chats.** Create a bot, set its name, instructions and model, and talk to it alone or in a group.
- 🎯 **Routing.** `@handle` wakes that bot. `@everyone`, `@all` and `@here` wake every member. Otherwise Jev (TypeSafe) decides.
- 🖥️ **Your machine runs the turn.** The daemon connects out and drives your own Pi (`pi --mode rpc`). Pi is not bundled.
- 🏠 **Two hosts, same app.** Cloudflare (Workers, D1, R2, one Durable Object per organization) or one local Bun process (SQLite and disk).
- 🔑 **Sign in, then a daemon key.** Email and password, or Google. The daemon uses an organization API key, not your password.

## 🧰 Built with

[Bun](https://bun.sh) · [TanStack Start](https://tanstack.com/start) · [Cloudflare Workers](https://developers.cloudflare.com/workers/) · [D1](https://developers.cloudflare.com/d1/) · [Durable Objects](https://developers.cloudflare.com/durable-objects/) · [R2](https://developers.cloudflare.com/r2/) · [Better Auth](https://www.better-auth.com) · [oRPC](https://orpc.dev) · [Kysely](https://kysely.dev) · [Pi](https://github.com/earendil-works/pi)

## 🚀 Run it locally

**You need:** [Bun](https://bun.sh) 1.4.2 and [Pi](https://github.com/earendil-works/pi) on your `PATH` (`pi`, 0.99.0 or newer). A TypeSafe API key if you want Jev to route, and Google OAuth credentials if you want Google sign-in.

**1. Install**

```bash
git clone https://github.com/nikuscs/orbs && cd orbs && bun install
cp apps/web/.env.example apps/web/.env
```

The example `BETTER_AUTH_SECRET` is fine on your machine. Put a real `TYPESAFE_API_KEY` in that file if you want Jev to run. The Google placeholders only satisfy startup; they do not sign anyone in.

**2. Start the web app**

```bash
cd apps/web && bun run dev:cloudflare
```

Open http://localhost:47101 and sign up with email. The verification link is printed in that terminal as one JSON line (`tag: mail`); the default mail driver does not send email.

**3. Start the daemon**

In the app, open **Daemon key** (`/settings/daemon-key`). The key is shown once. Paste it into a new `apps/daemon/.env`:

```bash
cp apps/daemon/.env.example apps/daemon/.env
```

Set `ORBS_API_KEY`, and `ORBS_WORKDIR` to a real folder. `ORBS_URL` defaults to `http://localhost:47101`. Then:

```bash
cd apps/daemon && bun run dev:cloudflare
```

`bun run dev:cloudflare` from the repo root starts the web app and the daemon together. The daemon exits until its `.env` is filled in.

> [!WARNING]
> Bots run Pi's tools (read, bash, edit, write) as your user, in `ORBS_WORKDIR`. This is not a sandbox. A bot asked to change a repo will change that repo.

Bot instructions are edited in the bot form. Extra instructions and skills can live in `~/.orbs/bots/<botId>/` (`AGENTS.md` and `skills/`). Skills shared by the bots on this daemon default to `~/.orbs/shared` (`ORBS_SHARED_HOME`).

### Without Cloudflare

`bun run dev:bun` from the repo root builds the web app in native mode and starts one Bun process on port 47101, plus the daemon. It uses the same `apps/web/.env`, and data defaults to `~/.orbs/data`. It listens on every interface, so LAN and Tailscale can reach it; set `HOST=127.0.0.1` to keep it local.

## ☁️ Cloudflare

`apps/web/wrangler.jsonc` names the Worker `orbs-web`, the D1 database `orbs-database`, the R2 bucket `orbs-files` and the `TenantObject` Durable Object. It has no `database_id`, and `deploy:cloudflare` and `deploy:first` pass `--no-x-provision`, so a fresh account will not create those resources on its own.

Before a production deploy, create the database, bucket and Worker yourself, set `APP_URL` to an `https://` origin, and put the keys from `apps/web/.env.example` in `apps/web/.env.production`, with `apps/web/.prod.vars` as a symlink to it for Wrangler (both gitignored). `bun run deploy:first` (in `apps/web`) is the first upload; later deploys are `bun run deploy:cloudflare` from the repo root. The secret check refuses a deploy whose `APP_URL` is not https; the committed `http://localhost:47101` is for local dev only.

## 🧪 Development

```bash
bun run check
bun run lint
cd apps/server && bun run test
```

`bun run check` needs `apps/web/.env`, because Wrangler builds the Worker env types from it. CI copies `.env.example` into place for that reason.

`bun run build:daemon` writes a binary to `apps/daemon/dist/orbs-daemon`.

## 📄 License

MIT. The avatar blob engine in `packages/avatar-blobs/` is by Jérémy Perret, also MIT; see `packages/avatar-blobs/LICENSE`.
