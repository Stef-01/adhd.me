# Q11 hardening (W142) — code review, security review

Quarter under review: **W131–W141**, the GP-to-GP referral rails. Referral document, return
report, acceptance protocol, status tracking, loop closure, both-sides console, responsibility
posture, compliance linter, scoping sweep and analytics. W133 is blocked on G6 and was not
built.

**Result: two findings, both fixed, both mine, both the same shape — and that shape was named
in the previous quarter's hardening.**

## Findings

| # | Severity | Unit | Finding |
|---|---|---|---|
| 1 | High | W134 (mine) | Two acceptance acts on the **same day** resolved by array order — accept-then-decline gave `declined`, decline-then-accept gave `accepted` |
| 2 | High | W137 (mine) | `returnFor` used `.find()`, so a **corrected return report** was shown or hidden depending on storage order |

### 1. Same-day acceptance resolved by array position

`acceptanceStatus` sorted acts by date and folded them. `Array.prototype.sort` is stable, so
acts sharing a date kept their input order — and the last one written won. A practice that
accepted a referral and then corrected it to a decline the same morning got `declined` or
`accepted` depending on which row happened to be stored first.

**This one is worth stating plainly, because I wrote the claim it violates.** W134's commit
message says the fold is "order-independent by construction... tested over four orderings". That
is true, and all four orderings used **distinct dates**. The claim was wider than the test, and
the case it missed is not exotic: answering a referral and correcting it within the day is
ordinary practice administration.

**Fixed** by making the tie-break a decision rather than an accident. Day-granular dates cannot
order two events within a day, so among same-day acts the one that **leaves the referring
practice watching** wins — a decline beats an accept, and a hand-back beats an accept. Not
knowing whether a practice took a patient on must never resolve to "they did", which is W134's
own thesis applied to its own tie-break. A later acceptance still wins over an earlier decline,
because that is a genuine change of mind rather than a tie.

### 2. A corrected return report could be lost to array order

`returnFor` was `state().returns.find(...)`, which takes the **first** match. A return report
corrected and re-filed later was therefore shown or hidden depending on how the two happened to
be stored.

A return report is clinical communication between two practices. Presenting a superseded one as
current is a wrong answer rather than an untidy one — the outcome field is exactly what tells the
referring GP whether they are still watching the patient (W132), so the wrong copy inverts the
answer to the question the rail exists to settle.

**Fixed**: the latest by `reportedAt` wins, and two *different* reports sharing the latest date
are reported as **ambiguous** rather than resolved by position. That is W111's rule — two matches
are ambiguous, never the first one, because picking one attaches the wrong record to a patient —
and the console now says "two different return reports were filed on the same date, check which
one stands" instead of quietly picking. An identical duplicate is *not* a conflict, because
calling it one would send a practice chasing a difference that does not exist.

## The method note is the finding

Q10's hardening ended with a rule: **for any module that folds a collection into one answer,
test two of the thing, in both orders.** Q11 was written after that rule existed. I applied it
in W134 and W135 — and both findings here are still that shape, because I applied it to the
*dimension I was thinking about* rather than to every dimension that can tie.

W134 tested two acts in four orders **with different dates** and concluded order-independence.
W137 never tested two return reports at all, because "two returns for one referral" did not look
like a case until this sweep asked for it.

So the rule needs sharpening, and this is the version to carry into Q12:

> For any fold, ask what the *sort key* is and then construct two records that **tie on it**.
> Test both orders. If there is no principled winner, the tie is a finding, not a detail — pick
> the safe side and write down why, or report the ambiguity.

Both fixes above took that second branch. The acceptance fold picks the safe side; the return
lookup reports the ambiguity. Which is right depends on whether a safe side exists: for
acceptance it does (keep watching the patient), for two disagreeing clinical letters it does not.

## What was checked and found clean

- **Cross-practice isolation.** W140's own sweep is the quarter's audit for this and found one
  hit, already fixed and recorded there. Re-checked: the triage covers every export, both
  directions, and the two-practice behaviour tests hold.
- **Erasure.** `deletePatientEverywhere` reaches the referral rail on both sides, counted in the
  deletion record. The registry test that forced this is still non-vacuous.
- **No patient in an analytic.** W141 carries no patient id, no referral id and no receiving-
  practice breakdown, asserted on the serialised payload as well as the key list.
- **No clinical text the product wrote.** W131 and W132 each carry exactly one prose field, both
  attributed, and neither module exports a generator or template. W139's linter delegates to W6,
  W23 and W66 rather than copying them, with the wiring asserted.
- **The acceptance gate.** No path produces a patient-linked obligation without proof of
  acceptance; re-verified after the tie-break change, including that a same-day conflict yields
  no obligation in either order.
- **Advisories.** `audit:gate` green, two accepted, neither past review.

## Verification

`pnpm verify` green. Full e2e re-run.
