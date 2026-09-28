"use client";

// The stars after a visit (founder, 2026-09-28: "stars and text feedback after patients have seen the
// doctor, not used visually but to improve the algorithm"). A day after a tap on "Book", the home
// screen asks once, in one line: one tap on a star is the whole answer, a note is optional after it,
// and "Not yet" asks again two days later, three times at most. Nothing here is shown to anyone: the
// stars teach the ranking which asks mattered (src/db/learn.ts). See src/finder/track.ts.

import { ArrowUp, Star } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { forgetVisit, rateVisit, snoozeVisit, visitDue, type PendingVisit } from "@/finder/track";

const STARS = [1, 2, 3, 4, 5] as const;

export function RateVisit() {
  const [visit, setVisit] = useState<PendingVisit | null>(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  // On this device only, after the page has arrived: nothing to render on the server.
  useEffect(() => {
    setVisit(visitDue());
  }, []);

  if (!visit || done) return null;
  const question = `How was your visit with ${visit.name}?`;

  function choose(n: number) {
    if (!visit) return;
    setStars(n);
    void rateVisit(visit, n);
    // The stars are the answer: the visit is not asked about again, note or no note.
    forgetVisit(visit.handoffId);
  }

  function send(event: FormEvent) {
    event.preventDefault();
    if (!visit) return;
    const words = note.trim();
    if (words) void rateVisit(visit, stars, words);
    setDone(true);
  }

  return (
    <section className="rate-visit" aria-label={question}>
      {stars === 0 ? (
        <>
          <p className="rate-visit-question">{question}</p>
          <div className="rate-visit-stars" role="group" aria-label={question} onMouseLeave={() => setHover(0)}>
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                className={n <= hover ? "rate-visit-star is-lit" : "rate-visit-star"}
                aria-label={n === 1 ? "1 star" : `${n} stars`}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onClick={() => choose(n)}
              >
                <Star size={30} weight={n <= hover ? "fill" : "regular"} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rate-visit-later"
            onClick={() => {
              snoozeVisit(visit.handoffId);
              setDone(true);
            }}
          >
            Not yet
          </button>
        </>
      ) : (
        <form className="rate-visit-note" onSubmit={send}>
          <p className="rate-visit-question" role="status">
            Thanks.
          </p>
          <div className="rate-visit-box">
            <label className="sr-only" htmlFor="rate-visit-note">
              Anything to add
            </label>
            <input
              id="rate-visit-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything to add?"
              maxLength={1000}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="rate-visit-send" aria-label={note.trim() ? "Send" : "Done"}>
              <ArrowUp size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
