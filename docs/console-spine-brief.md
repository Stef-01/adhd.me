# Console spine brief — a draft for the founder to edit, not a plan being executed

Written 2026-09-05 against the console as it is on main. It is the "draft one brief, you edit
it, then I build" step from the open decision round: nothing in it is applied, and the two
decisions it depends on — which modules are the spine, and what depth the pitch needs — are
yours (ROADMAP: console IA review; practice console depth). Every "today" line below is a fact
read from the code or from a signed-in, seeded walk at 390 and 1280 the same day; every
"proposed" line is a recommendation to accept, change or strike.

## The recommendation in one line

Six screens carry the demand-matching and shared-care story end to end; the other twenty-four
fold behind one "More" surface until a practice asks for one by name.

## The six, screen by screen

### 1. `/console` (home) — the front door
- **Today:** practice name, timezone and holdout; a grid of nine tool links (results,
  incrementality, usefulness audit, outreach, admin ops, ROI, privacy, complaints, finish
  setup); the eligibility-rules card with an edit link. The tab bar names Home, Queue,
  Referrals, Results, Setup and an "All tools" menu.
- **Proposed:** the home becomes the spine's index — the six below, each with one live number
  (attended per 1,000 above holdout; sessions under-full this month; referrals awaiting an
  answer; outcomes the record does not say; tie-quality share; north star) — and the nine tool
  links move under "All tools". The rules card stays; it is the one thing a manager edits weekly.
- **Cost:** one screen, mostly re-arrangement; the numbers already exist on the six pages.

### 2. `/console/dashboard` — incrementality
- **Today:** four figures (incremental attended per 1,000; incremental attended; invite arm;
  holdout arm), the weekly arms chart, the 26-week table, opt-out rate, the attribution note.
- **Proposed:** keep as is. This is the north star and it is already the deepest screen. Two
  small asks: state the period in words above the figures ("26 simulated weeks to 31 Jan"), and
  let the table collapse behind a disclosure on a phone the way capacity's list now does.
- **Cost:** small.

### 3. `/console/matching` — how the order is made
- **Today:** eight sections on one 10,000px page — one match worked through, every tag on the
  roster, what patients are told about each GP, booking handoffs, capacity freshness, tie
  quality, a 30-minute interview read into facets, the reach-gap feed. An audit tool.
- **Proposed:** split into two screens. "Matching" keeps the worked example, what patients are
  told, and tie quality — the three a practice manager reads to trust the order. The roster
  tags, capacity freshness, the interview reader and the reach-gap feed become "Matching
  audit" under All tools, for the staff who maintain the lexicon.
- **Cost:** a route split with no engine change; the sections already render independently.

### 4. `/console/capacity` — how full the sessions run
- **Today:** the drift verdict, the method's score, the 70-session table, and the
  recommendations grouped by weekday (since 2026-09-05), the calendar-gap line when there is one.
- **Proposed:** the verdict first and alone ("the ranges still match what happened"), then the
  three sessions running fullest and the three running emptiest as cards, then the table and
  the weekday groups. A manager decides about a session, not about seventy.
- **Cost:** a view-level selection of six rows; the engine's sentences stay untouched.

### 5. `/console/referrals` and `/console/outcomes` — the shared-care loop
- **Today:** referrals lists received (with accept/decline and a reason field) and sent, each
  with its state in words; outcomes counts what the record says happened to the sent ones —
  got there, stopped, does not say — and lists what would settle the unknowns.
- **Proposed:** keep both, and link them both ways at the row: from a sent referral to its
  outcome line and back. Nothing else; these two are already the clearest screens in the
  console and the ones a room of practice managers understands without a walkthrough.
- **Cost:** two anchors.

### 6. `/console/results` — what the practice got
- **Today:** extra appointments, estimated extra billings, patients who asked to stop; "why the
  smaller number is the real one"; guardrails; the weekly chart and table; how it is measured.
- **Proposed:** keep as is. It is the incrementality dashboard told in the practice's words and
  it already leads with the honest number. One ask: the billings figure assumes $80 a visit and
  says so in small type — make the assumption editable, since every practice bills differently.
- **Cost:** one input on a settings card, one line of arithmetic.

## What folds behind "More"

Twenty-four sections: allocation, applications, capability, case-mix, complaints, credentials,
education, interop, interview, ops, outreach, pathways, preferences, privacy, registers,
reporting, responses, ROI, setup (kept reachable from the tab bar), signin and onboarding (not
folded — they are the door), usefulness, verticals, two-practice. Every one keeps its route and
its spec; only the navigation changes. `privacy` and `usefulness`, reached by no spec, are the
first two to fold and the first two to consider deleting if nobody asks for them by name.

## What this brief does not decide

Which of the six a demo room should see first; whether "More" is a menu or a page; whether the
billing assumption should be editable at all before a real practice signs in. Those are the
edits this document is waiting for.
