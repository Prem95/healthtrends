# Design notes: "the well-kept record"

The site was redesigned in November 2026. These notes cover what we studied, the one direction we picked, and the rules that follow from it. The tokens live in `src/app/globals.css`, the marketing components in `src/components/site/`, and the summary for day-to-day work is in `CLAUDE.md` under Design Context.

## What we studied

We captured six sites at desktop and mobile widths on 15 Nov 2026: WHOOP, Superpower, Function Health, Oura, Eight Sleep and Levels. Mobbin's public health category pages were also reachable, as thumbnails only.

| Site | Type | Palette | Hero | Data |
|---|---|---|---|---|
| WHOOP | Proxima Nova only, 96px light h1, caps nav | Black and white bands, one electric blue | 6 words over a full-bleed video | Phone screenshots: ring dials, "95 optimal · 24 sufficient · 3 out of range" |
| Superpower | NB International, small h1s | White, ink, orange promo | Small claim on a product photo | Frosted trend card with range bands over photography |
| Function | Financier Display serif with a rust italic second phrase; mono micro-labels | Paper #FEF9EF, one rust accent, no dark bands | "Check your health." in italic serif over a video portrait | Range lanes (above / in / below) with dots and count-ups |
| Oura | Editorial New, a narrow light serif, 96px; Akkurat body | Peach and paper, ink, one blue button | 4 words, 40/60 split with a product photo | A fan of real app screens with Above / Aligned / Below bands |
| Eight Sleep | Neue Montreal; a serif for quotes; mono kickers | Light grey, black, navy gradient bands | Hidden behind a promo modal in our capture | Glass widgets on navy: a score gauge and stage bars |
| Levels | TT Hoves, 102px, tight tracking | White, near-black, one green | Kicker, 6 words, dark video, then a hairline trust band | A glucose line as the image; "4 of 5 biomarkers in range" |

**What they share:** claims of 3 to 6 words with one call to action, pill buttons, warm off-white canvases broken by one or two dark bands, small tracked-caps labels, a three-state result vocabulary, and the same ending (pricing, then FAQ, then a full-width call to action, then the footer).

**What we leave out:** they also share video heroes, lifestyle photography, celebrity testimonials, press logos, marquees and carousels. bbiom has no photography, no customers to quote and no press. Faking any of it would be the generic move.

## The direction

**A lab report set by a good typographer.** The primary reference is Function Health, for its editorial serif on warm paper and its two-voice headings. We take one move from Levels: the product's own line is the hero image.

We are not averaging the references. Specifically:

- **No photography or video.** Every picture on the site is the app's own components, or a chart drawn from the same sample data. The sample profile is one click away at `/demo`.
- **One accent, not one per section.** Function's rust and Superpower's orange would collide with the amber "borderline" status, so our accent is cobalt `#2B44C4`. Blue stays distinct from green, amber and red for every type of colour vision.
- **No glass on art.** The previous design's painted green-to-orange panels and frosted cards are gone. Big surfaces are now paper, white or ink.

### Why this direction suits bbiom

People open bbiom with a printout in hand, usually before or after an appointment. The page should feel like a calmer, clearer version of that printout: serif readings, ruled rows, hairlines and tabular figures. Most performance-wearable sites use loud grotesk faces and dark video, which signal effort and optimisation. A serif on paper signals a record you can trust.

## Tokens

- **Colour:**
  - Paper canvas `#F4F2EC`. White `#FFFFFF` for charts, tables and product panels.
  - Ink `#121513`, with `#454A47` for body copy (8:1) and `#616662` for metadata (4.9:1 on the canvas).
  - Cobalt `#2B44C4` for links, focus, the active item, one italic phrase per heading and the closing band.
  - The status triad (`#0A8F6C` in range, `#D07C00` borderline, `#D1345B` out) is unchanged. It is used for data only, and every status also has its own shape and label.
  - Ink sections use `data-theme="dark"`, where every token, including the status hues, is re-stepped for the dark surface.
- **Type:**
  - Display: Newsreader with optical sizes, weight 400, sentence case. An italic second phrase is the page's second voice.
  - Body and UI: Google Sans. Units and columns use tabular figures.
  - Scale, fluid from 375px to 1440px: `display-xl` 48→116px, `display-l` 38→76px, `display-m` 30→48px, `display-s` 24→32px, `lede` 18→22px. Body text is 15–16px, and nothing is smaller than 12px.
- **Spacing:** a 4px base. Sections use `--space-section` (80→152px) and the grid gutter is `--gutter` (16→40px). The container is 1360px with a 12-column grid.
- **Radii:** inputs 10px, cards 16px, panels 22px, and every button and nav item is a pill.
- **Shadows:** hairlines carry structure. There is one soft `--shadow-panel` for a product screen lifted off the page, and `--shadow-pop` for tooltips and menus.
- **Motion:** one curve, `cubic-bezier(0.22, 1, 0.36, 1)`. Sections fade up once, lines wipe or draw in, rings and bars fill, and figures count up. Motion only runs under `prefers-reduced-motion: no-preference` and `scripting: enabled`, so every state is readable without it.

## Components (`src/components/site/`)

| Component | Job |
|---|---|
| `SiteNav`, `SiteFooter` | Sticky paper header with a hairline once you scroll and a real mobile menu. The footer has the wordmark, three short columns and the full disclaimer. |
| `Container`, `Section`, `SectionHeader` | One container, one grid and one rhythm. Section tones are paper, white or ink. The split header puts the title across seven columns and the lede across four. |
| `TrendPanorama` (hero) | One marker's whole history across the page width: range band, status-shaped points, labelled life events, three direct labels and a hover readout. |
| `StatRow` | Big serif figures between hairline rules, counting up. |
| `Feature` | Words in five columns, the product in seven, with numbered points. It can be reversed. |
| `InRangeRing` | "17 of 22 in range" as a segmented ring with a labelled legend. It shows a proportion, not a score. |
| `LabPanel`, `SummarySheet`, `ProfileList`, `MarkerIndex` | A lab report re-set as a table, the printed doctor summary, the family profiles, and the catalog laid out as a book index. |
| `Quote` (testimonial) | A pull quote with its source and evidence. bbiom has no customer quotes yet, so the page quotes the sample profile's glucose trend and says so. Real quotes can replace it later. |
| `Pricing`, `Faq`, `CtaBand` | Two plans with Pro set in ink; the FAQ question on the left and folding answers on the right; a full-bleed cobalt band with one claim and one action. |

## Rules that keep it from going generic

1. **One claim per section** and at most one line under it. Copy says only what the product does today.
2. **No three-card rows.** Use asymmetric splits (7/5 or 5/7), rules and tables instead.
3. **Status is the only vivid colour on data,** and it always comes with a shape and a word.
4. **Charts sit on white,** never on the canvas tone or a wash.
5. **Italic is a voice, not decoration:** one phrase per heading at most.
6. **No fake browser chrome or phone frames.** Product panels are real components on a white panel.
