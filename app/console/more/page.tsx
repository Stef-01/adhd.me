// The one "More" surface (docs/console-spine-brief.md): every console screen outside the spine,
// by group. Each keeps its path; this page only lists them.

import Link from "next/link";
import { isAdhdMeStaff } from "@/tenancy/staff";
import { FOLDED_GROUPS } from "../console-routes";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "More tools" };

export default async function MorePage() {
  const { email } = await requirePractice();
  const staff = isAdhdMeStaff(email);

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">More tools</h1>
      <p className="mt-2 text-sm text-stone-500">Every screen outside the six.</p>
      {FOLDED_GROUPS.map((group) => {
        const routes = group.routes.filter((route) => !route.staffOnly || staff);
        if (routes.length === 0) return null;
        const id = `more-${group.label.replaceAll(" ", "-").toLowerCase()}`;
        return (
          <section key={group.label} aria-labelledby={id} className="mt-8">
            <h2 id={id} className="font-medium text-stone-900">{group.label}</h2>
            {group.note && <p className="mt-1 text-sm text-stone-500">{group.note}</p>}
            <ul className="console-quick-actions" data-testid={id}>
              {routes.map((route) => (
                <li key={route.href}>
                  <Link href={route.href} className="console-quick-link">{route.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </ConsoleShell>
  );
}
