# 01 — Product: why this needs to exist on a phone

Read this before designing anything. Every screen decision in `02-ux.md`
traces back to a line here. If a feature idea does not serve one of the needs
below, it does not belong in v1.

## The problem, stated plainly

A blood test produces a page of numbers that is read once and filed. The next
one comes a year later, from a different lab, in a different layout, sometimes
in different units. The single most useful thing those pages contain — **how a
number has moved over time** — is on none of them. It only exists if someone
lines them up, and almost nobody does.

So people end up in one of these situations:

- "My doctor said my cholesterol is 'a bit high'. Is that new? Was it always?"
  They do not know, and the old report is in a drawer or an email from 2023.
- A value is flagged **H** on today's report. It is frightening. It was also
  flagged, at nearly the same value, three years running — which is a very
  different conversation — but there is nothing in front of them that says so.
- They started a medication or a diet eight months ago and want to know whether
  it is working. The answer is two numbers on two different PDFs.
- They manage a parent's or a child's care and carry a folder to appointments.

None of this is a diagnosis problem. It is a **record-keeping and legibility**
problem, and that is the only thing bbiom claims to solve.

## Why the existing options fail

| Option | Why it does not solve it |
| --- | --- |
| The lab's patient portal | One lab only. Change lab, city, country or insurer and the history splits. Shows a table per visit, rarely a trend. |
| Apple Health records | Only connects to participating institutions in a few countries; most private labs and most of the world are not in it. No lab-range-aware trend view. |
| A spreadsheet | Works, for the few who build one. No ranges, no units, miserable on a phone, never with you. |
| The folder of paper / PDFs | Complete and unreadable. |
| "AI health" apps | Interpret, score and upsell supplements. People who want a record do not want a verdict, and should not trust one. |

## Why a phone app, when the website already exists

The website is where the product lives today. The phone is where the **two
moments that matter** happen, and the website is not there for either:

1. **The moment results arrive.** They come as an email, a PDF, a portal
   notification — on the phone, often in a car park or on a train. If entering
   them means "later, at my laptop", later does not come. Capture has to be
   possible in the two minutes after the results land.
2. **The moment in the consulting room.** The doctor asks "what was it last
   time?" The appointment is ten minutes long and the room may have no signal.
   The answer has to be in the patient's hand in two taps, legible at arm's
   length, and passable across the desk.

A third reason is specific to the data. Blood results are among the most
private things a person owns. A phone app can do what a browser tab cannot:
keep the session in the Keychain, require Face ID, hide the screen in the app
switcher, and keep a readable copy offline.

That gives the app three jobs, in priority order:

- **Recall** — any marker's history, in seconds, offline. *(the consulting room)*
- **Capture** — a report entered in about three minutes, with one thumb. *(results day)*
- **Reassure** — a single reading shown in the context of its own history and
  its own lab's range, in plain words, without alarm. *(every other day)*

## Who it is for

| Person | Their situation | What they need from the app |
| --- | --- | --- |
| **The tracker** — managing one long-term thing: thyroid, cholesterol on a statin, pre-diabetes, iron, vitamin D, hormones | Tested every 3–12 months for years. Cares about three to eight markers, intensely. | Those markers pinned at the top; the line; "since I started X" visible on the line. |
| **The annual checker** — healthy, one panel a year | Twenty to forty numbers once a year, forgets them by spring. | Fast entry by panel; "everything in range, two worth a look"; nothing more. |
| **The carer** — a parent, a partner, a child | Sits in someone else's appointment holding their history. | A second and third profile, switched in one tap, each with its own ranges. |
| **The mover** — changed lab, city, country or insurer | History split across systems and units (mg/dL here, mmol/L there). | One record regardless of source; units converted, never retyped. |

Common to all four: they are not clinicians, they are often reading on a small
screen with imperfect eyesight, and they are sometimes anxious. Design for
that reader.

## What people are actually afraid of

These are the reasons someone hesitates to put medical data in an app. Each is
answered by something concrete in the build, not by copy.

| Fear | Answer in the product | Where |
| --- | --- | --- |
| "Who else can see this?" | Row-level security ties every row to the account in the database itself; no analytics or ad SDKs; Face ID lock; privacy cover in the app switcher | `08-security.md` |
| "Will I be locked in?" | Full CSV / JSON export from Settings, free, on every plan | `02-ux.md` §9 |
| "Can I really delete it?" | Delete account, in the app, removes everything and says so | `02-ux.md` §9 |
| "Will it scare me?" | No scores, no red screens, no "abnormal". Four plain states, each with a shape and a label | `03-design-system.md` |
| "Will it tell me what to do?" | It never does. It is a record. The disclaimer is permanent and honest | everywhere |
| "Will my free data be held hostage?" | Reading, charting and exporting are never behind the paywall | `07-payments.md` |

