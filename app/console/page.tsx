// The console home as the spine's index (docs/console-spine-brief.md): the six screens, each with
// one live number read from the module its page renders, then the nine tool links under
// "All tools", then the rules card, which is the one thing a manager edits weekly.

import Link from "next/link";
import { Suspense } from "react";
import { openComplaintCount } from "@/complaints/store";
import { capacityView } from "@/console/capacity";
import { buildPracticeResults } from "@/console/results";
import { defaultSim, northStar, underFull } from "@/console/spine";
import { billingPerVisitFor, getConsole, practicesFor, type PracticeRecord } from "@/console/store";
import { DEFAULT_GUARDRAILS } from "@/guardrails/monitors";
import { isoDaysFrom } from "@/lib/dates";
import { tieQualityReport } from "@/matching/tie-quality";
import { REFERRAL_CHAIN, referralChainOutcomes } from "@/outcomes/dashboard";
import { summarise } from "@/outcomes/model";
import { acceptanceStatus } from "@/referrals/acceptance";
import { actsFor, eventsFor, sentBy, sentEventsFor, sentTo } from "@/referrals/store";
import { trackReferral } from "@/referrals/tracking";
import { getDashboardData } from "@/sim/dashboard-data";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "./guard";
import { ConsoleShell } from "./ui";

export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-AU");

type SpineCard = { key: string; href: string; label: string; figure: string | null; detail: string };

const SCREENS: ReadonlyArray<Pick<SpineCard, "key" | "href" | "label">> = [
  { key: "dashboard", href: "/console/dashboard", label: "Measurement" },
  { key: "matching", href: "/console/matching", label: "Matching" },
  { key: "capacity", href: "/console/capacity", label: "Capacity" },
  { key: "referrals", href: "/console/referrals", label: "Referrals" },
  { key: "outcomes", href: "/console/outcomes", label: "Outcomes" },
  { key: "results", href: "/console/results", label: "Results" },
];

/**
 * One live number per screen, from the same modules the screens render, so the home cannot show
 * a figure its page would not. A withheld figure is a word, never a nought.
 */
function liveCards(record: PracticeRecord): SpineCard[] {
  const practiceId = record.practice.id;
  const data = getDashboardData();
  const star = northStar(data);
  const sim = defaultSim();
  const asOfIso = isoDaysFrom(sim.config.todayIso, sim.config.weeks * 7 + 1);
  const full = underFull(
    capacityView(sim.appointments, asOfIso, { fromIso: sim.config.todayIso, toIso: asOfIso }).sessions,
  );
  const acts = actsFor(practiceId);
  const events = eventsFor(practiceId);
  const awaiting =
    sentTo(practiceId).filter((d) => acceptanceStatus(acts, d.referralId).state === "awaiting_acceptance").length +
    sentBy(practiceId).filter(
      (d) => trackReferral(d.referralId, practiceId, events, acts).acceptance === "awaiting_acceptance",
    ).length;
  const outcomes = summarise(referralChainOutcomes(sentEventsFor(practiceId)), REFERRAL_CHAIN);
  const tie = tieQualityReport();
  const results = buildPracticeResults(data, [], {
    revenuePerAttendedVisit: billingPerVisitFor(record),
    guardrails: DEFAULT_GUARDRAILS,
  });
  const extra = results.extraAppointments;

  const figures: Record<string, Pick<SpineCard, "figure" | "detail">> = {
    dashboard: star === null
      ? { figure: "Withheld", detail: "the page says why" }
      : { figure: star.toFixed(1), detail: "attended per 1,000 above holdout" },
    matching: { figure: `${Math.round(tie.separationRate * 100)}%`, detail: "of requests the words separated" },
    capacity: full.rated === 0
      ? { figure: "Not recorded", detail: "no session on record" }
      : { figure: num(full.underFull), detail: `of ${full.rated} sessions ran under full` },
    referrals: { figure: num(awaiting), detail: "awaiting an answer" },
    outcomes: outcomes.total === 0
      ? { figure: "None", detail: "no referral on the rail" }
      : { figure: num(outcomes.notRecorded), detail: `of ${outcomes.total} the record does not say` },
    results: extra === null
      ? { figure: "Withheld", detail: "the page says why" }
      : { figure: num(extra), detail: `extra appointments over ${results.weeks} weeks` },
  };
  return SCREENS.map((screen) => ({ ...screen, ...figures[screen.key]! }));
}

