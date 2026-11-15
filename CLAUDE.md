@AGENTS.md

## Design Context

### Users
People tracking their own bloodwork over time — health-conscious adults, patients
managing a condition, and families keeping several profiles. They arrive with a
PDF or a printout of lab results (which they type in) and want to understand a
trend, not decode a table. Context is calm and considered, not urgent: reviewing history at home,
before or after a doctor's visit.

### Brand Personality
**Calm, clear, trustworthy.** Voice is plain and human — "your lab's range,
not a textbook one," never clinical jargon or hype. It should feel like a
well-kept personal record: everything legible, nothing shouting. Evokes clarity
and quiet confidence, never alarm.

### Aesthetic Direction
**"The well-kept record": a lab report set by a good typographer.** Warm paper,
near-black ink, one-word titles in a contemporary display grotesk closed by a
cobalt full stop, a clean companion sans for everything else, no italics. The
primary reference is Function Health's editorial calm on paper; from Levels we
take the product's own line as the hero image. Product-led: every marketing picture is the real app
component (or a chart drawn from the same data) over the sample profile, and
the same screens are public at `/demo`. Full brief: `design-notes.md`.

- **Colour is rationed.** Paper canvas `#F4F2EC`; white `#FFFFFF` for charts,
  tables and product panels; ink `#121513` (body `#454A47`, metadata
  `#616662`). **One accent, cobalt `#2B44C4`**: links, focus, the active item,
  the full stop after each display title (`<Dot />`, `.stop`), the closing band. No gradients, no artwork,
  no glass. Ink sections use `data-theme="dark"` (every token re-stepped).
- **Status colours stay reserved for data** — in range `#0A8F6C`, borderline
  `#D07C00`, out `#D1345B` (validated for colour-blind separation and ≥3:1 on
  white) — and status is **never colour alone**: each state has its own shape
  (dot / diamond / arrow up or down / hollow ring) and a plain label. The
  cobalt accent is never a data mark. Charts and tables sit on white.
- **Type.** Display: Funnel Display, weight 500 for titles (`.display`) and
  400 for big readings (`.figure`), upright. **Marketing titles are one word**
  with a cobalt full stop ("Bloodwork.", "Trends."); context goes in the
  kicker above, one line below. Body and UI: Funnel Sans, tabular figures in
  columns. **No italics anywhere.** Scale tokens: `text-display-xl|l|m|s`,
  `text-lede` (fluid 375→1440px). **All UI
  text — nav, buttons, labels — is sentence-case sans, 12px minimum.** The
  only uppercase is the small `.eyebrow` kicker (sans, tracked, with a rule).
- **Layout.** 1360px container, 12-column grid (`GRID`), `--gutter`,
  `--space-section`. Asymmetric splits (7/5, 5/7), hairline rules, tables and
  indexes instead of card rows. Sections alternate paper / white, with one ink
  band and a cobalt closing band.
- **Shape.** Pill buttons and nav items; inputs 10px, cards 16px, panels 22px
  (`--r-*`). Hairlines carry structure; `--shadow-panel` only for a product
  screen lifted off the page. Typeset punctuation: en-dashes in ranges,
  `10³/µL` superscripts (`prettyUnit`), tabular numerals in columns.
- **Motion.** One easing curve, `cubic-bezier(0.22, 1, 0.36, 1)`; nothing
  bounces. Inside `<Reveal anim>` (`.m-anim`) parts play once in view:
  `.m-item` fade-up, `.m-pop`, `.m-draw` (dash draw), `.m-wipe` (fluid line
  wipe), `.m-arc` (ring segments), `.m-grow` (bars), range-bar dots sliding to
  their value, `CountUp` figures — each staggered with `--d`.

**Anti-references:** italics, multi-phrase marketing titles, gradients of any kind, painted artwork or glass panels,
a second accent hue, AI-purple meshes, flat single-colour hero blocks, bold
display headlines, decorative use of status colours, uppercase buttons and
nav, tiny (<12px) labels, pure `#000`/`#fff` page surfaces, stock photos of
people, invented customer logos, press badges or testimonials, fake browser
chrome or phone mock-ups, three-card rows, marquees, carousels, parallax,
health "scores" or alarm language.

### Design Principles
1. **Show the product, with real components.** Landing pictures, the auth
   side panel and `/demo` all render the app's own components over
   `lib/demo` — never a drawn mock-up.
2. **Status is the only colour on data, and never alone.** Green/amber/red
   appear on results only, always with the status shape and a label. Chart
   text wears ink tokens, never the status colour.
3. **Answer "how am I doing?" first.** Overview leads with one figure (N of M
   in range), then only what needs a closer look as cards, then everything
   else folded into body systems. Detail leads with the reading, then the
   line, then the same data as a table.
4. **One line per marker.** Reference range as a shaded band, each test a
   status-shaped point, life events as labelled rules, a legend or direct
   labels. Pointing or arrow keys move the reading block to that test.
5. **Plain words, honest claims.** "In range / Borderline / High / Low", "your
   lab's range, not a textbook one". Marketing copy states only what the
   product does today (no PDF import, no diagnosis). A quote is only ever
   real words or the sample profile's data, labelled as such.
6. **Quiet, single-curve motion.** Fade-up on entry (once), lines that draw,
   rings and bars that fill, numbers that count up, 0.25–0.3s hovers. Motion
   is armed only under `prefers-reduced-motion: no-preference` *and*
   `scripting: enabled`, so content is never hidden from anyone.

> Tokens and component classes (`.card`, `.card-quiet`, `.panel`, `.display`,
> `.figure`, `.chip`, `.seg`, `.eyebrow`, `.unit`, `.acc`, `.reveal`) live in
> `src/app/globals.css` — tokens on `:root` (a `[data-theme="dark"]` block
> flips any section to ink), component classes inside `@layer components` so
> utilities win. `cn()` knows the custom type scale (see `lib/utils.ts`).
> Marketing: `src/app/page.tsx` composes `src/components/site/` (layout,
> blocks, nav, footer, `visuals/`). Product screens are shared views in
> `src/components/views/` rendered by both `/app` (real data, editable) and
> `/demo` (sample data, read-only) via `ViewCtx`; the frame is
> `src/components/app/app-shell.tsx` (sidebar on desktop, top bar + tab bar on
> mobile). Sample data: `src/lib/demo.ts`.
