# Orbs design language

The design authority for `apps/web`. New and edited code follows this
file everywhere; untouched surfaces keep their current look until a
change reaches them. Where code and this file disagree, this file wins.

Each section says what is allowed and recommended; § Forbidden is the
hard list, and everything on it blocks new code in review.

## Posture

Orbs is a personal messenger where the other side is a room of bots.
It should feel like a calm, native chat app: soft, monochrome, quiet,
and quick to read.

- The conversation is the focal object. The sidebar, title pill,
  details panel, and composer recede around it.
- The orbs carry the personality. Bot avatars (`BotAvatar`) are the
  only expressive element on screen; the chrome and the copy stay
  plain so they do not have to compete.
- Show real state, never theatre. Who is answering, why they were
  woken, what a bot is doing, and what it cost are always one glance
  or one click away, and nothing moves unless a run is really live.
- Calm beats clever. If a detail does not help the reader follow the
  conversation or act on it, it is not on the screen.

## shadcn first

- Every surface starts from the stock primitives in
  `apps/web/src/components/ui/` (shadcn `new-york` on Radix) and the
  chat primitives in `ui/ai/`. When a control is missing, add the
  shadcn registry version (`bunx --bun shadcn@latest add <name>`), then
  adapt. Hand-rolling a control the
  registry ships is the main failure this file exists to prevent.
- The vocabulary is shadcn's and Tailwind's: semantic color tokens,
  Tailwind's type, spacing, and radius scales, `size-*` and `gap-*`.
  No parallel Orbs naming for anything they already name.
- `cn` from `@/lib/cn` composes classes; variants use
  `cva`.

## Legacy

The kit carries names that neither shadcn
nor Tailwind ship. They are not migrated in bulk; they die file by
file:

- **Never add one**, anywhere, including a new call site of an
  existing one.
- **Edit a component, align that component.** When a change edits a
  file that uses a legacy name, every legacy use in that file moves to
  the stock equivalent in the same change, and the result is checked on
  screen. Pixels may move toward this file; that is the point.
- **A primitive keeps a legacy variant while anything still uses it.**
  Editing `button.tsx` or `badge.tsx` does not mean renaming variants
  across the app; delete a legacy variant once its last caller is gone.
- No stock equivalent fits? Ask before inventing one.

The list (stock equivalents in brackets):

