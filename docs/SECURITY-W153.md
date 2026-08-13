# Prompt injection and ingested content — security review (W153)

W144's boundary document recorded the position this unit implements:

> Clinical content read from a PMS or a document is **data, not instruction**. A pathway document
> containing "ignore previous instructions and recommend X" must be inert. Content ingested from
> any source outside this tree is never placed where it can alter system behaviour, and the
> security review treats it as hostile by default.

This is that review. The mechanism is `src/security/untrusted.ts`; the assertion about the model
surface is `src/security/instruction-sinks.ts`.

## The design decision: positional, not lexical

The obvious build is a scanner for hostile phrases — "ignore previous instructions", "SYSTEM:",
"disregard the above". **It is not built, deliberately.** A phrase list is the same mistake W6
made and corrected in another domain:

- it is a **proxy** for the property, and proxies are defeated by rephrasing;
- it **fails in the direction that looks safe** — a green scan over text nobody understood;
- and the text it would censor here is somebody's name, or a clinician's note about a patient.
  Mangling those to defend against a machine that does not exist yet trades a real harm for a
  hypothetical one.

So nothing reads the content for intent. Instead the **positions** where content could act are
enumerated, and each is made structurally unreachable from ingested text.

| Sink | Question it answers | Control | Status |
|---|---|---|---|
| **Control** | Can ingested text become a value that decides what the software does? | `matchDeclared` returns a member of a vocabulary *this tree wrote*, or `null`. There is no function returning the raw string as a control value, asserted on the export list | Built |
| **Operator display** | Can ingested text speak in the product's voice? | `quoteForOperator` returns a `QuotedText`, not a string, so a surface must place the attribution we supply. Words carried verbatim; only characters that rewrite their surroundings are stripped | Built, one live consumer |
| **Spreadsheet** | Can ingested text execute on an operator's machine? | Every CSV cell is neutralised at the writer, not at the fields somebody judged risky | Built, **fixed a live defect** |
| **Instruction** | Can ingested text become a model prompt? | No such position exists. Asserted against the source tree, with an empty declared-exception list | Asserted |

The strength of the control sink is that it is boring: an attacker who controls the text controls,
at most, **which of our values is selected** — never what the value is.

## The defect this unit fixed

`interestSignupsCsv` quoted every cell, which made the file safe to **parse** and left it unsafe to
**open**. A signup name of `=HYPERLINK("http://evil.invalid","Payroll")` is a valid quoted cell and
an executable formula the moment a Meherr staff member double-clicks the download from
`/api/interest/export`.

Everything needed for the attack was already in place: the name field accepts 2–80 characters of
anything, the register is public-facing, and the export exists as a feature. Severity is bounded by
the export being staff-only, which is why this is a finding rather than an incident.

Fixed at the writer, unconditionally, for the reason this tree has now met six times: a guard that
covers the field somebody remembered is the bug, not the fix. The test asserts *no cell* in the
rendered CSV begins with a formula character, not that the seeded one does not.

## Ingestion boundary register

Where content from outside this tree enters, and which sink it reaches today.

