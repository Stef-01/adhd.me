# W182 — Q14 gate dossier: what G3 now costs, priced

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G7 with their code-level
enforcement, `docs/GATE-DOSSIER-Q9.md` covers credential visibility, `docs/GATE-DOSSIER-Q11.md`
GP-to-GP routing, and `docs/GATE-DOSSIER-Q13.md` prices G5. **This one does one thing: it prices
G3 — live SMS to real patients.** Nothing here restates a gate's definition or re-argues a
position already recorded.

Q13's dossier could say "nine modules ship a tested mechanism over an empty catalogue" and stop,
because G5 is a single decision that fills a container. G3 is not that shape, and the first job
of this dossier is to say so plainly.

## The finding, stated first: G3 alone opens nothing

**G3 is the third of three gates on the same path, and it is the only one of the three that
cannot be opened usefully on its own.**

To send a real SMS to a real patient you need, in order: a real patient (G2), a real record of
who they are and what is due (G1, PMS credentials), and permission to text them (G3). Opening G3
by itself authorises sending messages to a population that does not exist in this system.

That is not a technicality. Read the other way it is the useful news: **G3 is not the bottleneck
it is often described as, and it is also not urgent.** The Y2 audit's "the send path is the
largest gap between modelled and operative" is true and has been true for two years, but the gap
is not waiting on the SMS ruling. It is waiting on G1 and G2, and G3 becomes the last small step
rather than the first big one.

So the honest ask in §"What is asked" is not "open G3". It is "decide whether G1/G2 are being
pursued at all", because everything below is contingent on that and nothing below is contingent
on the SMS decision in isolation.

## What is actually built, verified rather than carried forward

Re-checked against the tree for this dossier, because a claim about the send path is exactly the
kind that rots — Q13's dossier found a two-year-old inconsistency by doing this.

| Piece | Where | State |
|---|---|---|
| Twilio adapter, delivery receipts, retry, STOP webhook | `src/messaging/twilio.ts` (10 tests) | Constructor **throws** on any `twilio.com` endpoint |
| Message templates | `src/messaging/templates.ts` (6 tests) | Availability language only, compliance-linted |
| Template approval | `src/messaging/approval.ts` (14 tests) | No approval recorded anywhere; called only from tests |
| Contact preferences, quiet hours | `src/messaging/preferences.ts` (13 tests) | Complete |
| Booking deep links | `src/booking/deeplink.ts` (12 tests) | https-only, no patient identifier in the URL |
| Fire-and-forget safety | `src/messaging/fire-and-forget.test.ts` | Refuses any adapter that can fail silently |

**The send path is genuinely unwired, and this is now a CONTROL rather than a claim** —
`src/messaging/send-path.test.ts` fails the day anything outside the simulator constructs an SMS
adapter or calls `send`, which is the day this dossier needs rewriting. Q13's dossier found a
two-year-old inconsistency by re-checking a claim of this kind by hand; a check that only
happens when somebody remembers is the control this tree has watched fail. The only
non-test construction of an SMS adapter in the whole tree is `src/sim/harness.ts:143`, which
builds a `MockSmsAdapter` and sends to `synthetic:<patientId>`. No page, no server action and no
route handler calls `send`. The outreach console (W95) renders the exact wording a patient would
receive and says on the page that nothing is sent from it.

**Nothing has ever been sent, so there are no delivery receipts.** That single fact is what
blocks `W174`, and it is why `W174` was written as blocked from day one rather than discovered
blocked later.

## What Q14 built while G3 stayed shut

This is the part worth recording, because it is the answer to "did the quarter waste effort
waiting". It did not, and the reason is structural rather than lucky.

**W170 made the chain a DECLARATION, not a hardcoded state machine.** `outcomeOf` takes a
`ChainDefinition` — ordered stages, and for each the event kinds that evidence reaching it. Q14
therefore audits outcomes over *the referral rail* (`REFERRAL_CHAIN` in `src/outcomes/dashboard.ts`)
without anything in the engine knowing that referrals are what it is looking at.