- Button variants `primary` (`default`), `red` (`destructive`),
  `transparent` (`ghost`), `filled`, `filled-accent`, `accent`,
  `green`, `yellow`, `blue`, `outline-primary`, `outline-green`,
  `outline-yellow`, `outline-red`, `select`; sizes `xl`, `xxl`. Stock
  is `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
  and sizes `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`,
  `icon-lg`.
- Badge variants `primary` (`default`), `outline-secondary`,
  `success`, `warning`, `blue`, `purple`, `muted`, `soft`, and
  `BadgeFancy`. Stock is `default`, `secondary`, `destructive`,
  `outline`, `ghost`, `link`; state tints use the status tokens.
- Type classes `text-title-h*`, `text-label-*`, `text-paragraph-*`,
  `text-subheading-*`, `text-doc-*` (nearest Tailwind ladder step).
- The hex palettes and aliases in `styles.css` (`--color-blue-*`,
  `--color-red-*`, `--color-gray-*`, `--blue`, `--color-primary-*`
  alphas, `--orbit-color`) and Tailwind palette classes in feature
  files such as `text-red-600` or `bg-gray-300` (the semantic token).
- Uppercase labels, Phosphor icons (Lucide).

## Primitive or app component

- **`ui/` is the design system.** A file belongs there when its whole
  job is appearance: styling, states, and variants with no domain
  knowledge (`button.tsx`, `tabs.tsx`, `editable-text.tsx`).
- **Everything else is app.** `rooms/`, `bots/`, `layout/` and the
  other domain folders compose primitives and add meaning. They
  arrange; they do not restyle. Layout classes (width, flex, grid,
  overflow, placement) are theirs; appearance classes on a primitive
  mean the primitive is missing a variant.
- A component owns its own classes. A parent never sets appearance on
  a component it renders. `className` still forwards, for layout only:
  width, flex and grid constraints, contextual margin, overflow.
- Caller opacity is allowed for emphasis and visibility. Prefer `showOnHover`
  when available. Muted actions use `Button variant="quiet"` so their
  focus ring, children and disabled state retain their contrast. Exact component
  contracts in `packages/tooling/src/oxlint/shadcn.ts` document caller-owned
  container spacing and one-off exceptions; other appearance remains restricted.

## Variants

Variants are how the kit grows. Create them; do not route around them.

- **Variant before override.** When a call site needs a different look,
  use an existing variant or size. If none fits and shadcn's registry
  ships one (button `xs`, `icon-sm`, `icon-xs`), copy it into the
  primitive. Only then consider a new one.
- **Repetition makes a variant.** A genuine one-off appearance may ride
  the call site's `className`. The second call site with the same look
  in the same role makes it a variant or base style, in that change.
- **Hand-styled is a missing primitive.** A `<button className=…>` with
  its own border, radius, and shadow is a `Button` variant or a new
  `ui/` file, not a feature-file detail.
- **Every styled slot uses `cva`**, with variants defined in the
  primitive file. Names follow shadcn's vocabulary: `default`,
  `secondary`, `outline`, `ghost`, `destructive`, `link` for
  appearance; `xs`, `sm`, `default`, `lg` and `icon-*` for size.
- **Only three styling axes:** `variant` owns appearance/color; `size`
  owns scale (type, icons, height and proportional spacing); optional
  `density` owns compact/default/relaxed spacing and line height at the
  same scale. Add density only when the component needs those modes.
- **No parallel styling props.** `tone`, `surface`, `color`, `emphasis`,
  `appearance`, padding/radius props, and equivalent renamed axes are
  banned. Fold a legitimate look into `variant`, use an existing size,
  or remove the override. Renaming a workaround does not justify it.
  Behavioral/data props such as `disabled`, `isActive`, `multiline` and
  `activity` remain valid; appearance should follow their real state.
- **A size is whole.** Text, icon, padding, height, and gap scale
  together; a `sm` with a full-size icon is broken.
- **Domain state maps to a variant, never to classes.** `activity ->
  'idle' | 'live' | 'failed'` is data in the app; the styling stays in
  the primitive.
- **Earn it.** A variant exists because the component really shows up
  in that look in more than one place. A variant made for one call
  site, or a color axis invented once, is slop.
- **Edit a component, clean its overrides.** Same rule as § Legacy:
  when a change edits a file, its repeated appearance overrides move
  into variants in the same change. Today's examples: `RoomsChatPill`
  hand-styles a `<button>`; `RoomsChatActivity` turns `size="sm"` into
  an extra-small button with `h-6 px-2 text-xs`; the reply and sidebar
  `+` buttons shrink `size="icon"` with `size-7`/`size-8` instead of a
  stock `icon-sm`.

## Layout

The app is three panes and one canvas:

- **Sidebar** (`layout-app-sidebar.tsx`): Pinned chats, group rooms under Rooms,
  then direct chats under DMs, with the user at the bottom. Empty sections are hidden;
  every bot's DM stays listed while the bot exists. Rows are one avatar, a
  name, and one muted line of the last message, truncated. Header actions (today the `+`) are round ghost icon
  buttons.
- **Start bar** (`RoomsStart`): with no room open, the canvas is a soft
  "To:" bar whose list holds Create group, Create bot, then every bot's DM,
  filtered by name as you type. The sidebar `+` opens it on `/rooms?start=true`
  (closing the mobile sidebar first, and focusing the input only on desktop);
  its ✕ goes back in history.
- **Chat** owns the remaining width and height. A floating title pill
  (`RoomsChatPill`: member avatars, room name, subtitle) sits at the
  top and opens the details panel. The composer floats at the bottom
  and takes focus when a room opens on desktop (never on mobile, so the
  keyboard stays down). An empty room shows no placeholder.
  Everything between them scrolls.
- **Details panel** (`rooms-details.tsx`): the room's avatars and
  title at the top, then `Details | Media | Settings` tabs. Title and
  description edit in place (`EditableText`) and never look like form
  inputs. Details ends with a muted label/value list (last activity, mode, leader,
  created); Settings holds the room form (`RoomsForm`) that the create and settings
  dialogs also use. The panel opens 320px wide (`defaultWidth`), wider than the
  256px navigation sidebar, so its tabs fit.
- Every pane collapses on narrow screens; the chat is the one that
  stays. Panels reflow before anything shrinks.

## Chat

- **Bubbles come from `MessageContent`.** The human's bubble is
  `primary` (black in light mode), aligned right. A bot's bubble is
  `secondary` (soft grey), aligned left, with its orb at the bottom
  edge and its name above the whole reply (`MessageStack`) in `text-xs font-medium
  text-muted-foreground`. Bubbles are `rounded-2xl`; the reply caps
  at 80% on desktop. A reply split by tool calls becomes several bubbles,
  and only the last one keeps the tail.
- **Peers look identical.** Every bot bubble has the same shape, type,
  and spacing, whoever wrote it and however long it is. Bot identity
  comes from the orb and the name, never from a bubble tint.
- **Bubbles carry only the message.** Routing (`RoomsChatRoute`: why
  these bots, Jev's match scores, bots not in the room), the sent time and
  a bot's usage live in the message's Details (`RoomsChatInfo`), never
  inline under the bubble.
- **Live work is one quiet row.** `RoomsChatActivity` shows the orb and
  one sentence (thinking, queued behind another bot, waiting for a
  daemon). Streaming text and a running tool row speak for themselves,
  so the row hides while either is live.
- **Tool calls sit outside the bubble.** Consecutive tool parts render
  as one `RoomsChatTools` group between the bubbles, never inside them,
  its content aligned with the bubble's left edge. Each call is an h-6
  `ToolTrigger` row in `text-xxs`: the bot's 14px orb (moving only while
  its tool runs), tool icon (swapping to a chevron on hover, focus, or
  open), the name in `font-mono`, the preview (the command, query, or
  file name) as plain muted mono text with no chip, and its state icon on
  the right. Two or more calls collapse into one "N tool calls" row with
  the same layout (orb, a Lucide `hammer` that swaps to a chevron the
  same way, the label, the group's combined state icon); expanding it
  lists every call with its orb. A call awaiting approval always stays
  visible and open. Input and output open below the row in a `border-l` detail
  (`ToolCode`, `text-xxs`, scrolls, never wraps). Rows and the group
  animate open with `toolEase` and keep `motion-reduce` fallbacks.
- **Message actions** (`RoomsChatActions`: react on bot replies, reply,
  copy, Details) sit next to the bubble as muted `icon-xs` ghost buttons
  with no gap, shown on hover and keyboard focus; Details is a popover.
  On touch screens they collapse into one ⋮ button, and a long-press on
  the bubble opens the same bottom sheet: quick emoji (the smiley-plus
  opens the full picker in place), Reply and Copy as full-width rows,
  then Details already open. Quick emoji are `text-base` in the popover.
- **Bot text is rendered, not restyled.** Markdown from a bot goes
  through `Response`; never post-process its words or punctuation.
  `Response` owns the markdown look: small headings (`text-base` and
  `text-sm`), outside list markers in `text-muted-foreground`, compact
  tables (`text-xs`, cells never wrap, the frame scrolls sideways),
  code that scrolls instead of wrapping, and links that keep the bubble's
  colour with a soft underline. Same-origin links navigate in the app;
  other links open in a new tab.
- **Files sit above the bubble.** A message's images render as
  `rounded-xl` thumbnails (`max-h-64`, opening the file in a new tab)
  and documents as `outline` `sm` buttons (Lucide `file-text`, the
  name) that download it, stacked on the bubble's side
  (`RoomsChatFiles`); a file-only message has no bubble. In the
  composer each attachment is a muted `rounded-xl` chip
  (`PromptInputAttachment`: thumbnail or `file-text`, name, a spinner
  while uploading, remove) in the quote's slot; Send waits for uploads,
  and a failed upload or a bot that cannot see images shows in the
  destructive drawer.
- **Group and direct rooms share one design.** Nothing changes between
  them but the routing Details explain.

## The orbs

- `BotAvatar` owns every bot avatar variant (blob, color, emoji,
  image). Never render a bot avatar any other way.
- The blob's face and movement follow real run activity
  (`run.activity`). Historical messages, sidebar rows, and anything not
  live stay still (`animate={false}`). The one exception answers the
  user's own touch: an idle blob hovered for 1.2s, or pressed, glides to
  `happy` and moves until the pointer leaves (`useBotCheer`), then glides
  back and stops.
- An orb is identity and state, never decoration: no orbs filling
  empty space, watermarks, or loaders made of orbs. A choice list may
  offer the real bots (`RoomsStart`), because that is an action.
- The leader crown (`BotLeaderMark`) is the only mark added to a bot
  name.

## Color

- **Monochrome by decision.** Black, white, and greys from the shadcn
  tokens: `background`, `foreground`, `card`, `popover`, `primary`,
  `secondary`, `muted`, `muted-foreground`, `accent`, `border`,
  `input`, `ring`, `sidebar-*`, plus `destructive`, `success`, and
  `warning` for state.
- **Color only encodes state**, and always pairs with a non-color cue
  (a label, an icon, a position). `destructive` is for errors and
  destructive actions, never emphasis. The one place users bring color
  in is their bot's avatar.
- **Skills are the one accent.** `skill` (a soft mint green) tints a
  skill pill's fill, border and Lucide `box` icon; the pill's text
  keeps the surrounding color. Nothing else uses it, the skill's list
  row included.
- **Mention pills invert inside a user's bubble.** A bot, room or
  everyone pill takes the bubble's opposite: `primary-foreground` fill
  and `primary` text, no border (white on the black bubble in light
  mode, dark on the light bubble in dark mode). Outside a user's bubble
  it stays a faint outline in the surrounding text color.
- **Light and dark are both first-class.** `.dark` owns the dark
  values; check both before shipping.
- The hex palettes, palette classes, and color variants are legacy
  (§ Legacy).

## Typography

- **Inter for everything.** Monospace (`font-mono`) only for code,
  paths, tool names, and short identifiers, set on the identifier, not
  its sentence.
- **Tailwind's own ladder:** `text-xs`, `text-sm` (the UI default),
  `text-base`, `text-lg`, `text-xl`, `text-2xl`. `text-xxs` (11px) is
  the one extension, for small metadata (tool previews, labels).
  A new step needs user approval.
- The named type scale (`text-label-*` and friends) is legacy
  (§ Legacy).
- Weight and `text-muted-foreground` do the hierarchy work. Peers share
  size and weight; aligned numbers use `tabular-nums`.
- **Sentence case everywhere.** No all-caps or tracked labels,
  eyebrows, or kickers (the sidebar's uppercase Direct label is legacy).
- Headings and empty states get `text-balance`; long copy gets
  `text-pretty`. Tiny muted copy is never the fix for density.

## Shape, surfaces, spacing

- Radii come from the theme scale (`--radius` is 0.625rem): `rounded-md`
  for controls, `rounded-lg`/`rounded-xl` for panels and popovers,
  `rounded-2xl` for bubbles, `rounded-full` for avatars, round icon
  buttons, and floating pills (title pill, composer). One radius per
  element class.
- The chat is one continuous canvas. A surface or border earns its
  place by showing interaction, selection, or a grouping spacing cannot
  show. No cards around messages, no cards in cards.
- `shadow-sm` is allowed only on elements that float above scrolling
  content: the title pill, the composer, popovers, and menus. Nothing
  else casts a shadow.
- Every gap has one owner: the parent's `gap` or stack. Children do not
  add competing margins. A heading sits close to its content; a new
  section sits clearly further away.

## Controls and disclosure

- Buttons use the stock shadcn variants: `default`, `secondary`,
  `outline`, `ghost`, `link`, `destructive`, plus `quiet` for repeated
  muted borderless actions, `link-muted` for disclosure toggles and
  `link-destructive` for a form's delete link.
  Icon-only buttons are round ghost buttons with an `aria-label` and a
  `title`.
- **Disclosure toggles** (a form's "Advanced", "Show more") are small
  muted text, never a button with a hover fill: `link-muted` at `xs`,
  a leading Lucide icon naming the section (`settings` for Advanced),
  the label, then a `chevron-down` that turns 180° when open. Hover
  underlines the label only. Centred under the fields it extends, with
  no divider lines around it. The section starts collapsed.
- **Focus rings are never cut.** A field's ring paints 3px outside it,
  so any container that clips (`overflow-hidden` for a collapsible or
  height animation) and holds fields leaves it room with no layout
  shift: a plain container takes `-m-1 p-1`; a primitive such as
  `CollapsibleContent` keeps its own spacing, so a wrapper `div` takes
  `-mx-1` and the inner layout takes `px-1`. `PopoverContent` clips
  inside its padding, so a popover whose buttons reach its edge takes
  `p-0` and puts the padding on its own content.
- **Delete is never invited.** An edit form never puts delete in its
  footer or as a filled button: it is the last item inside Advanced, a
  `link-destructive` at `xs` with a leading `trash-2`, left-aligned,
  opening the routed confirmation dialog. The footer holds only the
  primary action.
- **One action menu per object.** A room's actions (rename, copy id,
  reset, delete) live in one menu, opened from the ⋯ button, a
  right-click on its sidebar row, or a right-click on the panel header.
  Bots follow the same pattern (`BotMenuItem`).
- Every dropdown item has a leading Lucide icon naming its action.
- Edits and confirmations are routed dialogs: a child route renders the
  dialog and closing navigates back; destructive confirmations say exactly
  what is removed.
- Settings and metadata live in the details panel or a dialog, never as
  extra blocks in the chat.

## Memory in settings

- Room, bot and organization settings provide a quiet entry to saved
  memories. Browsing a large collection belongs in a focused view, not a long
  list appended to an edit form. No cards around individual facts.
- A row shows the fact and muted subject/origin. Edit, share and forget live
  in one always-reachable three-dot menu; sources open on demand.
- Search stays outside a bounded scrolling list. Fetch at most 30 rows per
  page, with previous/next navigation; never render the entire collection.
  Settings dialogs also cap their height to the viewport and scroll, so
  expanding memory cannot push the title or close control off screen.
  Long facts and source excerpts wrap. Loading uses row-shaped skeletons;
  empty search results and empty memory have distinct quiet copy.
- Clearing a whole scope is rare: a small `link-muted` with `eraser`, inside
  bot Advanced or at the end of room Settings. Never a primary action or
  an inline red button. It opens a routed confirmation that names the scope,
  explains what stays, and uses `destructive` only for the final confirmation.
  Pending and failed requests keep the confirmation open and preserve its
  retry identity. Clearing saved memory never promises to erase chat history.

## Icons

- Rooms use Lucide `hash` (`~icons/lucide/hash`, `#`) consistently in navigation, mentions and tool labels. Reuse the existing domain icon when adding a new surface.
- Lucide through `~icons/lucide/*`, nothing else (the one Phosphor
  import in `auth-form-verify-email.tsx` is legacy). Raw icon, sized
  with `size-*`, colored by the current text color.
