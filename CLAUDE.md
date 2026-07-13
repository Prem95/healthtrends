@AGENTS.md

## Design Context

### Users
People tracking their own bloodwork over time — health-conscious adults, patients
managing a condition, and families keeping several profiles. They arrive with a
PDF or a printout of lab results and want to understand a trend, not decode a
table. Context is calm and considered, not urgent: reviewing history at home,
before or after a doctor's visit.

### Brand Personality
**Calm, editorial, trustworthy.** Voice is plain and human — "your lab's range,
not a textbook one," never clinical jargon or hype. It should feel like a quiet
magazine spread that happens to be full of your own live data. Evokes clarity and
quiet confidence, never alarm.

### Aesthetic Direction
**Data-science editorial**, extracted from the "Alethia" system (Framer,
Awwwards-nominated) and recolored for a clinical product. The landing runs the
**light theme**: warm off-white canvas `#F0EFEA` (never pure white); near-black
ink `#16160f`; a **single clinical teal accent** (`#0d9488`, deepened so it
reads on white) reserved for data values, badges and interactive/hover states
only — everything else is grayscale. (The system is dual-theme; the dark variant
is near-black `#070707` / off-white `#f2f2ee` / teal `#5EEAD4`.) A tight neo-grotesque (Google Sans)
carries display headlines at **weight 500 max, sentence case** (bold headlines
are an instant tell); **all metadata, labels, nav links and buttons are
uppercase JetBrains Mono** with tracking (mono never exceeds 14px except as a
data value). Hairline rules (`#1e1e1c`) separate sections; **no shadows and no
gradients** — flat fills only (the drifting `au-media` blobs are the one
sanctioned exception, standing in for video); depth comes from frosted-glass
blur over that moving media and from the rules themselves. Punctuation is
typeset: real em-dashes, `SpO₂`-style subscripts, tabular numerals. Two radius
families only: 4–6px chips, 16–20px cards. The product's green/amber/red status hues stay
vivid and are reserved for *data*, never decoration. One easing curve everywhere:
`cubic-bezier(0.22, 1, 0.36, 1)` (expo-out) — nothing bounces or overshoots.
**Anti-references:** serif display headlines (the most-cited AI tell), AI-purple
gradients, template clones, glossy status pills, decorative accent (teal on
anything that isn't data or a hover state), pure `#000`/`#fff`, fake browser
chrome, default easings (`ease`, `ease-in-out`, `linear` — except the marquee).

### Design Principles
1. **Show the line, don't describe it.** One biomarker read as a single line over
   years is the hero visual — a real chart inside a frosted instrument panel.
2. **One accent, grayscale everything else.** Teal appears only on data, badges,
   or interaction. Green/amber/red mean in-range / borderline / out, on data only.
3. **Instrument-grade metadata.** Uppercase mono labels, numbered rows, mono
   readings; headline-driven layout with sparse body copy (~640px measure).
4. **Signature patterns.** Line-mask headline reveals, a numbered one-open
   accordion, a sticky split, a marquee divider, and a floating parallax collage.
5. **Quiet, single-curve motion.** Fade-up + line-mask on entry (once), 0.25–0.35s
   hovers, frosted glass alive over drifting media. Always honor
   `prefers-reduced-motion` (media paused, parallax off, content visible).

> Landing implementation lives in `src/app/page.tsx`; the Alethia token +
> component layer is the scoped `.aurora` block in `src/app/globals.css` (swap
> those tokens to rebrand). The landing runs the light theme top to bottom
> (dual-theme system; flip the `.aurora` token values to go dark). The dark
> product app is a separate surface and unaffected.