## What v1 is

Feature parity with the website's core, shaped for one hand, plus the things
only a phone can do.

| Area | In v1 |
| --- | --- |
| Account | Sign in with Apple, email code, Google. First-profile onboarding. |
| Overview | "N of M in range", the markers worth a closer look, pinned markers, body systems |
| Markers | Search by name or lab abbreviation; filter by has-results / worth-a-look / whole catalog |
| Marker detail | The line with its range band and life events, scrubbing, unit switch, history, own range, pin |
| Add results | Date first; panel shortcuts; numeric keypad; unit per row; the report's own range; typo and wrong-unit checks; duplicate warning |
| Timeline | Tests and life events, newest first; add and remove life events; delete a test |
| Profiles | One on Free; up to six on Pro |
| Doctor summary (Pro) | One page: flagged first, then every latest result; share or print as PDF |
| Privacy | Face ID lock, app-switcher cover, offline copy that never enters a backup |
| Your data | CSV and JSON export; delete account |
| Pro | Monthly and yearly subscription through the App Store; restore; manage |

## What v1 deliberately is not

Say no to these in review. Each is a real request and a real mistake for v1.

- **No interpretation.** No "your LDL is high because…", no advice, no AI
  summary, no risk score. The moment the app has an opinion it is a medical
  device with a liability problem and a trust problem.
- **No photo or PDF import.** It is the most-wanted feature and the most
  dangerous to get wrong: a misread decimal in a health record is worse than
  no record. It is v2, done on the device, with every value confirmed by the
  person before it is saved (see roadmap).
- **No HealthKit sync, no wearables, no reminders, no widgets, no sharing with
  a doctor's account.** All plausible later. None is needed for the three jobs.
- **No dark theme in v1.** The system is defined in light; a second theme is a
  second design to verify. Add it deliberately, not by inverting colours.
- **No iPad layout, no Android.** `supportsTablet` is off. One platform, done well.
- **No social, streaks, badges or notifications that pull people back.** People
  open this a few times a year. That is correct, and the app should be at peace
  with it.

## Pricing

The same rule as the website: **your own data is never paywalled.** Tracking,
trends, ranges and export are free. Pro is for doing more, not for seeing what
you already entered.

| | Free | Pro |
| --- | --- | --- |
| Profiles | 1 | up to 6 |
| Tests | 20 in total | unlimited |
| All 71 markers, custom markers, trends, units, life events | yes | yes |
| Export, delete account | yes | yes |
| Doctor summary | — | yes |
| Price | — | $4.99 a month, or $39.99 a year in the App Store |

Pro bought on the website (Stripe) unlocks the app, and Pro bought in the app
unlocks the website: one account, one entitlement, read from the database. The
app sells only through the App Store, as Apple requires, and never links to
the website checkout. Details and edge cases: `07-payments.md`.

When someone on Free hits a limit, the app says what happened and what stays
true ("Your 20 tests are all still here and readable"), then offers Pro once.
It does not nag afterwards.

## How we will know it works

Not engagement. These:

- **Time to first result:** from install to a saved test in under five minutes.
- **Capture time:** a 20-marker report entered in about three minutes.
- **Recall time:** from locked phone to a specific marker's chart in under ten
  seconds, with no signal.
- **Second test:** the share of people who add a second test. That is the
  moment the product becomes worth having — the first trend.
- **Crash-free sessions** above 99.5%, and zero purchases that were charged
  but not unlocked.

## Roadmap after v1

In the order the needs above suggest.

1. **Scan a report (v2).** On-device text recognition only — the image never
   leaves the phone. It proposes rows; the person confirms each value against
   the image before anything is saved. Reuses the same plausibility checks as
   manual entry.
2. **Keep the original.** Attach the PDF or photo to a test, in a private,
   per-user storage bucket.
3. **Retest reminders.** A local notification the person sets themselves
   ("remind me in six months"). No server, no marketing.
4. **Edit a saved result.** Today a wrong value is deleted and re-entered.
5. **Compare two markers** on one timeline (indexed to a common base, never a
   dual axis).
6. **Dark theme**, designed, not inverted.