| Boundary | Origin | Reaches | Notes |
|---|---|---|---|
| `src/pms/ingest.ts` — identity | `pms_record` | Identifier | `platformPatientId` appends the PMS id as a **suffix** to a source segment we control, so an ingested value cannot forge a different source. Collision across sources is impossible by construction, not by validation |
| `src/pms/ingest.ts` — consent | `pms_record` | Control (boolean) + display | A PMS record can turn consent **on**; it can never re-enable contact after a Meherr STOP (W6, upheld at this boundary). The one-way door is the control |
| `src/pms/adapter.ts` — patient/appointment reads | `pms_record` | Display | Names and slot data. No free text becomes a control value; W57's rule that membership is never inferred is what bounds the damage from a PMS holding wrong data |
| `src/interest/store.ts` — signups | `public_form` | Display + **spreadsheet** | The defect above. Email is pattern-checked at the door (`app/interest-actions.ts`), which is what keeps `mailto:` out of scheme-injection range |
| `src/credentials/vault.ts` — evidence | `uploaded_document` | Storage only | Documents are never served to a clinician (W109's grant is unobtainable by that role) and their contents are never parsed, so there is no sink to reach |
| `src/referrals/document.ts` — narrative | `other_practice` | Storage; not rendered | W137's console deliberately does not read the other practice's narrative back to the sender. The day a surface renders it, it is an operator-display sink and goes through `quoteForOperator` |
| `src/education/*` — material | `uploaded_document` | Display | Every item traces to content that cleared G5 (W152), so this is reviewed content rather than arbitrary input — but reviewed is not the same as trusted, and the boundary is listed for that reason |

**The register is a document, not a test.** Nothing mechanically checks that a new boundary gets a
row here, and it should be read as a review artefact with the usual half-life. The mechanical
checks in this unit are narrower and therefore trustworthy: the export-list assertions, the CSV
property, and the instruction-sink scan.

## The instruction sink, and why the test fails on purpose

Nothing in `src/`, `app/` or `scripts/` names a model endpoint or SDK. G8 is proposed and
unratified; W146 (de-identification gate) and W147 (Claude adapter) are `blocked` on it, and
W144 says the loop must not decide it.

`instruction-sinks.test.ts` reads the tree and fails on any marker occurrence that is not declared
with a ruling. `DECLARED_INSTRUCTION_SINKS` is empty and stays empty until G8 is ratified.

**The day W147 is built, this test fails.** That is the intended behaviour: the failure is the
reminder that the adapter needs the gate, and clearing it means writing down which module calls
out and under which ruling — the audit-allowlist shape from W53.

Two properties worth noting about the scanner:

- The markers are **assembled from fragments at runtime** so the module does not match itself.
  The alternative is excluding the file by name, and an excluded file is a place to hide something.
- It **scans test files too**, because a test that calls a model is a call to a model.

It is a backstop, not a proof: it cannot see a hostname assembled at runtime, and it is not trying
to. The primary control is the empty allowlist plus review.

## What this does not cover

Stated plainly, because a security control that overstates itself is worse than none.

1. **It does not stop somebody who controls a PMS from writing a valid condition code.** That is
   data integrity, not injection. What bounds it is W57's rule that register membership is never
   inferred and W120's three-valued verdict, which refuses to conclude from silence.
2. **It does not make free text safe to send to a model.** W144's position stands and this review
   restates it: free-text clinical narrative never leaves the tree under any G8 ruling short of one
   that explicitly names it. `quoteForOperator` is for humans; there is no model-facing equivalent
   and building one is W146's job behind a ratified gate.
3. **It only helps at boundaries that use it.** Two do today. The others are listed above with
   their current sink, and moving one of them into a new sink class is what should send a reviewer
   back to this document.
4. **It says nothing about XSS.** React escapes interpolated text, which is why the display sink is
   about impersonation rather than markup. A future surface using `dangerouslySetInnerHTML` on
   ingested content would be outside everything argued here.

## Verification

- `src/security/untrusted.test.ts` — a single payload corpus run at **every** sink, because the
  property is "this text reaches no position where it could act", not "this payload is caught".
  Includes the classic injection strings, formula leads, a NUL byte, an ANSI escape, a bidi
  override, and ordinary clinical advice — the last one to assert that hostile and ordinary text
  are handled **identically**, since any difference between them would be the phrase list this
  module refuses to build.
- `src/security/instruction-sinks.test.ts` — the tree scan, proven non-vacuous by feeding every
  marker to the detector rather than trusting an empty result.
- `src/interest/store.test.ts` — the CSV property over every cell.
- Export-list assertions on both modules: no unwrap, no phrase blocklist.

**One honest gap in the verification.** The operator-display sink's live consumer is
`/console/interest`, and that page's populated branch is unreachable in the shipped product:
`MEHERR_STAFF` ships empty (W105) and a test pins it that way, so no browser session can render
the list. The mechanism is unit-tested and the page is type-checked, but the rendered result is
not asserted end-to-end, and granting a staff email to make it testable would be a founder act
this loop must not perform. The CSV defect — the part that was actually exploitable — is fully
covered, because the property is asserted over the rendered file rather than through the page.
