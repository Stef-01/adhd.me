# W247 — Q19 hardening

Scope: W235–W246, the interop lane (`src/interop/*`, eight modules), W246's console view and its
page. Run with the review skills per CLAUDE.md law 5, plus the disclosure ledger's own W106
classification.

## Verdict

**Eight findings: six fixed, two carried with the trigger that makes them live.** Two of the six
are the two halves of one function — the writer that enforces W243's central property was the one
thing in the module able to break it, in two independent ways.

The lane has no endpoint, no HTTP client, no credential, every `SHIPPED_*` collection pinned empty
and G1 shut — so the honest framing of that is not "the review was clean". **The lane is clean
because it is inert**, and a review that stopped there would be the most misleading true sentence
available. What follows separates the two: findings live in the code as it stands today, and
findings that become live the day the lane stops being inert. Both matter; the second list is the
one that would otherwise be discovered by an incident.

Gate at HEAD: `pnpm verify` green, plus nine seeded failures — each fix was watched failing before
it was trusted.

---

## Q19-1 — a withdrawal of consent could be recorded and never take effect (HIGH) — FIXED

`withdrawDisclosureConsent` took `atIso` and stored it without validating it. Every downstream read
decides effect with `consent.withdrawnAtIso <= asOfIso`, which is a **string** comparison.

```
"not a date" <= "2026-08-21"   →  false   ← withdrawal never takes effect
""           <= "2026-08-21"   →  true    ← withdrawal takes effect immediately
```

So a withdrawal stamped with an unreadable date leaves the consent reading `given` for ever: a
patient who withdrew, recorded as having withdrawn, and disclosed about anyway. **It fails open for
some malformed inputs and safe for others**, which is why nothing caught it — a test that tried one
empty string would have concluded the function was fine.

`recordDisclosureConsent` validates every date it is given. The writer beside it validated none.

**Fix.** `withdrawDisclosureConsent` returns a `WithdrawalResult` and refuses a date it cannot read,
with the reason saying why an unreadable withdrawal is refused rather than stored. Every call site
was a test, and the signature change made the compiler find all of them.

## Q19-2 — a later withdrawal re-granted consent for the days between (HIGH) — FIXED

The same function set `withdrawnAtIso` unconditionally. Calling it again on an already-withdrawn
consent with a later date moved the withdrawal forward, restoring permission across the interval.

W243's stated property is **monotonicity: time can only ever remove consent.** Every test the unit
shipped read that property off `disclosureConsentAt`, which is the *reader*. The one function able
to falsify it was the *writer*, and nothing tested the writer against the property at all.

**Fix.** The earliest withdrawal stands; a later one is a no-op rather than an error, because a
patient repeating themselves has done nothing wrong. An *earlier* correction still applies — it
removes consent sooner, which the property permits. Proven over every ordered pair of four dates
rather than on one example.

## Q19-3 — two patients on one FHIR Appointment resolved silently to the first (MEDIUM) — FIXED

`appointmentFromFhir` read participants with `references.find(r => r.startsWith("Patient/"))`. R4
permits several participants and a group session is a real thing. What is not real is a
single-patient appointment **attributed to whichever reference happened to come first in the
array** — a wrong-patient attribution decided by array order, with no refusal and no record that a
choice had been made. The same applied to `Practitioner/`, which decides whose diary the booking
lands in.

Every other ambiguity in that mapping is refused by name. This one was resolved in silence, which
is the exact failure mode W235 was written against.

**Fix.** Participants are counted rather than found, and more than one of either refuses with
`ambiguous_participant`. W235's own register then caught the addition — it requires every declared
refusal to be *produced* by a case in the corpus, not merely declared — so both cases are exercised.

## Q19-4 — conformance diagnostics embedded record contents (MEDIUM) — FIXED

`contractViolations` reported round-trip failures as:

```ts
add("round_trip", `a record did not survive: ${JSON.stringify(value).slice(0, 60)}`)
```

— the first sixty characters of the record. Harmless over the synthetic corpora it runs against
today, and **patient data on an error path the first time somebody points a conformance check at
real records to find out why a real integration is dropping them**, which is what a conformance
check is for.

**Fix.** Details name the record by index. An index identifies it for anybody holding the corpus
and tells anybody who is not holding it nothing. A test asserts no violation detail on any branch
carries a value from the corpus — not only the branch that was wrong.

## Q19-5 — the disclosure ledger read across practices (MEDIUM) — FIXED

`disclosuresTo(ledger, recipient)` filtered on recipient alone. Every entry carries a `practiceId`
and this was the one function that ignored it, so the moment a ledger holds two practices' entries —
which is what a ledger is *for* — a caller asking "what did we send to this PHN" gets another
practice's disclosures back.

