# The network's clinician profiles

Eleven real clinicians are published under ADHD.ME's name. Two are GPs and nine are the
psychologists and occupational therapist of the wider network. This note says where their facts
live, because they live in two repositories and two copies of a factual claim about a named
health professional is a drift risk worth writing down rather than discovering.

## Where the facts come from

`Stef-01/revamped-adhd.me` is the static marketing site. `scripts/build-profiles.py` in that
repository holds one `CLINICIANS` entry per person and generates both the profile page and the
card on The Network from it. That file is the source of truth: every entry is the clinician's own
published biography, supplied by them or by their clinic.

`src/demo/roster.ts` in this repository is the app's copy. It is not a second authoring surface.
Its O252 block says so, and the shapes differ because the app ranks on its fields and the
marketing site only renders them.

## How a marketing field maps onto a roster field

| Marketing site | App roster | Note |
|---|---|---|
| `name`, `short`, `pronouns` | `name`, `shortName`, `pronouns` | Verbatim |
| `qualifications` | `title` | Verbatim |
| `category` | `profession` | Closed vocabulary (`src/support/professions.ts`) |
| `description` | `matchLine` | Verbatim |
| `chips` | `fitSignals` | Verbatim |
| `about` (paragraphs) | `about` (one string) | Joined, otherwise verbatim |
| `experience` | `experience` | Verbatim |
| `details.Reach` | `reach` | Verbatim |
| `details.Appointments` | `appointmentLength` | Verbatim |
| `details.Billing` | `practicalSignals` | Shortened to a chip |
| `details['Wheelchair access']` | `wheelchairAccessible` | Boolean; the reach line carries the rest |
| `book_href` | `booking.url` | Reached through `/go/<id>`, which counts the handoff |
| `disclosure` | `disclosedInterest` | Only where an interest exists; see below |
| — | `careAreas`, `careAreasSometimes`, `manner`, `expertise` | Derived, under the rule below |

## The two rules that govern the derived fields

**Lead claims are "often"; the list of presentations is "sometimes".** Nobody in the nine has sat
the onboarding interview, so the three-state grade is read off their own page: what they say they
focus on or are passionate about is declared at full weight, and the flat list of things they have
experience with is declared at half. A clinician whose page never mentions ADHD carries no ADHD
care area.

**A disclosure is a declared interest, not a statement of independence.** The GOALS Psychology
line on the marketing site says the clinic is independent and ADHD.ME receives no part of what you
pay. That is the absence of an interest, so those entries carry no `disclosedInterest`; the
independence is a practical signal instead. Paula Garrido's line is a real disclosure and is
carried as one.

## When a profile changes

Change `scripts/build-profiles.py` in the marketing repository first, then mirror it here. A
portrait belongs in `public/clinicians/<id>.jpg`, square, as the clinician supplied it — nothing in
this tree generates a face for a real person.

Adding a clinician in a new suburb also needs a point in `src/geo/suburbs.ts`; `suburbs.test.ts`
fails loudly rather than letting them rank last for every search forever.

## Evidence

`qa/network-o252/` holds the three screens these nine make reachable, at 390 and 1280:

- **results** — the finder narrowed to psychologists, five of twelve shown, portraits and the
  declared reason on each row.
- **profile** — Lachlan Avent: portrait, profession and post-nominals, the suburb, the telehealth
  and open-books facts, his own first sentence, and the disclosures under it.
- **booking** — the `practice` route, which no real clinician reached before these nine. It names
  Halaxy and the clinic's free first call, and says what ADHD.ME does not see.
