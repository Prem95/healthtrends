# 03 — Design system for iOS

The app is the same product as the website (see the Design Context in
`CLAUDE.md`): warm paper, evergreen ink, **one gradient family — evergreen
into orange — as painted artwork, soft washes and frosted glass**, and status
colours reserved for results. This file translates that into native terms.
The values live in `reference/mobile/src/theme/tokens.ts`; use them, never
literals.

## 1. What changes from the web, and why

| Web | iOS | Reason |
| --- | --- | --- |
| Google Sans | **System font (SF Pro)** | Follows Dynamic Type, renders best at small sizes, costs nothing to ship, feels native. The brand is carried by colour, art and shape. |
| Sidebar + tab bar | **System tab bar** (`NativeTabs`) | Liquid Glass on iOS 26 and correct behaviour for free |
| Hover states | **Pressed states + haptics** | No pointer |
| CSS backdrop blur | **`GlassView`** on iOS 26+, **`BlurView`** below | `Glass` in `components/ui/art.tsx` picks automatically |
| 16px body | **17pt body** | iOS reading size |

Everything else — palette, status shapes, the range bar, the chart, the words —
is identical, so a person moving between web and phone sees one product.

## 2. Colour

| Token | Value | Use |
| --- | --- | --- |
| `page` | `#F5F4EF` | Screen background. Never pure white. |
| `paper` | `#FFFFFF` | Cards |
| `paper2` / `paper3` | `#F3F2EC` / `#E9E8E0` | Insets, tracks, neutral chips |
| `ink` | `#13231F` | Primary text, primary button fill |
| `ink2` | `#40504B` | Body copy |
| `ink3` | `#62706B` | Metadata (4.9:1 on `page`) |
| `line` / `lineStrong` | ink at 10% / 16% | Hairlines |
| `brand` | `#0F5C4D` | Links, tab tint, text buttons |
| `warm` | `#EE7420` | Brand surfaces and art only. **Never a data mark.** |
| `inRange` | `#0A8F6C` | Status: in range |
| `borderline` | `#D07C00` | Status: borderline |
| `out` | `#D1345B` | Status: high or low |
| `neutral` | `#84908C` | Status: no range; sparkline line |

Rules:

- **Status colours are for results only**, and never alone: each has a shape
  and a label (§5).
- **Amber is a status; orange is the brand.** They are close in hue on purpose
  for warmth, so the separation is by role: orange never appears as a dot,
  chip, bar or number.
- **Text never wears a status colour.** Values and labels are ink; the coloured
  shape beside them carries the state.
- Errors in forms use `#AD2247` text. No red backgrounds.

## 3. Gradient, artwork and glass

One gradient family, used three ways:

1. **Painted panels** (`Art`). The seven WebP files from the website's
   `public/art`, copied into `mobile/assets/art`. Use them for: the sign-in
   hero, the empty Overview, the paywall background. Not as wallpaper behind
   data.
   - `hero` — portrait, green top-left into orange. `flip` puts the green at
     the bottom, under white type.
   - `deep` — dark green with an orange glow; the only one that carries white
     body text without a scrim.
   - `wide`, `cta`, `step1–3` — available; not needed in v1 screens.
2. **The page wash** (`Screen`): a very faint green-to-orange gradient across
   the top 360pt of every scrolling screen, fading to paper.
3. **The card wash** (`Card wash`): faint green in one corner, orange in the
   opposite. For summary surfaces only — the Overview summary, the plan card.
   **Charts and lists sit on plain white.**

Type on art: white type goes on the green part of a painting (use `flip`)
and/or with `scrim`. Never on the orange. Anything more detailed than a
headline goes on **`Glass`** (frosted, carries ink text).

No second gradient palette anywhere. No shadows on ordinary cards; depth is
the hairline.

## 4. Type

System font, weight 500 at most, sentence case.

| Style | Size / line | Use |
| --- | --- | --- |
| `largeTitle` | 34 / 40 | Screen titles on tab roots |
| `title1` | 28 / 34 | Screen titles on pushed screens and sheets |
| `title2` | 22 / 28 | Card headings in marketing-like surfaces |
| `headline` | 17 / 22, medium | Row titles, button labels, section titles |
| `body` | 17 / 24 | Paragraphs |
| `callout` | 16 / 22 | Secondary paragraphs |
| `subhead` | 15 / 20 | Card body, supporting lines |
| `footnote` | 13 / 18 | Metadata |
| `caption` | 12 / 16 | Smallest text allowed |
| `reading` | 52 / 56, medium | The one big number on a screen |

- Numbers in **columns** (history, lists) use tabular figures
  (`type.tabular`). The big standalone reading uses proportional figures.
- The **unit** beside a reading is `ui-monospace`, 12–14pt, `ink3`.
- The **eyebrow** (small uppercase kicker) is `ui-monospace` 12pt with 1pt
  tracking. It is the only uppercase text. One per screen at most.
