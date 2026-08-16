"use client";

// W224: the review surface. Where a transcript's proposals become a background, or do not.
//
// THE EDITABLE THING IS THE FACETS, AND THE BIO IS THE READ-OUT. That inversion is the whole
// design and it is stated at length in `src/onboarding/background.ts`: a text box labelled "your
// professional bio" reintroduces the free-text field W183 refuses, at the exact moment a clinician
// most wants to sell themselves. So the reviewer ticks what is true and reads the sentence that
// follows. The sentence is selectable, quotable and confirmable, and it cannot be typed into.
//
// CORRECTION HAS TO WORK IN BOTH DIRECTIONS. A reader that only ever proposes can only be wrong by
// commission, and a reviewer who can only reject will quietly accept things that are nearly right.
// The vocabulary is closed and short, so the whole of it is offered: everything the transcript
// proposed, plus everything it did not, in one list. Adding a facet the interview missed is the
// same gesture as rejecting one it invented.
//
// NOTHING HERE PERSISTS YET, AND THAT IS HONEST RATHER THAN UNFINISHED. `SHIPPED_DIRECTORY_PROFILES`
// is empty behind founder gate G6 and no code path can publish a profile, so a save button would
// write to a store nothing reads and imply an approval workflow that does not exist. The page says
// so. When G6 opens, this component's state is the shape that gets written.

import { useMemo, useState } from "react";
import {
  professionalBio,
  type BackgroundFacet,
  type ClinicianBackground,
  type FacetStatus,
} from "@/onboarding/background";

/** Every facet in the vocabulary, whether or not the transcript reached it. */
export type VocabularyEntry = { key: string; kind: "care" | "manner"; label: string };

const NEXT: Record<FacetStatus, FacetStatus> = {
  proposed: "accepted",
  accepted: "rejected",
  // A rejected facet goes back to proposed rather than straight to accepted, so an accidental
  // double-click cannot flip a rejection into a published claim.
  rejected: "proposed",
};

const VERB: Record<FacetStatus, string> = {
  proposed: "Not decided",
  accepted: "On the profile",
  rejected: "Not on the profile",
};

export function BackgroundEditor({
  initial,
  vocabulary,
  reviewer,
}: {
  initial: ClinicianBackground;
  vocabulary: readonly VocabularyEntry[];
  reviewer: string;
}) {
  const [facets, setFacets] = useState<BackgroundFacet[]>(() => {
    const proposed = new Map(initial.facets.map((facet) => [facet.key, facet]));
    // The proposed ones first, in the order the interview raised them, then the rest of the
    // vocabulary. A reviewer works down the transcript's findings and then checks for gaps.
    return [
      ...initial.facets,
      ...vocabulary
        .filter((entry) => !proposed.has(entry.key))
        .map((entry) => ({ ...entry, status: "proposed" as FacetStatus })),
    ];
  });
  const [confirmed, setConfirmed] = useState(false);

  const background: ClinicianBackground = useMemo(
    () => ({ ...initial, facets, readBackConfirmed: confirmed }),
    [initial, facets, confirmed],
  );
  const bio = professionalBio(background);
  const accepted = facets.filter((facet) => facet.status === "accepted").length;

  const cycle = (key: string) =>
    setFacets((current) =>
      current.map((facet) =>
        facet.key === key
          ? { ...facet, status: NEXT[facet.status], decidedBy: NEXT[facet.status] === "proposed" ? undefined : reviewer }
          : facet,
      ),
    );

  const fromTranscript = facets.filter((facet) => facet.quote);
  const notRaised = facets.filter((facet) => !facet.quote);

  return (
    <div className="be">
      <section aria-labelledby="be-raised">
        <h3 className="mc-sub" id="be-raised">Raised in the interview ({fromTranscript.length})</h3>
        <ul className="be-list">
          {fromTranscript.map((facet) => (
            <li key={facet.key} className={`be-row be-${facet.status}`}>
              <button type="button" className="be-toggle" onClick={() => cycle(facet.key)}
                aria-pressed={facet.status === "accepted"}>
                <span className={`mc-tag mc-tag-${facet.kind}`}>{facet.label}</span>
                <span className="be-state">{VERB[facet.status]}</span>
              </button>
              <blockquote className="mc-quote">“{facet.quote}”</blockquote>
              <p className="mc-cue">
                reached by “{facet.cue}”
                {facet.decidedBy ? ` · decided by ${facet.decidedBy}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="be-missed">
        <h3 className="mc-sub" id="be-missed">Not raised — add anything the interview missed</h3>
        <p className="mc-note">
          A reader that only proposes can only be wrong by commission. These are the rest of the
          vocabulary, so a reviewer can correct in both directions.
        </p>
        <ul className="be-chips">
          {notRaised.map((facet) => (
            <li key={facet.key}>
              <button type="button" className={`be-chip be-${facet.status}`} onClick={() => cycle(facet.key)}
                aria-pressed={facet.status === "accepted"}>
                {facet.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="be-bio">
        <h3 className="mc-sub" id="be-bio">The bio this produces</h3>
        <p className="mc-note">
          Assembled from the {accepted} accepted {accepted === 1 ? "facet" : "facets"} above. Not a
          text field, and it must not become one — see <code>src/onboarding/background.ts</code>.
        </p>
        <p className="mc-bio" aria-live="polite">
          {bio || "Nothing accepted yet, so there is no profile. An empty one is honest; a padded one is a claim."}
        </p>

        <label className="be-confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>
            The clinician has read this back and says it is them. Until this is ticked the
            background is a draft, however many facets are accepted.
          </span>
        </label>

        <p className="be-persist">
          Nothing on this page saves. <code>SHIPPED_DIRECTORY_PROFILES</code> is empty behind
          founder gate G6 and no code path can publish a profile, so a save button would write to a
          store nothing reads and imply an approval workflow that does not exist.
        </p>
      </section>
    </div>
  );
}