The consequence for G3: **an invitation chain is a new `ChainDefinition`, not a new engine.**
`sent → delivered → booked → attended`, with `undelivered`/`failed`/`STOP` as the stop kinds, is
a data change. `summarise`, the three-verdict rule, the evidence citations, the denominator
copy, the no-rate-no-score export guard and the dashboard rendering all already work over any
chain.

What else Q14 built that starts mattering on the day, none of which needs revisiting:

- **`src/ops/silence.ts` (W179)** is the module written *for* live data. "No offers outstanding"
  is true of a quiet week and of a feed that died on Tuesday, and its rule — the reassuring
  reading requires proof, every alarming reading is reachable by default — is precisely the rule
  a live send path needs on its first bad morning.
- **`src/outcomes/model.ts`'s three verdicts.** On a live rail, `not_recorded` stops being most
  of the population and becomes a real signal. The refusal to fold it into "failed" is worth
  more once there is something to fold.
- **W180's `derived` classification.** Outcome records persist nothing, so erasure composes.
  That property was proved against the referral rail and holds for an invitation rail by the
  same argument — it does not need re-establishing.

## What opens on the day, and what stays shut

Stated as capability, assuming G1 and G2 are open too, since as established G3 alone reaches
nothing.

**Opens:**

- `W174` becomes buildable: message-outcome auditing against real delivery receipts, as a second
  `ChainDefinition` over the existing engine.
- Delivery receipts start populating `src/messaging/twilio.ts`'s message records, which is the
  only evidence source that can distinguish "not delivered" from "delivered and ignored" — a
  distinction the outcome model already has a verdict for and has never been able to use.
- The Y2 attribution work (`docs/ATTRIBUTION.md`) gets its first real contrast arm.

**Stays shut, and should not be sold as opening:**

- **G5 is untouched.** Every pathway, interval and education catalogue stays empty; `W171`,
  `W172` and `W176` go on reporting correctly over nothing. Q13's dossier prices that separately
  and neither ruling helps the other.
- **G4 (pilot go-live) is a further decision.** Sending is not piloting.
- **G6** still gates the directory (`W133`), **proposed G8** third-party model vendors, and
  **proposed G9** third-party organisational reporting. None is helped by a G3 answer.
- **The `pathwayAt` residual found at W178** is a G5-side latency and is unaffected either way.

## The honest counter-argument

A ruling has a cost on the other side, and this dossier would be advocacy if it did not say so.

Sending is the first thing Meherr would do that a patient can *receive*. Every refusal in this
tree up to now has been enforceable by inspection — you can read the code and see that nothing
leaves. After G3 the guarantees become operational: a template approved today is sent tomorrow,
quiet hours are enforced by a clock rather than by a test, and a STOP that fails to register is
a person contacted after they said no. `handleStop` is terminal and tested, but "tested" and
"has never once been wrong in production" are different claims and only the first is currently
available.

There is also a sequencing argument against opening G3 early even if G1/G2 open: **the fire-and-
forget guard exists because a failed send must never be logged as sent**, and it currently
refuses the real Twilio adapter outright. Wiring live sending means deciding what happens when a
send genuinely fails mid-flight — which is a design decision the tree has deliberately not made,
because making it before there was a real failure mode to reason about would have been guessing.

## What is asked, concretely

1. **Say whether G1 and G2 are being pursued, and on what horizon.** This is the question. G3 is
   downstream of it and answering G3 first changes nothing.
2. **If they are: approve the message templates** (`approveTemplate` is called from nothing but
   its own tests, so no approval exists in the tree) and confirm the Spam Act consent flow.
   Those are G3's two stated preconditions and both containers are ready.
3. **If they are not:** say so, so that `W174` can be re-scoped rather than left blocked
   indefinitely, and so the next audit stops recording the send path as a gap when it is a
   decision.

Nothing in this dossier asks the loop to be unblocked. It asks for the price to be visible when
the decision is made — and, this time, for the decision to be recognised as a different one from
the one the ledger has been naming.
