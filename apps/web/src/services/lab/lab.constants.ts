import { mentionHref } from '@repo/client/client';

export const LAB_CHAT = {
  ids: {
    atlas: '6f1c2b8e-3a4d-4e5f-9a1b-2c3d4e5f6a7b',
    scout: '7a2d3c9f-4b5e-4f60-8b2c-3d4e5f6a7b8c',
    ledger: '8b3e4d0a-5c6f-4071-9c3d-4e5f6a7b8c9d',
    nova: '9c4f5e1b-6d70-4182-8d4e-5f6a7b8c9d0e',
    artifact: 'a0d16f2c-7e81-4293-9e5f-6a7b8c9d0e1f',
    blocks: 'c2f3814e-9a03-44b5-9071-8c9d0e1f2a3b',
    page: 'd3a4925f-0b14-45c6-a182-9d0e1f2a3b4c',
    routine: 'b1e2703d-8f92-43a4-8f60-7b8c9d0e1f2a',
  },
  minuteMs: 60_000,
  media: {
    sampleRate: 8000,
    audioSeconds: 6,
    videoSeconds: 3,
    videoFps: 24,
    landscapes: [
      { name: 'north-terrace.svg', sky: '#d9e2e8', far: '#a9b9ae', near: '#7d9486', sun: '#f1ead8' },
      { name: 'hall-wide.svg', sky: '#ebe3d6', far: '#c9b8a2', near: '#9a8670', sun: '#f6f0e6' },
      { name: 'garden.svg', sky: '#dfe8dc', far: '#b5c8ad', near: '#8aa37f', sun: '#f4f1e2' },
      { name: 'entrance.svg', sky: '#5d6470', far: '#474d57', near: '#2f343b', sun: '#d9cfb8' },
      { name: 'parking.svg', sky: '#e4e4ea', far: '#c3c3cf', near: '#9d9db0', sun: '#f5f2ea' },
      { name: 'west-view.svg', sky: '#e8ddd0', far: '#c7ad94', near: '#a3826a', sun: '#fbf3e4' },
    ],
  },
  page: `<meta name="emoji" content="🚀">
<title>Launch status page</title>
<div class="o-stack">
  <div class="o-grid">
    <div class="o-stat"><span class="o-label">Uptime</span><span class="o-value">99.98%</span><span class="o-up">+0.02%</span></div>
    <div class="o-stat"><span class="o-label">Paired devices</span><span class="o-value">412</span><span class="o-up">+38 this week</span></div>
  </div>
  <div class="o-list">
    <div class="o-row"><span>Pairing service</span><span class="o-muted">Operational</span></div>
    <div class="o-row"><span>Push notifications</span><span class="o-muted">Operational</span></div>
    <div class="o-row"><span>Model gateway</span><span class="o-muted">Degraded since 09:12</span></div>
  </div>
  <div class="o-card">
    <div><div class="o-title">Incidents this week</div><div class="o-muted">Two short outages, both resolved.</div></div>
    <div class="o-list">
      <table class="o-table">
        <thead><tr><th>Service</th><th>Started</th><th style="text-align:right">Duration</th></tr></thead>
        <tbody><tr><td>Push</td><td>Tue 14:02</td><td style="text-align:right">6 min</td></tr><tr><td>Gateway</td><td>Thu 09:12</td><td style="text-align:right">18 min</td></tr></tbody>
      </table>
    </div>
  </div>
  <div class="o-row-wrap"><span class="o-badge">Launch week</span><button type="button" class="o-button">Refresh</button></div>
</div>`,
  changelog: '**Launch week**\n\n- New onboarding gets you to a first message in under two minutes.\n- Pair iOS devices with a QR code.\n- Bots can build dashboards and pages.\n- Fixed pairing failures on iOS 18.4.',
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<rect width="640" height="360" fill="#f4f4f5"/>
<g fill="#a1a1aa">${[60, 92, 74, 130, 118, 176, 210].map((height, index) => `<rect x="${60 + index * 80}" y="${300 - height}" width="44" height="${height}" rx="8"/>`).join('')}</g>
<path d="M82 228 L162 196 L242 214 L322 158 L402 170 L482 112 L562 78" fill="none" stroke="#18181b" stroke-width="4" stroke-linecap="round"/>
<text x="40" y="44" font-family="Inter, sans-serif" font-size="22" font-weight="600" fill="#18181b">Daily signups</text>
</svg>`,
  csv: 'day,signups,activated\nMon,142,61\nTue,188,84\nWed,171,79\nThu,230,112\nFri,214,103\nSat,276,140\nSun,318,171\n',
  html: `\`\`\`html
<!doctype html>
<html>
  <head>
    <title>Launch countdown</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 24px; background: #fafafa; color: #18181b; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      .row { display: flex; gap: 12px; }
      .cell { flex: 1; background: white; border: 1px solid #e4e4e7; border-radius: 16px; padding: 16px; text-align: center; }
      .cell b { display: block; font-size: 28px; }
      .cell span { font-size: 12px; color: #71717a; }
    </style>
  </head>
  <body>
    <h1>Launch countdown</h1>
    <div class="row">
      <div class="cell"><b>3</b><span>days</span></div>
      <div class="cell"><b>14</b><span>hours</span></div>
      <div class="cell"><b>27</b><span>minutes</span></div>
    </div>
  </body>
</html>
\`\`\``,
  report: `## Launch week recap

Signups grew **every day** and closed the week at **1,539** (+38% on the week before). Activation held at 49%.

| Day | Signups | Activated |
| --- | ---: | ---: |
| Mon | 142 | 61 |
| Thu | 230 | 112 |
| Sun | 318 | 171 |

### What moved the numbers

1. The Product Hunt launch on Thursday drove 41% of the week's traffic.
2. The new onboarding cut time-to-first-message from 4m 10s to 1m 52s.
3. Pairing on iOS failed for 3% of devices; the fix shipped Friday.

> Retention is the next thing to watch: the day-7 cohort lands on Monday.

Next steps:

- [x] Draft the recap
- [ ] Share it with [@Ledger](${mentionHref({ kind: 'bot', name: '8b3e4d0a-5c6f-4071-9c3d-4e5f6a7b8c9d' })}) for the revenue split
- [ ] Schedule the Monday retention check`,
  code: `Here is the query I used, so you can rerun it:

\`\`\`ts
const week = await db
  .select({ day: signups.day, total: count() })
  .from(signups)
  .where(between(signups.createdAt, start, end))
  .groupBy(signups.day);
\`\`\`

And the shell one-liner for the raw export: \`bun run export --since 7d > signups.csv\`.`,
} as const;
