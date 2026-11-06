# Plan: Cua computers for bots

Status: approved by the owner, phase 1 next. Each phase gets its own detailed plan before code.

## Goal

A bot can use a computer by itself, and the owner can watch, control and take over from any client.

1. **A computer per bot first.** Each bot can start its own small Linux desktop with Chromium in a Docker container, on demand. It sleeps and shuts down by itself after time limits. The bot sees the screen and works visually (screenshot, click, type, keys, scroll, drag) or through Chromium's page elements.
2. **The owner's Mac second.** A bot the owner allows sees and controls the owner's Mac in the background, one window at a time.
3. **Watch, control and take over everywhere.** Web, macOS desktop and iOS show a thumbnail in the bot's details, a full live view, the computer's state and Start, Sleep and Shut down buttons. "Take over" lets the owner use the mouse and keyboard while the bot waits.

Both targets run the same Cua daemon, `cua-spacesd`, so tools, stream, viewer and proxy are written once. Only lifecycle differs.

No Cua account, no relay, no cloud. Out of scope: Windows, audio, file teleport, presence cursors, macOS guests.

## Facts this plan depends on

Repos read at their main branch on the plan dates (2026-10-24, updated 2026-11-06).

**cua-spacesd (one daemon for host and container)**

- One process serves port 3211: gRPC and gRPC-Web services `System`, `Process`, `Filesystem`, `Computer`, `Windows`, `Accessibility`, `Stream`, plus `/mcp`, `/media`, `/files` and an HTML5 viewer at `/viewer/`. (cua `libs/cua-spacesd/README.md`)
- Releases ship `aarch64-unknown-linux-gnu` and `aarch64-apple-darwin` binaries with sha256 and sigstore files; 0.12.1 is current on 2026-11-06. (GitHub releases `cua-spacesd-v*`)
- On Linux: X11 capture (XShm/Composite) of desktop and windows, AT-SPI accessibility, OpenH264 software encoding. (README, Platforms)
- On macOS it runs as a LaunchAgent in the GUI session (`com.trycua.spacesd`, token file `~/.cua/spacesd/token`), with ScreenCaptureKit and VideoToolbox H.264. It needs Screen Recording and Accessibility grants for a stable signed identity. (README, Platforms; `packaging/macos/`)
- `System.GetCapabilities` reports features such as `a11y`, `background_input`, `desktop_stream`, `window_stream`, `h264_sw`, `h264_hw`; an unsupported feature carries a `limitation` string. (README, Capabilities)
- `ComputerService` has `Screenshot`, `Pointer`, `Keyboard`, clipboard, cursor and display calls. `/mcp` is Streamable-HTTP MCP over the cua-driver tool registry. (`computer.proto`; `crates/cua-spacesd-server/README.md`)
- Input leases: two principals can drive two windows at once; a window held by another principal refuses input until its lease is idle for 5 s. (`libs/cua-spacesd/docs/streaming-design-notes.md`)
- Listen: `127.0.0.1:3211` without a token, `0.0.0.0:3211` with one (`CUA_ENV_TOKEN`, `--token-file`, `--listen`). Clients send `authorization: Bearer <token>` or `x-cua-env-authorization`. (README, Run and Token)
- `System.CreateViewerTicket`: TTL 1 hour by default, 24 hours at most, a session policy (view only or full input), a principal shown to others; returns `viewer_path` = `/viewer/#ticket=<ticket>`. Not scoped to a window. Rotating the token revokes every ticket. (`system.proto`)
- The viewer works under any path prefix and keeps the ticket in the URL fragment. Video is H.264 over the `/media` WebSocket with WebCodecs, PNG frames when `VideoDecoder` is missing (plain HTTP). (`cua-spacesd-html5/web/src/`; `MEDIA.md`)
- License: FSL-1.1-MIT for cua-spacesd and the viewer, fine for a self-hosted single-owner product. Rest of the repo MIT.

**Cua's Linux image (the per-bot computer)**

