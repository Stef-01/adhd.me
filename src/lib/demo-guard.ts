import { notFound } from "next/navigation";

// W37: the demo surface signs visitors in as the demo-practice owner and reseeds
// every mock store — deliberately, for presentations. In production that is an
// unauthenticated owner-session + state-reset endpoint, so it fails CLOSED unless
// a deployment explicitly opts in (same posture as the mock introspection routes).
export function demoEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.CAREYIELD_ENABLE_DEMO === "1";
}

export function assertDemoEnabled(): void {
  if (!demoEnabled()) notFound();
}
