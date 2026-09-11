# 8. Accounts and sync: the argument, for the founder to decide

Date: 2026-09-10

## Status

Proposed. `docs/adhd-life/PLAN.md` names this as "the first thing that needs a backend; ADR 0004
is where to argue it". ADR 0004 decided the product without a backend; this note argues the
backend so the founder can decide with the options in front of them. Nothing here is built.

## Context

Every record a person makes in the app lives in their own browser: the model under one versioned
key, the Lives profile, learning progress, the finder's filters, and the match request keyed by
an opaque id in session storage. Two consequences are now visible on the product itself:

- A person who opens the app on a second device, or clears a browser, starts from nothing. The
  Lives loop, the goals and the manual are the parts most worth keeping and the first lost.
- The match request already has to cross machines: a GP answers on the console and the person
  reads the answer on their phone. Phase M5 solved the server half with a journal
  (`src/lib/matching/persistence.ts`); the person's half is still a tab.

Six readings, briefly, as the house rule asks:

- **First principles.** An account is a name for a set of records that outlives a device. The
  product needs the set to outlive the device; it does not need the name. The minimum is a key
  the person holds, not an identity the product holds.
- **History.** Consumer health apps that asked for an account at the door lost most people at
  the door; the ones that let the product prove itself first (Finch, Headspace's early years)
  asked later, once there was something to lose. The e2e suite and the privacy register were
  built on "nothing leaves the device", and every public sentence about privacy says so.
- **Contrarian.** Perhaps sync is not wanted. A person using this at 2am on one phone loses
  little; the practice side is where records must persist, and that side already has sessions.
  The honest counter: the Lives loop is explicitly designed to compound over weeks, and a
  compounding record on a disposable device is a contradiction the product will meet.
- **Technical.** The seam exists. The matching journal mirrors rows over PostgREST behind two
  variables; the same shape carries a `device_records` table keyed by an opaque id. Identity can
  arrive later as a claim over ids (a passkey or an emailed link binds an id to a person), which
  is the order that keeps the door open. Row-level security policies are the real work; the
  migrations have been default-deny since 0001.
- **Economic.** A backend is the first recurring cost and the first operational duty (backups,
  deletion on request, breach notification). It is also what a practice pays for: a person's
  request that reaches a GP reliably is the product's price tag. The cost lands on ADHD.ME; the
  value lands on both sides.
- **Regulatory.** The moment a narrative is stored off-device, the Australian Privacy Principles
  apply in full (APP 11 security, APP 12 access, APP 13 correction) and the register's erasure and
  export entries stop being courtesies. Health information is sensitive information under the
  Privacy Act; the policy at `/privacy` would need its collection statement rewritten before the
  first row is written. A passkey-first design keeps no email at all, which is the smallest
  collection that still gives a person their records back.

## Options

1. **Stay device-local** (today). No cost, no duty, no second device. The Lives loop stays a
   single-device record and says so.
2. **Sync without identity.** A `device_records` table behind the existing journal, keyed by an
   opaque id the browser mints and shows the person as a recovery code (twelve words). A second
   device types the code. No email, no password, nothing to breach beyond the rows themselves,
   which are encrypted at rest with a key derived from the code. Erasure is one delete. This is
   the smallest change that keeps a record across devices.
3. **Accounts.** Passkeys (WebAuthn) first, an emailed link as the fallback, an identity table
   that binds ids to a person, and the console's membership model extended to people. Everything
   in option 2, plus recovery without a code and the ability to show a GP who a request is from.

## Recommendation

Option 2, behind the same two variables as the matching journal, with option 3 held until a
pilot shows people losing records they wanted back. The collection statement, the register
entries and the erasure test land in the same unit as the table, before it is switched on.

## Consequences if adopted

- `supabase/migrations/0008_device_records.sql`; a `records` journal beside the matching one;
  `src/privacy/record-classes.ts` gains a `stored` class with export and erase.
- `/privacy` gains a collection statement for the synced record and the recovery code.
- The e2e suite gains a two-context walk: write on one, recover on the other.
- The switch is a founder act, as the matching journal's is.
