// Phase M (ADR 0007): the small pieces the matching surfaces share. A portrait that is the
// roster's supplied image or a monogram (never a generated face: README §5), and the badge row
// that says what is DECLARED and what has been CHECKED, in those words.
import { CheckCircle, Clock, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { AGE_GROUP_LABELS, VERIFICATION_LABELS } from "@/lib/matching/labels";
import type { GPPublicView } from "@/lib/matching/views";

export function initialsOf(name: string): string {
  return name
    .replace(/^Dr\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Portrait({ gp }: { gp: Pick<GPPublicView, "name" | "image" | "realPerson"> }) {
  if (gp.image) {
    return (
      <span className="match-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gp.image} alt={gp.realPerson ? `Portrait of ${gp.name}` : `Stock portrait standing in for the example profile ${gp.name}`} />
      </span>
    );
  }
  return (
    <span className="match-portrait" aria-hidden="true">
      {initialsOf(gp.name)}
    </span>
  );
}

export function Badges({ gp, brief = false }: { gp: GPPublicView; brief?: boolean }) {
  const v = gp.verification;
  if (brief) {
    return (
      <ul className="match-badges" aria-label="What is declared and what has been checked">
        <li className={`match-badge ${v.status === "verified" ? "is-verified" : "is-pending"}`}>
          {v.status === "verified" ? <CheckCircle size={14} weight="bold" aria-hidden="true" /> : <Clock size={14} weight="bold" aria-hidden="true" />}
          {v.status === "verified" ? "Checked" : "Declared"}
        </li>
        <li className={`match-badge ${gp.availability.grade === "closed" ? "is-closed" : "is-open"}`}>{gp.availability.grade === "closed" ? "Full" : "Open"}</li>
        {!gp.realPerson && <li className="match-badge is-pending">Example</li>}
      </ul>
    );
  }
  return (
    <ul className="match-badges" aria-label="What is declared and what has been checked">
      <li className={`match-badge ${v.status === "verified" ? "is-verified" : "is-pending"}`}>
        {v.status === "verified" ? <CheckCircle size={14} weight="bold" aria-hidden="true" /> : <Clock size={14} weight="bold" aria-hidden="true" />}
        {v.status === "verified" && v.verifiedOn ? `Checked ${v.verifiedOn}` : VERIFICATION_LABELS[v.status]}
      </li>
      <li className={`match-badge ${gp.availability.grade === "closed" ? "is-closed" : "is-open"}`}>{gp.availability.copy}</li>
      {gp.telehealthAvailable && (
        <li className="match-badge">
          <VideoCamera size={14} weight="bold" aria-hidden="true" />
          Telehealth
        </li>
      )}
      {gp.credentials.aadpaTrained === true && <li className="match-badge">AADPA training declared</li>}
      {gp.credentials.racgpSpecificInterestsMember === true && <li className="match-badge">RACGP Specific Interests member, declared</li>}
      {gp.credentials.stateAdhdTrained === true && <li className="match-badge">NSW ADHD training declared</li>}
      {gp.credentials.yearsTreatingAdhd !== null && <li className="match-badge">{gp.credentials.yearsTreatingAdhd} years with ADHD, declared</li>}
      <li className="match-badge">{gp.ageGroups.map((g) => AGE_GROUP_LABELS[g]).join(", ")}</li>
      {!gp.realPerson && <li className="match-badge is-pending">Invented example</li>}
    </ul>
  );
}