- Typeset units with `prettyUnit()` (`10³/µL`, not `10^3/µL`). Ranges use an
  en dash.

## 5. Status: shape + word + colour

| Status | Shape | Chip label | Spoken label |
| --- | --- | --- | --- |
| `IN_RANGE` | filled circle | In range | In range |
| `BORDERLINE_HIGH` / `_LOW` | diamond | Borderline high / low | Near high / low boundary |
| `HIGH` | triangle pointing up | High | Above range |
| `LOW` | triangle pointing down | Low | Below range |
| `NO_RANGE` | hollow ring | No range | No reference range |

`StatusGlyph` draws the shape; `StatusChip` is the pill (soft tint of the
status colour, the shape, an ink label). The same shapes are the points on the
chart.

## 6. Shape, spacing, touch

- **Spacing scale:** 4, 8, 12, 16, 20, 28, 40 (`space.xs … xxxl`). Screen side
  margin 16. Gap between sections 28. Card padding 20.
- **Radius:** controls 12, cards 20, art panels 28, buttons and chips fully
  round.
- **Buttons** (`Button`): pill, 50pt tall. `primary` (ink fill) once per
  screen; `secondary` (white, hairline); `ghost` (text, brand colour); `light`
  and `glass` on artwork; `danger` (hairline in the out colour, for delete).
- **Touch targets** 44×44pt minimum. Small controls get `hitSlop`.
- **Lists** are rows inside one card, hairline between rows, 60pt minimum row
  height.

## 7. Components in `reference/mobile`

| Component | File | Notes |
| --- | --- | --- |
| `Screen` | `components/ui/primitives.tsx` | Scrolling screen, safe areas, page wash |
| `Card` | same | `wash` prop for summary surfaces |
| `Button` | same | Variants above; selection haptic on press |
| `Eyebrow`, `SectionTitle` | same | |
| `QueryState` | same | Loading / error for any query |
| `Art`, `Glass` | `components/ui/art.tsx` | Painted panel; frosted surface |
| `StatusGlyph`, `StatusChip` | `components/ui/status.tsx` | |
| `RangeBar` | `components/charts/range-bar.tsx` | Track, band, dot; optional limit labels |
| `Sparkline` | `components/charts/sparkline.tsx` | Neutral line, status-coloured last point |
| `MarkerChart` | `components/charts/marker-chart.tsx` | The hero chart |
| `MarkerCard`, `MarkerRow` | `components/markers/marker-parts.tsx` | Both open marker detail |
| `StatusSummary` | `components/markers/status-summary.tsx` | The Overview headline |

Build new screens from these. If a screen needs something new (a text field
with a label, a segmented control, a sheet header), add it to `primitives.tsx`
in the same style rather than styling it inline in the screen.

## 8. Charts

Same rules as the web chart.

- One marker, one line, one y-axis. Never two scales on one plot.
- **Line** 2pt, `chartLine`, round joins.
- **Points** are the status shapes, 12pt, with a 2pt white ring so they stay
  legible on the line. The latest is slightly larger.
- **Reference range** is a 10% green wash with its limits ruled as hairlines.
- **Grid** is solid hairlines at round values, chosen in the display unit so
  they stay round after a unit switch. Never dashed.
- **Life events** are thin vertical rules with a label at the top; when labels
  would collide only the first and last are labelled.
- **Legend** under the plot: the band with its range, then one entry per status
  present.
- **Interaction:** dragging moves the reading block; there is no floating
  tooltip. The history list is the table equivalent.
- The chart is drawn at its real pixel width (`onLayout`), so type inside it is
  true size.

## 9. Motion and haptics

- Navigation and sheets use the system transitions. Do not customise them.
- Pressed state: opacity 0.8–0.85. No scale, no bounce.
- **Haptics** (`expo-haptics`): `selectionAsync` on button press and on each
  point while scrubbing the chart; `notificationAsync(Success)` after a test is
  saved and after a purchase is confirmed; nothing for errors (the text says
  it).
- No entrance animations in v1.

## 10. App icon and splash

- **Icon:** the web logo mark — a rounded tile in the brand gradient
  (`#0C5348 → #1C8C74 → #F3A23A → #EA6A1F` at about 118°) with the white
  plotted line and end dot. Provide a 1024×1024 PNG at
  `mobile/assets/images/icon.png`, no transparency, no rounded corners (iOS
  masks it). The file in `reference/mobile/assets/images` is the Expo
  placeholder and must be replaced before submission.
- **Splash:** paper `#F5F4EF` with the mark centred
  (`assets/images/splash-icon.png`, about 96pt wide). Also a placeholder to
  replace.

## 11. Theme

`userInterfaceStyle` is `light`. The app does not follow the system dark
setting in v1; the palette, the art and the status colours are specified and
checked for light only.
