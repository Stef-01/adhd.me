# Meherr demo walkthrough (W22)

Scripted end-to-end demo on the synthetic practice. Everything is fake by design
(founder gates: no real patient data, no live SMS); the point is to show the *shape*
of the product — minimal invitations in, verified incremental appointments out.

## Setup (once, ~2 min)

```bash
pnpm install
pnpm build && pnpm start   # or: pnpm dev
```

Open `http://localhost:3000/demo` in the presenting browser. Keep this tab — it is
your cheat-sheet: booking links live here, and the **Reset demo** button returns the
world to the start of this script between meetings.

## The script (~10 min)

1. **Launch.** On `/demo`, click **Launch demo**. You land signed in on the practice
   console as the owner of *Demo Family Practice* (20% holdout configured).
   > "This is what your practice manager sees. One config surface, no PMS surgery."

2. **Rules** (`/console`, then *Edit rules*). Show the eligibility controls: recency
   window, booking-block window, quarterly contact cap, usual-GP-only.
   > "Every invitation passes these deterministic rules first. The AI never overrides
   > them — it only ranks within who's already eligible. And a fifth of eligible
   > patients are held out so the numbers you'll see next are provable."

3. **Incrementality** (`/console/dashboard`). The north-star tile row and the two-line
   weekly chart.
   > "Blue is invited patients, orange is the holdout. The gap is what we actually
   > created. And this number here is what a naive vendor would claim — we show it
   > only to show you why we don't bill on it."

4. **Patient moment** (back to the `/demo` tab). Open **Patient 1's booking link** in a
   new tab — this is the SMS deep link.
   > "The message named the GP, the practice, and a way out. Nothing clinical, no
   > urgency — that's the Ahpra/Spam Act posture, enforced by a linter in code."
   Click **Confirm booking**. Show the confirmation.

5. **Offer expiry** (open Patient 2's link, book it too, then Patient 3's).
   > "Session's full, so the remaining offer lapsed on its own. Nobody gets invited
   > to a slot that no longer exists."

6. **Usefulness audit** (`/console/usefulness`). Record an outcome for a visit.
   > "After each generated visit, one tap from the GP: was it worthwhile? That's our
   > clinical-value evidence, not just utilisation."

7. **Admin ops** (`/console/ops`). Queue counts, per-practice pause, kill-switch.
   > "And when you want it to stop, it stops — one switch, everything halts, the
   > audit trail keeps the receipts."

8. **ROI** (`/console/roi`). Close on the economics widget.
   > "At your scale this is the annual number. The pilot proves it with your data —
   > 12 weeks, holdout on, our reports every Monday."

## Reset

`/demo` → **Reset demo to the start**. Idempotent; run it between every meeting.

## If something looks off

The demo world is in-memory per server process. Restarting the server (`pnpm start`)
plus one **Launch demo** click always yields the exact scripted state.
