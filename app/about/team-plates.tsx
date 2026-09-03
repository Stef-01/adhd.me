"use client";

// The plates' one entrance (design-motion-principles pass, founder-directed "more motion"):
// each founder rises once as it enters the viewport — the landing's reveal language, at the
// landing's ease, carried to the page the chapter moved to. Jakub-weighted (production
// polish): 0.55s, small translate, staggered by the built-in viewport trigger rather than a
// choreographed delay. What stays un-animated is deliberate — the plates never loop, never
// lift on hover here (nothing on this page is pressable but the links), and under
// prefers-reduced-motion every plate renders in place: the static equal, checked at the hook.
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { TEAM, monogram } from "./team";

const EASE = [0.22, 1, 0.36, 1] as const;

export function TeamPlates() {
  const reduce = useReducedMotion();
  return (
    <ul className="story-team about-team">
      {TEAM.map((f) => (
        <motion.li
          key={f.name}
          // 2026-09-03: this was the half-gate AR20 named on the landing's `Reveal` — `initial`
          // gated, `whileInView` not — and the comment above claimed the static equal that the
          // markup did not deliver: `initial={false}` leaves the plate at its SSR position and
          // `whileInView` then ran the full 0.55s rise for a reduce user. Fixed to the shape
          // `Reveal` already uses: resolve on mount at duration 0, and do not watch the viewport.
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={reduce ? { opacity: 1, y: 0 } : undefined}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={reduce ? { duration: 0 } : { duration: 0.55, ease: EASE }}
        >
          <div className="story-member-plate">
            {f.portrait ? (
              <Image
                className="story-member-photo"
                src={f.portrait}
                /* O152: was `${f.name}, co-founder of ADHD.ME`, which asserts a role the entry
                   may not hold — the page is the TEAM, not only the people who started it. The name alone is
                   the accurate alt for a portrait, and the role sits beside it in the markup. */
                alt={f.name}
                width={260}
                height={347}
              />
            ) : (
              <span className="story-member-monogram" aria-hidden="true">{monogram(f.name)}</span>
            )}
          </div>

          <div className="story-member-id">
            <strong>{f.name}</strong>
            {/* O152: rendered only when supplied. A role and a remit are characterisations, and
                W193 will not let this tree write one for a named person — so the honest
                intermediate state is a plate without them, not a plate with an invented line.
                An empty `<span>`/`<p>` would also be the broken-empty-state the web guidelines
                name. */}
            {f.role && <span className="story-member-role">{f.role}</span>}
          </div>

          {f.remit && <p className="story-member-remit">{f.remit}</p>}

          <ul className="story-affiliations">
            {f.affiliations.map((a) => (
              <li key={a.name}>
                <a href={a.href} target="_blank" rel="noreferrer" aria-label={a.label}>
                  {a.logo
                    ? <Image src={a.logo} alt={a.label} width={446} height={80} />
                    : <span>{a.name}</span>}
                </a>
              </li>
            ))}
          </ul>
        </motion.li>
      ))}
    </ul>
  );
}
