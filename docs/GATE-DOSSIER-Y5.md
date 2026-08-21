# W257 — Five-year gate dossier: every decision still outstanding, priced (2026-08-21)

Written at the close of Year 5 by `loop-0821a`. Every figure is derived from the thing it describes
— the ledger for the gates, the source files for the decisions — and pinned by
`src/quality/gate-dossier-y5.test.ts`. Nothing here is counted by hand.

**This document is built to go red.** Two ways, and they are deliberately different:

- The **gate arithmetic** is bounded to units W1–W260. W207's dossier was pinned against the live
  ledger and went red the moment W208 planned Year 5 — the document had not become wrong, the check
  had. W210 recorded that as `DOSSIER-1` with a mechanical trigger, and this file's test is the one
  that trigger was set for.
- The **seven decisions** are deliberately *not* bounded. A dossier of outstanding decisions is
  about the live state: the moment somebody answers one, this document is wrong, and going red is
  how anybody finds out. Four of the seven are answered in **source**, not in the ledger, and the
  test reads those files.

## Verdict

**18 blocked rows and seven outstanding decisions.** Seventeen of the rows name a founder gate;
one (W217) is blocked on a decision that no gate covers. Six gates are load-bearing:

- **G5** — 8 units. Clinical pathway content sign-off. Far and away the most expensive thing shut.
- **G6** — 2 units. Directory/public launch.
- **G8** — 2 units. Patient-derived content to a third-party model vendor. Proposed, unratified.
- **G9** — 2 units. Third-party organisational reporting. Proposed, unratified.
- **G10** — 2 units. Payer and insurer data flows. Proposed, unratified.
- **G3** — 1 unit. Live SMS to real patients.

**The honest headline is that the cheap gates are cheap and that is not the argument for opening
them.** G8, G9 and G10 each release exactly two units. If the only question were how much work is
waiting, all three would stay shut indefinitely and the plan would barely notice. What they
actually gate is whether this product may send patient-derived content to a vendor, tell an outside
body about a practice, and exchange data with an organisation that has a financial interest in an
individual patient's care. **Two units is what they cost; it is not what they are about.**

---

## The gates, priced

### G5 — clinical pathway content sign-off — **G5** — 8 units

Releases W161, W162, W163, W186, W249, W251, SUP-1, SUP-2.

The largest block in the tree by a factor of four, and the only one where the machinery is
completely finished in front of the ruling. Y3 shipped nine empty registries **and** every mechanism
to fill them — W69's authoring workspace, W119's two-person sign-off, W152's branding. Q13 then
built the vertical assembly against synthetic verticals, and W248/W250 built the second and third
against verticals with no name at all.

**So there is no mechanism gap left to build in front of this.** What is waiting is content, and
content needs a reviewer and a signatory who is not the reviewer. Every one of the eight rows is a
person doing a thing, not a builder writing code.

Two of the eight (W249, W251) are behind a **second** question as well — see D7.

### G6 — directory / public launch — **G6** — 2 units

Releases W133, W185. W185 is the public directory launch itself, requiring Ahpra advertising review
of all profile copy. W133 is recorded as a founder **decision** rather than a gate ruling (Q9 action
1, in `docs/GATE-DOSSIER-Q9.md`) — the cross-boundary credential question.

### G8 — patient-derived content to a model vendor — **G8** — 2 units

Releases W146, W147 — de-identification and the model adapter. Proposed and unratified since Y2.
Nothing in Y4 or Y5 assumes it: the interop lane was built so that a G8 ruling changes what may be
sent, not whether the code compiles.

### G9 — third-party organisational reporting — **G9** — 2 units

Releases W202, W203. Proposed at W196–W208 and unratified. This is the first gate about a **practice**
rather than a patient: what leaves this tree about a practice, to a body that also commissions
services from it.

### G10 — payer and insurer data flows — **G10** — 2 units

Releases W240, W241. Proposed at W208, priced in full in `docs/GATE-DOSSIER-Q19.md`. G9 governs a
body that commissions services; a payer has a financial interest in the individual patient's care,
which is why it is a separate gate rather than a G9 extension.

### G3 — live SMS to real patients — **G3** — 1 unit

Releases W174, message-outcome auditing. Everything downstream of sending has been built against
the recorded rail since W28/W29/W36, because **nothing has ever been sent**.

### W217 — blocked with no gate