- `ghcr.io/trycua/linux`, amd64 and arm64: Ubuntu 24.04, XFCE on Xvfb `:1`, AT-SPI, Chromium (managed policy: no sign-in, sync, password manager or first-run), xdotool, cua-spacesd with the viewer, supervisord as PID 1, desktop user `cua` (UID 1000), `EXPOSE 3211` and `3212/udp`. (`libs/images/linux/Dockerfile`, `image.json`)
- Docker builds use the `docker-` tag prefix, for example `docker-build-slim-20261003-66e0b66-arm64`, about 485 MB compressed. The slim tier is enough. (registry tags, 2026-11-06)
- Docker's default seccomp profile blocks Chromium's user-namespace sandbox ("No usable sandbox!"). A copy of the default profile that also allows `clone`, `clone3`, `unshare` and `setns` keeps the sandbox on without `--no-sandbox` or extra capabilities. (Orbs spike on Debian Chromium, 2026-11-06; to confirm on Cua's image)

**Cua's TypeScript packages**

- `@trycua/cua` 0.10.1 on npm: the cua SDK for Node and the browser on a Rust core (`@ubjs/core`, `@ubjs/node`). Its `SpacesdClient` has `callJson(method, json)` for unary `cua.env.v1` RPCs in proto3-JSON, plus `spawn`, `upload` and `download`. Whether Bun loads it is checked in phase 1.
- `@trycua/pi-durable` 0.1.0 (MIT, not on npm, `libs/cua/typescript/integrations/pi-durable`): `SpacesExecutionEnv`, Pi's `ExecutionEnv` on a Space (needs the `process.exec_ledger` capability), and `durableSpaces()` with fenced commands and workspace or machine checkpoints that keep a Space consistent with the conversation log across crashes. It has no computer-use tools; it is the base for running a bot's file and shell tools inside its computer later.

**Orbs**

- File and shell tools run on the host through Pi's `NodeExecutionEnv`, built in `runtimeEnvNative()` (`packages/runtime/src/services/runtime/runtime-env.utils.ts`). They stay on the host.
- Pi tasks can end a phase in a stored sleep (`status: 'sleeping'`, `until`), which survives restarts and needs no live invocation; each store arms one host alarm at its earliest deadline (`runtime-query.next-deadline.ts`).
- The MCP service accepts an HTTP server with `url`, `headers` and `headerCredentials`. (`packages/runtime/src/types/mcp.types.ts`)
- The daemon is one `Bun.serve` with HTTP routes and a WebSocket upgrade for `/rpc` (`apps/daemon/src/core/core.native.ts`). Mobile already depends on `react-native-webview`.
- The bot details pane on web lists To-dos, Routines and Media sections (`apps/web/src/components/rooms/rooms-details.tsx`); mobile has `bots/[botId]/details.tsx`.

## Design

### One computer model

```ts
// packages/contracts/src/types/computer.types.ts
export const computerTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bot') }),   // the bot's own container, available to every bot
  z.object({ kind: z.literal('host') }),  // the owner's Mac, only for bots the owner allows
]);

export const computerState = z.enum(['off', 'starting', 'running', 'sleeping', 'stopping']);

// what runtime and server need to reach a computer, never sent to clients
type ComputerConnection = { url: string; tokenCredential: string };
```

- Every bot can use its own container computer without a setting. The host is a bot setting the owner turns on.
- Container: one per bot, named `orbs-computer-<botId>`, its token generated by Orbs and kept in the credentials service, port 3211 published only on `127.0.0.1` with a random host port.
- Host: one `cua-spacesd` at `http://127.0.0.1:3211`, explicitly bound to loopback with a token.

### Ownership

| Part | runtime (Pi) | server (product) | daemon (transport) | clients |
| --- | --- | --- | --- | --- |
| Container lifecycle | `computer` domain: Docker driver (native), start, wake, sleep, shut down, status; lifecycle task with time limits | status, owner actions and time-limit settings over RPC | none | Computer section and page |
| Host setup | none | detect `cua-spacesd`, capabilities and grants | none | "Use this Mac" row with permission status |
| Token | none | one token per computer through the credentials service | none | none |
| Screen tools | `bot_computer_*` over `Computer`, `Windows`, `Accessibility` | passes the connection to runtime | none | tool cards with the screenshot |
| Browser tools | `bot_browser_*` over Chromium's DevTools Protocol in the container | none | none | tool cards |
| Thumbnail | screenshot after bot actions and while a viewer polls | thumbnail RPC | none | Computer section in bot details |
| Watch and take over | `bot_computer_handoff` on the question flow | viewer ticket RPC | `/computers/<botId>/` proxy | viewer page |
| Permissions | action types `computer` and `browser`; host app allowlist | defaults per bot | none | allowlist editor (host) |

### 1. Lifecycle of a bot's computer (runtime)

| State | Container | Comes back by |
| --- | --- | --- |
| off | none; the home volume keeps browser profile, logins and files | any start, a few seconds |
| running | up | – |
| sleeping | `docker pause`: no CPU, memory and open windows kept | any action, near instantly |
| off (after shutdown) | `docker stop`, memory freed | any start |

- **Activity** is a bot computer or browser call, an owner action, or an open full viewer. Thumbnail polling is not activity.
- **Time limits** (defaults, owner-editable): sleep after 5 minutes without activity, shut down after 30 minutes asleep, shut down 2 hours after start regardless.
- The bot and the owner share one set of actions: start (or wake), sleep, shut down, status. Computer and browser tools start or wake the computer when needed, so the bot never has to.
- One `bots.computer` Pi task per bot holds the deadlines in a session document and ends each phase in a stored sleep until the next one, so restarts never leave a computer running. The deadline query includes it; it does not count as live work.
- Startup stops any `orbs-computer-*` container that has no live task. Deleting a bot removes its container, volume and token.
- Limits per container: 1.5 GB memory, 1 CPU, 1 GB shared memory, the Chromium seccomp profile.

### 2. Screen tools (runtime)

Same names and shape for container and host.

| Tool | Does |
| --- | --- |
| `bot_computer_start()` / `bot_computer_sleep()` / `bot_computer_shutdown()` / `bot_computer_status()` | lifecycle; status includes state, time left and open windows |
| `bot_computer_windows()` | list windows with app, title and id |
| `bot_computer_read({ mode, windowId? })` | `screenshot` of a window or the display, or `tree` (accessibility tree as text) |
| `bot_computer_act({ windowId?, action, x?, y?, text?, keys?, dx?, dy? })` | click, double click, right click, drag, move, type, key, scroll |
| `bot_computer_handoff({ instructions, windowId? })` | pause the turn and show "Take over" to the owner |

```ts
// packages/runtime/src/services/computer/computer-tool.read.ts
const { image } = await computerCall(connection, 'cua.env.v1.ComputerService/Screenshot', { window: { id: windowId }, format: 'png' });
return { output: [{ type: 'image', data: image, mimeType: 'image/png' }] };
```

- In the container, display coordinates are fine and the whole screen is the bot's. On the host, actions target a window, never raw screen coordinates, so the owner's mouse stays put.
- If the owner holds the input lease, the action fails with "The owner is using this computer" and the bot waits or asks.
- Keep the last two screenshots whole in the prompt; prune older ones deterministically.

### 3. Browser tools (runtime)

Cheaper and more reliable than pixels on ordinary pages; the visual tools cover everything else (Chromium's own UI, dialogs, canvas apps).

| Tool | Does |
| --- | --- |
| `bot_browser_open({ url })` | start the computer if needed, open or reuse a tab |
| `bot_browser_snapshot()` | the page's accessibility snapshot with element references |
| `bot_browser_act({ ref, action, text?, keys? })` | click, fill, select, press on an element |
| `bot_browser_tabs()` | list, switch and close tabs |

- Chromium's DevTools port stays inside the container and is reached through the container's published loopback port; `playwright-core` connects over CDP.
- Whether cua-driver's browser core can replace Playwright is checked in phase 1.

### 4. Safety (runtime permission hook)

- `read`, `status`, `windows`, `snapshot` and `tabs` follow the normal read policy.
- Acting tools follow the bot's permission mode. The container is the bot's own sandbox, so no app allowlist there.
- Host: `bot_computer_act` asks before acting on an app not in the bot's allowlist; "Always allow" adds the app. A fixed denylist always asks: Terminal, System Settings, Keychain Access, password managers, Orbs itself. Background turns act only on allowlisted apps.

### 5. Watch, control and take over (server, daemon, clients)

**Bot details.** A **Computer** section in the bot details pane (web and desktop) and on the mobile details screen: thumbnail, state with time left ("Running · sleeps in 4 min"), and Start, Sleep and Shut down. While running, the thumbnail refreshes every few seconds only while the section is visible; otherwise it shows the last screenshot, dimmed, with the state. Tapping it opens the full view.

**Full view.** Web `/rooms/direct/$handle/computer`, mobile `bots/[botId]/computer`: the Cua viewer in an iframe or WebView, the same buttons, and **Take over** / **I'm done**. Watching counts as activity.

**Viewer ticket.** A paired device calls `computer.viewer({ botId, mode })`; the server mints a ticket with the computer's token and returns a daemon URL. The token never leaves the daemon.

```ts
// packages/server/src/services/computer/computer-action.viewer.ts
const { ticket } = await computerSystem(connection).createViewerTicket({
  ttl: { seconds: 600n },
  policy: mode === 'watch' ? 'SESSION_POLICY_VIEW_ONLY' : 'SESSION_POLICY_ALLOW_ACTIVATION',
  principal: { id: device.id, name: device.name },
});
return { url: `${daemonOrigin}/computers/${botId}/viewer/#ticket=${ticket}` };
```

**Proxy.** One daemon route forwards HTTP and WebSocket traffic to the computer, adding no credentials; `cua-spacesd` checks the ticket on every call and media socket. The web server proxies `/computers/*` to the daemon like `/rpc`.

**Take over.** "Take over" opens a full-input ticket; the owner's input lease blocks the bot. `bot_computer_handoff` reuses the question flow; "I'm done" answers it.

**Host stream.** By default the viewer opens the window the bot last acted on, not the whole display. The owner can switch to the full display.

### 6. The owner's Mac (server, runtime)

- The owner installs `cua-spacesd` once (signed app or `packaging/install.sh`) and grants Screen Recording and Accessibility. Orbs does not install it; settings show a short guide and live status from `GetCapabilities`.
- The token is generated by Orbs, written to the daemon's token file and kept in the credentials service.
- Same tools, viewer and proxy as the container; lifecycle tools report that the host is always on.

## Streaming

Recommended: **Cua's own stream through the daemon proxy** for container and host: damage-driven and rate-controlled, with window targets, input leases, view-only tickets and a ready viewer page.

Rejected: macOS Screen Sharing (whole screen, weak auth), noVNC (no rate control, tickets and input sharing built by hand), WebRTC (signaling, TURN, native iOS module), screenshot polling for the live view (a few frames per second, no shared input; kept only for the thumbnail), a native iOS decoder (later, if the WebView is not smooth enough).

Auth: only a paired device can call `computer.viewer`. Tickets last 10 minutes, carry the device as principal and live in the URL fragment.

## Phases

1. **Container spike.** Run Cua's slim arm64 image with a token on loopback, the seccomp profile and a home volume. From a Bun script: `GetCapabilities`, `Screenshot`, pointer and keyboard on the display, the accessibility tree, the `/mcp` tool list, `CreateViewerTicket` and the viewer through a hand-written proxy. Open Chromium on demand and drive it over CDP. Measure cold start, pause and unpause (do the gRPC and CDP connections survive?), stop and start with the profile kept, thumbnail time and size, memory running and paused. Check whether the image's spacesd needs updating to the current release.
2. **Runtime.** `computer` domain with the Docker driver, the lifecycle task and time limits, `bot_computer_*` and `bot_browser_*` tools, permissions.
3. **Owner controls on web and desktop.** RPCs (status, start, sleep, shut down, thumbnail, viewer), the daemon proxy, the Computer section, the full view, Take over and handoff.
4. **Mobile.** The Computer section on the details screen and the full view.
5. **Cleanup and settings.** Time-limit settings, removal with the bot, stopping leftover containers at startup.
6. **Host spike and product.** `cua-spacesd` on the Mac, host target in bot settings, app allowlist and denylist, window-first viewer.

## Open questions

- Does the image's Chromium sandbox work with the narrowed seccomp profile? Check in phase 1.
- Can the viewer open a given window target from its URL, or does the window pick need a small change? Check in phase 1.
- Should a computer be reachable from outside the LAN only through Tailscale, or also through Cua's relay? Default Tailscale only.
- Later: run a bot's file and shell tools inside its computer (`SpacesExecutionEnv`, MIT, Linux only).

## Risks

- **Real Mac, real damage.** A wrong click on the host hits real files and accounts. Mitigated by the app allowlist, the denylist and asking by default.
- **Owner and bot collide.** The input lease blocks the bot and the tool says so. Some host apps only take foreground input; `background_input` reports this per window.
- **Ticket is not window-scoped.** A full-input ticket can open any window or the whole display. Only paired devices get tickets.
- **Secure context.** WebCodecs needs HTTPS; over plain HTTP the viewer falls back to PNG frames. Tailscale HTTPS gets H.264.
- **Young APIs and images.** cua-spacesd moves fast (0.9 to 0.12 in a week) and the published Docker image lags it. Pin the image and binary, keep every Cua call behind the `computer` domain.
- **Resources.** About 1.5 GB of memory per awake computer; a 16 GB Mac fits three or four. Time limits keep idle ones asleep or off.
- **Screenshot cost.** Prune old screenshots deterministically so the prompt cache stays warm.

## Sources

- [Cua repository](https://github.com/trycua/cua): `libs/cua-spacesd/README.md`, `libs/cua-spacesd/docs/streaming-design-notes.md`, `libs/cua-spacesd/packaging/`, `libs/cua/proto/MEDIA.md`, `libs/cua/proto/cua/env/v1/{computer,system,stream}.proto`, `libs/cua/crates/cua-spacesd-html5/web/src/`, `libs/cua/typescript/integrations/pi-durable/`, `libs/images/linux/` (Dockerfile, image.json, release.json)
- [Cua local runtimes](https://cua.ai/docs/cua-sdk/guides/local-runtimes)
- [Rakazo](https://github.com/elie222/rakazo) `docs/computer-runtime.md`: Linux screens use noVNC; exclusive take-control lease
- Pi Durable 1.4.0 README, Environment, Tools and Sleeping sections
