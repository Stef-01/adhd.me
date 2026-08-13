"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

const demoStops = [
  {
    id: "patient",
    label: "Patient finder",
    detail: "15 qualitative care journeys",
    href: "/finder",
  },
  {
    id: "clinician",
    label: "Clinician pathway",
    detail: "Case concentration and learning",
    href: "/clinicians",
  },
  {
    id: "practice",
    label: "Practice story",
    detail: "Product and evidence narrative",
    href: "/practices",
  },
  {
    id: "operations",
    label: "Operations demo",
    detail: "Synthetic practice walkthrough",
    href: "/demo",
  },
] as const;

function getActiveStop(pathname: string) {
  if (pathname.startsWith("/clinicians")) return 1;
  if (pathname.startsWith("/practices")) return 2;
  if (pathname.startsWith("/demo") || pathname.startsWith("/console") || pathname.startsWith("/book")) return 3;
  return 0;
}

export function DemoNavigator() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeIndex = getActiveStop(pathname);
  const nextStop = demoStops[(activeIndex + 1) % demoStops.length]!;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="demo-nav-root" ref={rootRef}>
      <button
        className="demo-nav-trigger wordmark"
        type="button"
        aria-expanded={open}
        aria-controls="careyield-demo-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Meherr</span>
        <CaretDown size={13} weight="bold" aria-hidden="true" />
      </button>

      {open && (
        <nav id="careyield-demo-navigation" className="demo-nav-popover" aria-label="Meherr demo navigation">
          <Link className="demo-nav-home" href="/" onClick={() => setOpen(false)}>
            Back to main home
          </Link>
          <div className="demo-nav-heading">
            <span>Demo map</span>
            <strong>{activeIndex + 1} of {demoStops.length}</strong>
          </div>

          <div className="demo-nav-stops">
            {demoStops.map((stop, index) => {
              const active = index === activeIndex;
              return (
                <Link
                  key={stop.id}
                  href={stop.href}
                  className={active ? "is-active" : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    setOpen(false);
                    if (active) {
                      event.preventDefault();
                      window.location.assign(stop.href);
                    }
                  }}
                >
                  <span className="demo-nav-number">0{index + 1}</span>
                  <span>
                    <strong>{stop.label}</strong>
                    <small>{active ? "Restart this section" : stop.detail}</small>
                  </span>
                  {active ? <Check size={16} weight="bold" aria-hidden="true" /> : <ArrowRight size={16} weight="regular" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>

          <Link className="demo-nav-next" href={nextStop.href} onClick={() => setOpen(false)}>
            <span>Next stop</span>
            <strong>{nextStop.label}</strong>
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </Link>
        </nav>
      )}
    </div>
  );
}
