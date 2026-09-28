# The finder's data

Status: built 2026-09-28 (founder: "track the data and entities this process creates", then "a
rating system for after patients have seen the doctor, stars and text, not shown but used to improve
the algorithm"; ratings from both the finder and /match). Tables in
`supabase/migrations/0008_finder.sql`, beside /match's own in `0006_matching.sql`.

## The entities

```
finder_searches ──< finder_events          (what a person did with a list)
      │  └──────< voice_calls              (a spoken search, how it went)
      └────────< finder_handoffs ──── visit_ratings (source 'finder')
match_matches (0006) ────────────────── visit_ratings (source 'match')
                                              │
                                    facet_rating_signal (view) → the ranking's weights
```

| Table | One row is | Written from |
| --- | --- | --- |
| `finder_searches` | a search whose list showed: the words, how they came in (typed, dictation, voice), the place, the filters, which reader read them, the asks it heard, the clinicians shown in order | `app/care-finder.tsx` → `POST /api/finder/track` |
| `voice_calls` | a voice call's summary: model, questions asked (0 to 8), seconds, outcome (revealed, stopped, failed, urgent); never what was said beyond the request | `app/finder-stages/voice-stage.tsx` |
| `finder_events` | a profile opened, a comparison, "more", a heard chip or a filter changed, against its search | `app/care-finder.tsx` |
| `finder_handoffs` | the tap that leaves for the practice's booking page (`/go/<id>`), with the asks the search made and which of them this clinician declared | `app/finder-stages/booking-stage.tsx` |
| `visit_ratings` | the stars (1 to 5) and optional words after a visit: from the finder (a handoff) or /match (a match); one per visit, a note replacing nothing but itself | `POST /api/ratings`; `/api/match/feedback` mirrors "did you feel understood?" as the stars |

Every row is keyed by ids the browser makes (a random UUID), and a device id this browser keeps; no
row names a person. Everything the browser sends is parsed into a typed record or refused whole
(`src/db/finder.ts`).

## The rating

1. The tap on "See available times" or "How to book" records a handoff and remembers the visit on
   this device (`src/finder/track.ts`).
2. A day later the home screen asks, in one line: "How was your visit with Dr …?" Five stars; one
   tap is the whole answer, and a note may follow. "Not yet" asks again two days later, three times
   at most (`app/finder-stages/rate-visit.tsx`).
3. Nothing about a rating is shown to anyone, anywhere: the honesty law (no ratings where a patient
   reads) stands.

## How ratings teach the ranking

`src/db/learn.ts`, the finder's twin of /match's `learnWeights`: for each ask a person made, compare
the stars of visits where the clinician declared it with those where they did not. With at least 8
visits on each side, the ask's weight moves by up to half of itself, a star's difference at a time
(a four-star gap is the full half). Per ask, never per clinician (C2): no clinician is promoted or
demoted by name. `GET /api/finder/weights` serves the numbers; the finder multiplies each ask's
weight by them before ranking, and with nothing learned it ranks exactly as it always did.

## Running it on Supabase

Apply migrations `0001` to `0008`, and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the
server. Each write then also goes to its table, in order, never delaying a person; the weights read
every instance's ratings through the `facet_rating_signal` view. Without them, the record is memory
on each server instance, capped at 5,000 of each kind, as every store here is. Row-level security is
on for every table with no policy: only the server's service role reads or writes.