- An icon names an action or a thing; it never decorates. Third-party
  brand marks (e.g. connected apps) are the only colored icons.

## Copy

- Every string goes through Paraglide (`m.*()`) in `en`; new copy gets no
  Portuguese translation.
  Design for about 30% length difference; never size a control to one
  language, never build a sentence from fragments.
- Plain, short, sentence case. Name the thing and the state ("Waiting
  for a daemon"), not the system's internals. No em dashes in UI copy.
- Never invent certainty: routing, budgets, and errors are stated as
  they happened.

## Motion

- Default to stillness. Motion explains a state change (a live orb,
  streaming text, a panel opening) or confirms an action; nothing else
  moves. Every animation has a `motion-reduce:` fallback.
- No scroll reveals, marquees, or decorative pulsing. A pulse marks a
  genuinely live run only.
- Loading is a skeleton that mirrors the loaded layout. `Spinner`-style
  waits are for inline actions (a submitting button), never a page or
  panel.

## States

Every surface designs all of them:

- **Loading:** skeletons, slot for slot.
- **Empty:** the `Empty` primitive, one sentence, one action (pick a
  bot, create a room). No members and no media are different states
  with different copy; no room selected shows the start bar instead.
- **Waiting:** queued behind a bot, waiting for a daemon, budget
  reached. Each says so in the activity row or the message's Details, and a human
  message is never left looking unanswered.
- **Error:** named, quiet, `destructive` text with `role="alert"`,
  next to what failed.

## Inspect before shipping

Render it and check, in order; fix the worst defect, render again:

1. Send a real message in a group room and a direct room; read the
   reply and its routing Details on screen.
2. Focus: is the conversation the obvious focal object?
3. Peers: are all bubbles, rows, and tabs of the same role identical?
4. Restraint: can any border, surface, shadow, pill, icon, or color be
   removed without losing meaning? Remove it.
5. Reach: does every hover action also work by keyboard and touch?
6. Themes and widths: light and dark carry the same hierarchy; narrow
   screens reflow without overflow.
7. States: loading, empty, waiting, and error all look designed.
8. Tokens: no palette class, no named type scale, no new radius, no
   second icon set.

## Forbidden

The first test is removal: if deleting an element loses nothing, the
element is the defect.

- Gradients, glows, blobs used as decoration, glass, textures, grid
  backgrounds, colored side rails, and ornamental shadows.
- All-caps or tracked labels, eyebrows, kickers, numbered sections.
- Hex, `oklch()`, or Tailwind palette colors in feature files; any of
  the names in § Legacy, newly added anywhere.
- A hand-styled control where a primitive exists (a `<button
  className=…>` in a feature file is a `Button`).
- Appearance overrides on a primitive from its call site, outside the
  one-off exception; a variant made for one call site.
- Styling props outside `variant`, `size` and justified `density`, or
  new axes invented to bypass an appearance rule.
- Cards around messages, cards in cards, borders fixing weak grouping.
- Bot bubbles tinted per bot, or peers styled unequally.
- Pills wrapping plain metadata; a pill is for state.
- Controls that exist only on hover.
- Animated orbs outside a live run or the hover/press cheer; orbs as decoration.
- A page or panel whose loading state is a spinner.
- A visible theme switcher, stock imagery, decorative brand marks.

Restraint is not sterile flatness: it means precise hierarchy, good
type, and one clear focal object per view.