async function SpineCards({ email, record }: { email: string; record: PracticeRecord }) {
  // Yield once so the heading streams ahead of the sim, which costs seconds when cold.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const allowed = authorize(getConsole().memberships, email, record.practice.id, "view_dashboard").allowed;
  const cards: SpineCard[] = allowed
    ? liveCards(record)
    : SCREENS.map((screen) => ({ ...screen, figure: null, detail: "Not open to your role." }));

  return (
    <ul className="console-spine" data-testid="spine-cards" aria-label="The six screens">
      {cards.map((card) => (
        <li key={card.key} className="console-spine-card" data-testid={`spine-${card.key}`}>
          <h2>
            <Link href={card.href}>{card.label}</Link>
          </h2>
          {card.figure !== null && (
            <p className="console-spine-figure" data-testid="spine-figure">{card.figure}</p>
          )}
          <p className="console-spine-detail">{card.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function ConsoleHome() {
  const { email, record } = await requirePractice();

  const rules = record.rulesConfig;
  const settings: Array<[string, string]> = [
    ["Minimum days since last visit", `${rules.minDaysSinceLastVisit} days`],
    ["Existing-booking block window", `${rules.futureBookingBlockDays} days`],
    ["Invitation cap per quarter", `${rules.maxInvitesPerQuarter}`],
    ["Usual GP only", rules.usualClinicianOnly ? "Yes" : "No"],
    ["Ongoing-care patients only", rules.chronicCareOnly ? "Yes" : "No"],
  ];

  // W206: scoped. This counted the whole store, so a practice with no complaints of its own
  // was told to review somebody else's.
  const openComplaints = openComplaintCount(record.practice.id as string);

  return (
    <ConsoleShell
      email={email}
      practices={practicesFor(email).map((r) => ({ id: r.practice.id as string, name: r.practice.name }))}
      activeId={record.practice.id as string}
    >
      <div className="console-home-heading">
        <h1 className="text-2xl font-semibold tracking-tight">{record.practice.name}</h1>
        <span className="text-sm text-stone-500">
          {record.practice.timezone} · holdout {Math.round(record.practice.holdoutRate * 100)}%
        </span>
      </div>

      {openComplaints > 0 && (
        <Link
          href="/console/complaints"
          data-testid="complaint-banner"
          className="mt-4 block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          {openComplaints} open complaint{openComplaints === 1 ? "" : "s"} — review now. Sending
          pauses are one click away in Admin ops.
        </Link>
      )}

      <Suspense fallback={<p className="mt-6 text-sm text-stone-500" data-testid="spine-loading">Loading.</p>}>
        <SpineCards email={email} record={record} />
      </Suspense>

      {/* O149: wraps. Nine links in a non-wrapping row reached x=548 in a 390px viewport and took
          the whole document sideways with them. */}
      <section aria-labelledby="all-tools-heading" className="mt-8">
        <h2 id="all-tools-heading" className="font-medium text-stone-900">All tools</h2>
        <nav className="console-quick-actions" aria-label="Practice shortcuts">
          <Link href="/console/results" className="console-quick-link">Your results</Link>
          <Link href="/console/dashboard" className="console-quick-link">Incrementality dashboard</Link>
          <Link href="/console/usefulness" className="console-quick-link">Usefulness audit</Link>
          <Link href="/console/outreach" className="console-quick-link">Outreach</Link>
          <Link href="/console/ops" className="console-quick-link">Admin ops</Link>
          <Link href="/console/roi" className="console-quick-link">ROI calculator</Link>
          <Link href="/console/privacy" className="console-quick-link">Privacy</Link>
          <Link href="/console/complaints" className="console-quick-link">Complaints</Link>
          <Link href="/console/setup/practice" className="console-quick-link">
            {record.setupCompletedAt ? "Setup" : "Finish setup"}
          </Link>
          <Link href="/console/more" className="console-quick-link">Everything else</Link>
        </nav>
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-medium text-stone-900">Eligibility rules</h2>
          <span className="text-xs text-stone-500">version {record.rulesVersion}</span>
        </div>
        <dl className="divide-y divide-stone-100">
          {settings.map(([term, value]) => (
            <div key={term} className="flex justify-between py-2.5">
              <dt className="text-sm text-stone-500">{term}</dt>
              <dd className="text-sm font-medium text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/console/rules"
          className="mt-4 -mb-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Edit rules
        </Link>
      </section>
    </ConsoleShell>
  );
}
