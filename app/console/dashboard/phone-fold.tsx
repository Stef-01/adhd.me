"use client";

// The weekly table folds behind a disclosure on a phone, the way /console/capacity's weekday
// lists do; wider than 767px it starts open. The width is decided once on mount, so the server
// renders it open and the stylesheet keeps a phone's copy closed until then (no flash of rows).

import { useEffect, useState, type ReactNode } from "react";

const PHONE = "(max-width: 767px)";

export function PhoneFold({
  summary,
  className,
  testId,
  children,
}: {
  summary: ReactNode;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PHONE);
    setOpen(!query.matches);
    setDecided(true);
    const onChange = (event: MediaQueryListEvent) => setOpen(!event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <details
      className={`console-phone-fold${className ? ` ${className}` : ""}`}
      data-decided={decided ? "" : undefined}
      data-testid={testId}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
