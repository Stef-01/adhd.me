# Meherr Support Runbook (W47, v1)

Who does what when something goes wrong during a pilot or subscription. Severities are defined
by patient impact first, revenue impact second.

## Severities & response

| Sev | Definition | Response | Examples |
|---|---|---|---|
| 1 | Patient-facing harm risk or compliance breach | Stop sends NOW (per-practice kill switch, W19), notify practice sponsor same hour, incident review within 24h | non-compliant message sent; wrong-patient invitation; opt-out not honoured |
| 2 | Service materially wrong but not harmful | Fix or pause affected clinician/session same day; note in weekly report | eligibility rule misapplied; booking link broken; report numbers wrong |
| 3 | Degraded/cosmetic | Next release; log in ledger | console UI defects, delayed report |

**Sev-1 rule: pause first, diagnose second.** The kill switch is always the first action; there
is no diagnosis step before it.

## Standing procedures

- **Opt-out complaint** ("I said stop") — Sev 1: verify STOP processing in the event log (W10
  spine replay); if the opt-out was honoured and the message predates it, explain with the log
  timeline; if not honoured, kill switch + incident.
- **"A patient was told they're sick/overdue"** — Sev 1: pull the exact rendered message from
  the event log; the compliance linter makes this structurally impossible, so treat any claim as
  either a misread (show the practice the message) or a linter escape (incident + linter fix +
  full audit of sent messages).
- **Practice wants numbers explained** — walk the weekly report; the naive-vs-incremental
  contrast is the most common confusion (docs/ATTRIBUTION.md is the reference).
- **PMS sync failure** — invitations pause automatically on stale data (W36 guards); resolve the
  adapter, verify freshness, resume. Never send on stale slot data.
- **Builder/loop note (internal)** — production incidents never wait for the build loop; page a
  human. The loop builds product; it is not on call.

## Contact chain

Operator (us, first line) → practice manager (their side) → practice sponsor. Every Sev 1/2 gets
a ledger entry: what happened, patient impact, fix, prevention. Prevention items become build
units in BUILD-STATE.