**That is Y4-1's shape exactly**: this tree's own HIGH finding, a cross-tenant read created not by a
missing check but by a query that never took the tenant. W123's rule is that a read takes the
practice *as the query*.

**Fix.** `disclosuresTo(ledger, practiceId, recipient)`, no overload without it. The existing test
used a single practice, so it would have passed identically before and after — the fixture now
carries a second practice sending to the *same* recipient, which is the only version of this test
that can see the bug.

## Q19-6 — the timestamp pattern was anchored at one end (LOW) — FIXED

`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/` accepted `"2026-08-20T09:15:00+10:00 and also whatever else"`,
carrying the trailing text into the ledger and into the `localeCompare` that orders it. Anchored at
both ends, with seconds and offset optional because both are optional in the timestamps this tree
already stamps.

---

## Carried — live the day the lane stops being inert

### Q19-7 — the consent check reads a timestamp the caller supplies

`appendDisclosure` checks permission at `entry.disclosedAtIso`, which the caller fills in. That is
an authority decision resting on the caller being honest about when it sent the thing.

The exposure is **narrower than it first appears**, and the narrowing is worth stating rather than
leaving as reassurance: a disclosure backdated to before the consent existed is already refused,
because `disclosureConsentAt` returns `not_recorded` for any moment earlier than the record. What
remains is backdating *into* a window where consent was live, to slip past a later withdrawal or
expiry.

**Not fixed, because the alternative is worse.** Stamping the time inside `appendDisclosure` would
make the ledger record when somebody got around to writing the entry rather than when the
disclosure happened — the one fact it exists to hold.

**Trigger:** the first code path that actually sends something. The timestamp must then come from
the send path, stamped where the transmission happens, and this check reads a value no caller chose.

### Q19-8 — carried text from another system bypasses every copy rail this product has

`ExchangeRecord` carries `theirReason`, `acknowledgedBy` and `theirReference` — free text from
somebody else's system. Every other sentence this product shows an operator passes the advice
linter, because this tree wrote it. **These cannot**: they are the other side's words, and refusing
to show them throws away the one piece of information that says what to fix.

A receiving system whose refusal reason reads *"start this patient on a stimulant trial"* would put
clinical advice on an ADHD.ME surface, through the one door in the product the G7 rails do not
cover. Nothing renders these fields today, which is the only reason this is a note rather than a
defect.

**Trigger:** the first surface that renders one of them. The rule at that point is attributed
quotation — marked as the other system's words, never rendered as this product's own sentence — and
W200's register grows a case for copy this tree did not author.

---

## The W106 half: the module the detector could not see

`src/interop/disclosure-ledger.ts` was **undeclared through its own unit and the four after it**.

W106 finds a record class by scanning for `globalThis as {` — a module that can retain data across
requests. W239 has no store: `appendDisclosure` takes a ledger and returns a new one. So the
detector never fired, and the silence read as a clean result rather than as nobody having looked.

It is the module whose entire subject is **what left this tree about a named patient**. Every
`DisclosureEntry` carries a `DisclosureConsent`, and that consent carries a patient id, so an entry
is patient-identifying by construction even though the module holds none of them. A register that
decides what holds patient identity by looking for a store keyword is deciding on a **proxy**, and
this is the module the proxy misses.

Now declared `derived`, with the trigger stated: the first store that persists a ledger makes it
`stored` and inherits the tension already written down under `disclosure-consent.ts` — erasing the
record of a disclosure destroys the evidence that it happened, which is the one thing an audit
afterwards needs.

### Why the repair is lane-scoped and not tree-wide

The obvious fix is a rule on modules naming a patient id. **W247 measured that before writing it:
39 undeclared modules name `patientId` in code**, nearly all of them pure functions that pass one
through without holding it. A rule carrying 39 exceptions is weaker than the prose it replaces.

So the new check is bounded to the lane where the miss happened: every module in `src/interop/` is
either a declared record class or listed in `NO_PATIENT_LINKAGE` with a reason held to the same bar
as a rationale. Eight modules, eight answers. **"Not in the register" no longer means two things at
once** — somebody looked and it holds nothing, or nobody looked.

This is the same shape as the gap W246 recorded in W200 an hour earlier: a register that enforces
the direction its author had in mind and not the other one. **Two registers, two directions, both
found in one day** — which is the argument for the next register being asked, when it is written,
which direction it checks.

### And the detector matched its own explanation

Adding the rationale above broke W106 immediately: the sentence explaining which keyword the
detector looks for **contains that keyword**, so the register reported itself as an undeclared
store. This tree has now hit that exact shape four times. The scan strips comments and string
literals before reading, and — the part that matters — a test asserts the stripper left the code
behind, because a stripper that removes too much silently turns the whole detector into a check
that examines nothing.
