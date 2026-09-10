"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MORE, SPINE, routeIsActive } from "./console-routes";

/** The tab bar: the spine, Setup, and More. More is lit whenever no spine tab is. */
export function ConsoleNavigation() {
  const pathname = usePathname();
  const onSpine = SPINE.some((route) => routeIsActive(pathname, route));
  const links = [
    ...SPINE.map((route) => ({ ...route, active: routeIsActive(pathname, route) })),
    { ...MORE, active: !onSpine },
  ];

  return (
    <nav className="console-navigation" aria-label="Practice console">
      <div className="console-nav-core" aria-label="Primary console destinations">
        {links.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`console-nav-link${route.active ? " is-active" : ""}`}
            aria-current={route.active ? "page" : undefined}
          >
            {route.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
