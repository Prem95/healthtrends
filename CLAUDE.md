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
**"Clear chart": a health record you can read at arm's length.** Product-led,
not agency-editorial: every marketing preview is the real app component over
sample data, and the same screens are public at `/demo`. Light theme
throughout: warm paper canvas `#F5F4EF` (never pure white), white cards on
hairlines, evergreen-black ink `#13231F`. **Interaction colour is deep
evergreen `#0F5C4D`** (links, focus, active nav); primary buttons are solid
ink. **The only vivid colour on any screen is the status of a result** —
in range `#0A8F6C`, borderline `#D07C00`, out `#D1345B` (validated for
colour-blind separation and ≥3:1 on white) — and status is **never colour
alone**: each state has its own shape (dot / diamond / arrow up or down /
hollow ring) and a plain label. One grotesque (Google Sans) carries
everything: display headings at **weight 500 max, sentence case**; **all UI
text — nav, buttons, labels — is sentence-case sans, 12px minimum** (no
uppercase-mono controls: this audience includes older readers). JetBrains
Mono is reserved for two things only: the small uppercase section kicker
(`.eyebrow`) and the unit beside a reading (`.unit`). Hairlines separate;
**no shadows, no gradients** — depth is surface + hairline. Punctuation is
typeset: real en-dashes in ranges, `10³/µL`-style superscripts
(`prettyUnit`), tabular numerals in columns (proportional on big standalone
readings). Radii: 10px controls, 16px cards, pill chips. One easing curve
everywhere: `cubic-bezier(0.22, 1, 0.36, 1)` — nothing bounces.
**Anti-references:** serif or bold display headlines, AI-purple gradients,
decorative use of status colours, uppercase-mono buttons and nav, tiny
(<12px) labels, pure `#000`/`#fff`, fake browser chrome or phone mock-ups,
marquees, parallax, scroll-jacking, health "scores" or alarm language.

### Design Principles
1. **Show the product, with real components.** Landing previews, the auth
   side panel and `/demo` all render the app's own components over
   `lib/demo` — never a drawn mock-up.
2. **Status is the only colour, and never alone.** Green/amber/red appear on
   results only, always with the status shape and a label. Chart text wears
   ink tokens, never the status colour.
3. **Answer "how am I doing?" first.** Overview leads with one figure (N of M
   in range), then only what needs a closer look as cards, then everything
   else folded into body systems. Detail leads with the reading, then the
   line, then the same data as a table.
4. **One line per marker.** Reference range as a shaded band, each test a
   status-shaped point, life events as labelled rules, a legend under the
   plot. Pointing or arrow keys move the reading block to that test.
5. **Plain words, honest claims.** "In range / Borderline / High / Low", "your
   lab's range, not a textbook one". Marketing copy states only what the
   product does today (no PDF import, no diagnosis).
6. **Quiet, single-curve motion.** Fade-up on entry (once), a line that
   draws, 0.25–0.3s hovers. Motion is armed only under
   `prefers-reduced-motion: no-preference` *and* `scripting: enabled`, so
   content is never hidden from anyone.

> Tokens and component classes (`.card`, `.chip`, `.seg`, `.eyebrow`, `.acc`,
> `.reveal`) live in `src/app/globals.css` — tokens on `:root`, a
> `[data-theme="dark"]` block for the one inverted band (landing privacy
> section), component classes inside `@layer components` so utilities win.
> Landing: `src/app/page.tsx` (+ `src/components/landing/`). Product screens
> are shared views in `src/components/views/` rendered by both `/app` (real
> data, editable) and `/demo` (sample data, read-only) via `ViewCtx`; the
> frame is `src/components/app/app-shell.tsx` (sidebar on desktop, top bar +
> tab bar on mobile). Sample data: `src/lib/demo.ts`.