Learned ranking of patients. Blocked on a founder decision recorded in `docs/GATE-DOSSIER-Q17.md`,
and the only blocked row in the tree that names no gate — because the thing in its way is a
**published legal notice**. W201's ADM-transparency statement says, in its *never automated* list,
"No ordering of patients by need or by how unwell they are". A learned ranker over patients is that
sentence. Ruling on it means changing a published notice, not a config.

---

## The seven decisions

Each says where its answer would appear. The test reads that place, so answering any of them turns
this document red.

### D1 — Dr Anusha Saxena's relationship to ADHD.ME

**Where:** `src/demo/roster.ts` — a `FOUNDER:` marker on her entry.

Her disclosure currently reads "Dr Anusha Saxena has a declared interest in ADHD.ME", which is the
minimum that is **certainly** true. The founder direction was "add Anusha as cofounder on the page";
the tree did not write "cofounder" into a disclosure about a real named person without that being
stated as her role. **Cost of leaving it:** a real person's public entry describes her with a general
word rather than her actual relationship. **Cost of answering it:** one line.

### D2 — Saif Tareen's photo, role and remit

**Where:** `public/saif-tareen.png` — this one resolves by the file existing.

Recorded in `docs/DESIGN-QA.md` (O152). The entry is built and waiting; a 3:4 image dropped at that
path completes it. **Nothing in this tree generates a face for a real person**, which is why the
decision cannot be closed by a builder.

### D3 — "prescriber" on Dr Anusha's profile

**Where:** `e2e/profile-sweep.spec.ts` — the accepted finding.

Her copy says "She has completed an endorsed ADHD prescriber course". The compliance rule matches
`prescrib\w*` inside a **course title** rather than a claim to prescribe for anybody. Two readings,
and they lead opposite ways: the rule is right and her copy must change, or it over-matches a proper
noun and needs an exemption. Either changes what is said about a named person or changes a
compliance rule. Accepted so the gate is honest about what it found — **not** a judgement that the
copy is fine.

### D4 — "mental health" on Dr Anusha's profile

**Where:** `e2e/profile-sweep.spec.ts` — the accepted finding.

"Her clinical interests are ADHD, mental health, women's health…" — her own declared interests, and
a care area this product matches on. The rule's rationale is that naming a condition **to a patient**
targets them; naming what a GP does on their own listing is what a directory is for. The closest of
the accepted findings to the rule's actual intent, and the one most worth a deliberate answer.

### D5 — the disclosure-ledger posture

**Where:** `src/interop/disclosure-ledger.ts` — `DISCLOSURE_PAYLOAD_POSTURE`.

`"fact_only"` today: the ledger records that a disclosure happened, to whom and when, and **not the
figures that were in it**. It can answer who was told something and cannot answer what they were
told. The other value is `"figures_included"`, and changing it is **one line** — `DisclosureEntry`
is derived from the constant, so the other answer stops compiling everywhere it is not honoured.

Both consequences are written beside it. `figures_included` answers what a recipient was told and
is therefore a lasting copy of practice-identifiable data with a life of its own.

### D6 — G10 ratification

**Where:** `BUILD-STATE.md` — W240 and W241 are blocked on it.

Priced in full at `docs/GATE-DOSSIER-Q19.md`. Two units, and the dossier's own headline is that
being cheap to leave shut is not the argument for shutting it.

### D7 — the second care area

**Where:** `BUILD-STATE.md` — W248 and W249 against W186's row.

**The ledger contradicts itself.** W248 and W249 are titled "Women's health" — which the plan's
provenance banner names as the domain this tree was reoriented **away from**, not a care area
awaiting a decision. And W186's row, arguing why it cannot take `autism-adhd` for itself, states as
fact: *"W248/W249 already hold autism and taking it here would leave this unit doing nothing."*

The 2026-08-14 reorientation reasoned about these rows as autism, wrote that reasoning into a
neighbouring row, and never edited the rows. W248 raised it, corrected the plan banner from three
affected units to five, and built its machinery against a vertical with **no name at all** — because
picking ADHD.ME's second care area is §4 work and not the loop's. W249 and W251 are behind this as
well as behind G5.

---

## One thing no gate covers

**A credential for this product's own API.** G1 covers real PMS and booking credentials; W254 ships
the scope model with no minting path and an empty grant registry, and says outright that no named
gate protects it. Not listed among the seven because nobody is waiting on it — nothing is blocked —
but when an integrator is to hold a credential, that ruling and the minting path arrive together
rather than the second arriving first.
