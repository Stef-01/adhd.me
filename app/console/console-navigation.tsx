"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

type ConsoleRoute = {
  href: string;
  label: string;
  description?: string;
  exact?: boolean;
  staffOnly?: boolean;
};

const coreRoutes: readonly ConsoleRoute[] = [
  { href: "/console", label: "Home", exact: true },
  { href: "/console/ops", label: "Queue" },
  { href: "/console/referrals", label: "Referrals" },
  { href: "/console/results", label: "Results" },
  { href: "/console/setup/practice", label: "Setup" },
];

const routeGroups: ReadonlyArray<{
  label: string;
  routes: readonly ConsoleRoute[];
}> = [
  {
    label: "Run care",
    routes: [
      { href: "/console/ops", label: "Operations queue", description: "Invites, holds and delivery controls" },
      { href: "/console/referrals", label: "Referrals", description: "Referral outcomes and follow-up" },
      { href: "/console/complaints", label: "Complaints", description: "Review and pause outreach" },
      { href: "/console/privacy", label: "Privacy requests", description: "Access and erasure workflow" },
      { href: "/console/usefulness", label: "Usefulness audit", description: "Review invitation quality" },
      { href: "/console/outreach", label: "Outreach", description: "Message performance and cadence" },
    ],
  },
  {
    label: "Configure",
    routes: [
      { href: "/console/setup/practice", label: "Practice setup", description: "Identity, services and handover" },
      { href: "/console/rules", label: "Eligibility rules", description: "Who can receive an invitation" },
      { href: "/console/registers", label: "Registers", description: "Included patient registers" },
      { href: "/console/case-mix", label: "Case mix", description: "Cohort and care composition" },
      { href: "/console/credentials", label: "Credentials", description: "Clinician evidence and review" },
    ],
  },
  {
    label: "Measure",
    routes: [
      { href: "/console/results", label: "Results", description: "Practice-level outcome summary" },
      { href: "/console/dashboard", label: "Incrementality", description: "Holdout comparison dashboard" },
      { href: "/console/responses", label: "Responses", description: "Patient response patterns" },
      { href: "/console/capacity", label: "Capacity", description: "Available appointment supply" },
      { href: "/console/outcomes", label: "Outcomes", description: "Care and continuity measures" },
      { href: "/console/reporting", label: "Reporting", description: "Exportable reporting view" },
      { href: "/console/roi", label: "ROI", description: "Operational value model" },
    ],
  },
  {
    label: "Govern",
    routes: [
      { href: "/console/capability", label: "Capability", description: "Practice readiness and coverage" },
      { href: "/console/pathways", label: "Pathways", description: "Escalation and care routes" },
      { href: "/console/education", label: "Education", description: "Learning resources and evidence" },
      { href: "/console/interop", label: "Interoperability", description: "System and data boundaries" },
      { href: "/console/verticals", label: "Service views", description: "Condition-specific operations" },
    ],
  },
  {
    label: "Demonstrate",
    routes: [
      { href: "/console/matching", label: "Matching lab", description: "Inspect the explanation model" },
      { href: "/console/allocation", label: "Allocation", description: "See capacity allocation in action" },
      { href: "/console/interview", label: "Interview", description: "Guided practice walkthrough" },
      { href: "/console/interest", label: "Interest", description: "Review practice interest", staffOnly: true },
      { href: "/console/applications", label: "Applications", description: "Review practice applications", staffOnly: true },
    ],
  },
];

function routeIsActive(pathname: string, route: ConsoleRoute) {
  if (route.exact) return pathname === route.href;
  if (route.href === "/console/setup/practice") return pathname.startsWith("/console/setup/");
  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}

export function ConsoleNavigation({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="console-navigation" aria-label="Practice console">
      <div className="console-nav-core" aria-label="Primary console destinations">
        {coreRoutes.map((route) => {
          const active = routeIsActive(pathname, route);
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`console-nav-link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {route.label}
            </Link>
          );
        })}
      </div>

      <details
        ref={menuRef}
        onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        className={`console-workspace-menu${
          routeGroups.some((group) =>
            group.routes.some((route) => (!route.staffOnly || isStaff) && routeIsActive(pathname, route)),
          )
            ? " has-active-route"
            : ""
        }`}
      >
        <summary>
          All tools
          <span aria-hidden="true">⌄</span>
        </summary>
        {menuOpen && <div className="console-workspace-panel">
          <div className="console-workspace-heading">
            <strong>Practice workspace</strong>
            <span>Every operational surface, in one map.</span>
          </div>
          <div className="console-workspace-grid">
            {routeGroups.map((group) => {
              const visibleRoutes = group.routes.filter((route) => !route.staffOnly || isStaff);

              return (
                <section key={group.label} aria-labelledby={`console-group-${group.label.replaceAll(" ", "-").toLowerCase()}`}>
                  <h2 id={`console-group-${group.label.replaceAll(" ", "-").toLowerCase()}`}>{group.label}</h2>
                  <div>
                    {visibleRoutes.map((route) => {
                      const active = routeIsActive(pathname, route);
                      return (
                        <Link
                          key={route.href}
                          href={route.href}
                          className={active ? "is-active" : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => {
                            setMenuOpen(false);
                            menuRef.current?.removeAttribute("open");
                          }}
                        >
                          <strong>{route.label}</strong>
                          {route.description && <span>{route.description}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>}
      </details>
    </nav>
  );
}
