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
import { FOUNDERS, monogram } from "./founders";

const EASE = [0.22, 1, 0.36, 1] as const;

export function TeamPlates() {
  const reduce = useReducedMotion();
  return (
    <ul className="story-founders about-founders">
      {FOUNDERS.map((f) => (
        <motion.li
          key={f.name}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="story-founder-plate">
            {f.portrait ? (
              <Image
                className="story-founder-photo"
                src={f.portrait}
                /* O152: was `${f.name}, co-founder of ADHD.ME`, which asserts a role the entry
                   may not hold — the page is the TEAM, not only its founders. The name alone is
                   the accurate alt for a portrait, and the role sits beside it in the markup. */
                alt={f.name}
                width={260}
                height={347}
              />
            ) : (
              <span className="story-founder-monogram" aria-hidden="true">{monogram(f.name)}</span>
            )}
          </div>

          <div className="story-founder-id">
            <strong>{f.name}</strong>
            {/* O152: rendered only when supplied. A role and a remit are characterisations, and
                W193 will not let this tree write one for a named person — so the honest
                intermediate state is a plate without them, not a plate with an invented line.
                An empty `<span>`/`<p>` would also be the broken-empty-state the web guidelines
                name. */}
            {f.role && <span className="story-founder-role">{f.role}</span>}
          </div>

          {f.remit && <p className="story-founder-remit">{f.remit}</p>}

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
